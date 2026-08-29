package main

import (
	"context"
	"errors"
	"log"
	"net/url"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var db *mongo.Database

// Collection names, in one place.
const (
	usersCollection    = "users"
	listingsCollection = "listings"
	cartCollection     = "cart"

	// legacyListingsCollection is what earlier versions called listings.
	legacyListingsCollection = "books"
)

// InitializeDatabase connects to MongoDB, upgrades data written by earlier
// versions, and makes sure the indexes exist.
func InitializeDatabase(cfg Config) *mongo.Client {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(cfg.MongoURI))
	if err != nil {
		log.Fatal("Error connecting to MongoDB:", err)
	}
	if err := client.Ping(ctx, nil); err != nil {
		log.Fatalf("Error pinging MongoDB at %s: %v", redactURI(cfg.MongoURI), err)
	}

	db = client.Database(cfg.MongoDB)

	// Migrations and index builds over a large existing collection can take
	// a while; give them their own budget rather than the connection timeout.
	setupCtx, cancelSetup := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancelSetup()
	migrateLegacyData(setupCtx)
	ensureIndexes(setupCtx)

	log.Printf("Connected to MongoDB (%s, database %q)", redactURI(cfg.MongoURI), cfg.MongoDB)
	return client
}

// redactURI hides any password embedded in a connection string before logging.
func redactURI(uri string) string {
	u, err := url.Parse(uri)
	if err != nil {
		return "<unparseable MONGO_URI>"
	}
	if _, hasPassword := u.User.Password(); hasPassword {
		u.User = url.UserPassword(u.User.Username(), "*****")
	}
	return u.String()
}

// migrateLegacyData upgrades a database written by earlier versions of this
// server so it matches the current schema. Every step is idempotent, so it
// is safe to run on each start.
func migrateLegacyData(ctx context.Context) {
	names, err := db.ListCollectionNames(ctx, bson.M{})
	if err != nil {
		log.Fatalf("Error listing collections: %v", err)
	}
	exists := map[string]bool{}
	for _, n := range names {
		exists[n] = true
	}

	// 1. "books" -> "listings" (the collection keeps its indexes and data).
	switch {
	case exists[legacyListingsCollection] && !exists[listingsCollection]:
		cmd := bson.D{
			{Key: "renameCollection", Value: db.Name() + "." + legacyListingsCollection},
			{Key: "to", Value: db.Name() + "." + listingsCollection},
		}
		if err := db.Client().Database("admin").RunCommand(ctx, cmd).Err(); err != nil {
			log.Fatalf("Error renaming collection %q to %q: %v", legacyListingsCollection, listingsCollection, err)
		}
		log.Printf("Renamed collection %q to %q", legacyListingsCollection, listingsCollection)
	case exists[legacyListingsCollection] && exists[listingsCollection]:
		// Can happen after rolling back to an old build and forward again.
		// Refuse to guess: the operator has to merge or drop the old one.
		n, _ := db.Collection(legacyListingsCollection).CountDocuments(ctx, bson.M{})
		log.Printf("WARNING: both %q (%d documents) and %q exist; %q is ignored. Merge it into %q or drop it.",
			legacyListingsCollection, n, listingsCollection, legacyListingsCollection, listingsCollection)
	}

	// 2. Cart rows: book_id -> listing_id. The indexes that used the old
	// field name must go FIRST: the old unique (user_id, book_id) index stores
	// null for a missing book_id, so renaming a user's second cart row would
	// otherwise fail with a duplicate-key error part-way through.
	for _, keys := range []bson.D{
		{{Key: "user_id", Value: 1}, {Key: "book_id", Value: 1}},
		{{Key: "book_id", Value: 1}},
	} {
		if err := dropIndexByKeys(ctx, cartCollection, keys); err != nil {
			log.Fatalf("Error dropping old cart index %v: %v", keys, err)
		}
	}
	renamed, err := db.Collection(cartCollection).UpdateMany(ctx,
		bson.M{"book_id": bson.M{"$exists": true}},
		bson.M{"$rename": bson.M{"book_id": "listing_id"}})
	if err != nil {
		log.Fatalf("Error renaming cart.book_id: %v", err)
	}
	if renamed.ModifiedCount > 0 {
		log.Printf("Renamed book_id to listing_id on %d cart rows", renamed.ModifiedCount)
	}

	// 3. Listings created before categories/conditions existed.
	for field, value := range map[string]string{"category": DefaultCategory, "condition": DefaultCondition} {
		res, err := db.Collection(listingsCollection).UpdateMany(ctx,
			bson.M{field: bson.M{"$exists": false}},
			bson.M{"$set": bson.M{field: value}})
		if err != nil {
			log.Fatalf("Error defaulting listing %s: %v", field, err)
		}
		if res.ModifiedCount > 0 {
			log.Printf("Set %s=%q on %d listings that predate the field", field, value, res.ModifiedCount)
		}
	}

	// 4. The previous version never prevented the same listing being added
	// to a cart twice; clean that up so the unique index can be built.
	if err := dedupeCart(ctx); err != nil {
		log.Fatalf("Error removing duplicate cart rows: %v", err)
	}
}

