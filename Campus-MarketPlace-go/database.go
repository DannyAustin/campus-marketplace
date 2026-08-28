package main

import (
	"context"
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
	usersCollection = "users"
	booksCollection = "books"
	cartCollection  = "cart"
)

// InitializeDatabase connects to MongoDB and makes sure the indexes exist.
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

	// Index builds over a large existing collection can take a while; give
	// them their own budget rather than the connection timeout.
	indexCtx, cancelIndex := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancelIndex()
	ensureIndexes(indexCtx)
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

// ensureIndexes creates the indexes the handlers rely on. The unique indexes
// are what make "one account per username" and "one cart row per book" hold
// even under concurrent requests.
func ensureIndexes(ctx context.Context) {
	// The previous version of the backend never prevented the same listing
	// being added to a cart twice, so clean that up before the unique index
	// can be built.
	if err := dedupeCart(ctx); err != nil {
		log.Fatalf("Error removing duplicate cart rows: %v", err)
	}

	indexes := map[string][]mongo.IndexModel{
		usersCollection: {
			{Keys: bson.D{{Key: "username", Value: 1}}, Options: options.Index().SetUnique(true)},
		},
		booksCollection: {
			{Keys: bson.D{{Key: "user_id", Value: 1}, {Key: "created_at", Value: -1}}},
			{Keys: bson.D{{Key: "sold", Value: 1}, {Key: "created_at", Value: -1}}},
		},
		cartCollection: {
			{Keys: bson.D{{Key: "user_id", Value: 1}, {Key: "book_id", Value: 1}}, Options: options.Index().SetUnique(true)},
			{Keys: bson.D{{Key: "book_id", Value: 1}}},
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

// dedupeCart keeps the oldest row for each (user_id, book_id) pair and
// deletes the rest. Cart rows carry no other data, so this loses nothing.
func dedupeCart(ctx context.Context) error {
	pipeline := mongo.Pipeline{
		{{Key: "$sort", Value: bson.D{{Key: "_id", Value: 1}}}},
		{{Key: "$group", Value: bson.M{
			"_id": bson.M{"user_id": "$user_id", "book_id": "$book_id"},
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