// dropIndexByKeys drops the index with the given key pattern (whatever it
// was named), treating "no such index / collection" as success.
func dropIndexByKeys(ctx context.Context, collection string, keys bson.D) error {
	_, err := db.Collection(collection).Indexes().DropOneWithKey(ctx, keys)
	var cmdErr mongo.CommandError
	if errors.As(err, &cmdErr) && (cmdErr.Name == "IndexNotFound" || cmdErr.Name == "NamespaceNotFound" || cmdErr.Code == 26 || cmdErr.Code == 27) {
		return nil
	}
	return err
}

// ensureIndexes creates the indexes the handlers rely on. The unique indexes
// are what make "one account per username" and "one cart row per listing"
// hold even under concurrent requests.
func ensureIndexes(ctx context.Context) {
	indexes := map[string][]mongo.IndexModel{
		usersCollection: {
			{Keys: bson.D{{Key: "username", Value: 1}}, Options: options.Index().SetUnique(true)},
		},
		listingsCollection: {
			{Keys: bson.D{{Key: "user_id", Value: 1}, {Key: "created_at", Value: -1}}},
			{Keys: bson.D{{Key: "sold", Value: 1}, {Key: "created_at", Value: -1}}},
			{Keys: bson.D{{Key: "sold", Value: 1}, {Key: "category", Value: 1}, {Key: "created_at", Value: -1}}},
		},
		cartCollection: {
			{Keys: bson.D{{Key: "user_id", Value: 1}, {Key: "listing_id", Value: 1}}, Options: options.Index().SetUnique(true)},
			{Keys: bson.D{{Key: "listing_id", Value: 1}}},
		},
	}

	for name, models := range indexes {
		if _, err := db.Collection(name).Indexes().CreateMany(ctx, models); err != nil {
			if name == usersCollection && isDuplicateKey(err) {
				log.Fatalf("The users collection contains duplicate usernames; rename or delete the duplicates, then restart: %v", err)
			}
			log.Fatalf("Error creating indexes on %q: %v", name, err)
		}
	}
}

// dedupeCart keeps the oldest row for each (user_id, listing_id) pair and
// deletes the rest. Cart rows carry no other data, so this loses nothing.
func dedupeCart(ctx context.Context) error {
	pipeline := mongo.Pipeline{
		{{Key: "$sort", Value: bson.D{{Key: "_id", Value: 1}}}},
		{{Key: "$group", Value: bson.M{
			"_id": bson.M{"user_id": "$user_id", "listing_id": "$listing_id"},
			"ids": bson.M{"$push": "$_id"},
			"n":   bson.M{"$sum": 1},
		}}},
		{{Key: "$match", Value: bson.M{"n": bson.M{"$gt": 1}}}},
	}
	cursor, err := db.Collection(cartCollection).Aggregate(ctx, pipeline)
	if err != nil {
		return err
	}
	defer cursor.Close(ctx)

	var extras []primitive.ObjectID
	for cursor.Next(ctx) {
		var group struct {
			IDs []primitive.ObjectID `bson:"ids"`
		}
		if err := cursor.Decode(&group); err != nil {
			return err
		}
		extras = append(extras, group.IDs[1:]...)
	}
	if err := cursor.Err(); err != nil {
		return err
	}
	if len(extras) == 0 {
		return nil
	}

	log.Printf("Removing %d duplicate cart rows left by the previous version", len(extras))
	_, err = db.Collection(cartCollection).DeleteMany(ctx, bson.M{"_id": bson.M{"$in": extras}})
	return err
}

// isDuplicateKey reports whether err is MongoDB's unique-index violation.
func isDuplicateKey(err error) bool {
	return mongo.IsDuplicateKeyError(err)
}
