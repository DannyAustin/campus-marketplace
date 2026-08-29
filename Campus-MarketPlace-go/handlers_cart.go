package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// listingSummary fetches the small set of fields cart logic needs.
func listingSummary(ctx context.Context, id primitive.ObjectID) (Listing, error) {
	var listing Listing
	err := db.Collection(listingsCollection).FindOne(ctx, bson.M{"_id": id},
		options.FindOne().SetProjection(bson.M{"title": 1, "price": 1, "user_id": 1, "sold": 1, "buyer_id": 1})).Decode(&listing)
	return listing, err
}

// cartRows returns the caller's cart entries.
func cartRows(ctx context.Context, userID primitive.ObjectID) ([]CartItem, error) {
	cursor, err := db.Collection(cartCollection).Find(ctx, bson.M{"user_id": userID},
		options.Find().SetSort(bson.D{{Key: "added_at", Value: 1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var rows []CartItem
	if err := cursor.All(ctx, &rows); err != nil {
		return nil, err
	}
	return rows, nil
}

// AddToCartHandler puts someone else's unsold listing in the caller's cart.
//
//	POST /cart  {"listing_id": "..."}  -> 201 CartItem
func AddToCartHandler(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ListingID string `json:"listing_id"`
	}
	if err := decodeJSON(w, r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	listingID, err := primitive.ObjectIDFromHex(body.ListingID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid listing ID")
		return
	}
	me := currentUserID(r)

	listing, err := listingSummary(r.Context(), listingID)
	if errors.Is(err, mongo.ErrNoDocuments) {
		writeError(w, http.StatusNotFound, "Listing not found")
		return
	}
	if err != nil {
		serverError(w, "looking up listing", err)
		return
	}
	if listing.UserID == me {
		writeError(w, http.StatusBadRequest, "You can't add your own listing to your cart")
		return
	}
	if listing.Sold {
		writeError(w, http.StatusConflict, "This item has already been sold")
		return
	}

	item := CartItem{UserID: me, ListingID: listingID, AddedAt: time.Now()}
	result, err := db.Collection(cartCollection).InsertOne(r.Context(), item)
	if isDuplicateKey(err) { // unique index on (user_id, listing_id)
		writeError(w, http.StatusConflict, "This item is already in your cart")
		return
	}
	if err != nil {
		serverError(w, "adding to cart", err)
		return
	}
	item.ID = result.InsertedID.(primitive.ObjectID)

	writeJSON(w, http.StatusCreated, item)
}

// GetCartHandler returns the listings in the caller's cart that are still
// available. Rows pointing at sold or deleted listings are pruned as we go.
//
//	GET /cart  -> 200 [Listing]
func GetCartHandler(w http.ResponseWriter, r *http.Request) {
	me := currentUserID(r)
	rows, err := cartRows(r.Context(), me)
	if err != nil {
		serverError(w, "loading cart", err)
		return
	}
	if len(rows) == 0 {
		writeJSON(w, http.StatusOK, []Listing{})
		return
	}

	ids := make([]primitive.ObjectID, 0, len(rows))
	for _, row := range rows {
		ids = append(ids, row.ListingID)
	}

	listings, err := findListings(r.Context(), bson.M{"_id": bson.M{"$in": ids}, "sold": false}, sortOrders["newest"])
	if err != nil {
		serverError(w, "loading cart listings", err)
		return
	}

	// Drop cart rows whose listing has been sold or removed since it was added.
	if len(listings) < len(rows) {
		available := make(map[primitive.ObjectID]bool, len(listings))
		for _, l := range listings {
			available[l.ID] = true
		}
		var stale []primitive.ObjectID
		for _, row := range rows {
			if !available[row.ListingID] {
				stale = append(stale, row.ListingID)
			}
		}
		if _, err := db.Collection(cartCollection).DeleteMany(r.Context(),
			bson.M{"user_id": me, "listing_id": bson.M{"$in": stale}}); err != nil {
			log.Println("pruning stale cart rows:", err)
		}
	}

	writeJSON(w, http.StatusOK, listings)
}

// RemoveFromCartHandler takes a listing out of the caller's cart.
//
//	DELETE /cart/{listingId}  -> 200 {message}
func RemoveFromCartHandler(w http.ResponseWriter, r *http.Request) {
	listingID, err := primitive.ObjectIDFromHex(mux.Vars(r)["listingId"])
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid listing ID")
		return
	}

	result, err := db.Collection(cartCollection).DeleteOne(r.Context(),
		bson.M{"user_id": currentUserID(r), "listing_id": listingID})
	if err != nil {
		serverError(w, "removing from cart", err)
		return
	}
	if result.DeletedCount == 0 {
		writeError(w, http.StatusNotFound, "That item is not in your cart")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "Item removed from cart"})
}

type checkoutLine struct {
	ID     string  `json:"id"`
	Title  string  `json:"title"`
	Price  float64 `json:"price"`
	Reason string  `json:"reason,omitempty"`
}

type checkoutResult struct {
	Purchased   []checkoutLine `json:"purchased"`
	Unavailable []checkoutLine `json:"unavailable"`
	Total       float64        `json:"total"`
}

// CheckoutHandler buys everything in the caller's cart. Each listing is
// claimed with a single atomic update (only if still unsold and not the
// caller's own), so two buyers can never both purchase the same item. The
// cart is emptied afterwards and the report says what did and didn't go
// through.
//
//	POST /checkout  -> 200 {purchased: [...], unavailable: [...], total}
func CheckoutHandler(w http.ResponseWriter, r *http.Request) {
	me := currentUserID(r)

	// Once we start claiming items the work must finish even if the browser
	// disconnects mid-way, so detach from the request's cancellation.
	ctx, cancel := context.WithTimeout(context.WithoutCancel(r.Context()), 30*time.Second)
	defer cancel()

	rows, err := cartRows(ctx, me)
	if err != nil {
		serverError(w, "loading cart", err)
		return
	}
	if len(rows) == 0 {
		writeError(w, http.StatusBadRequest, "Your cart is empty")
		return
	}

	result := checkoutResult{Purchased: []checkoutLine{}, Unavailable: []checkoutLine{}}
	var purchasedIDs []primitive.ObjectID
	now := time.Now()

	for _, row := range rows {
		listing, err := listingSummary(ctx, row.ListingID)
		if errors.Is(err, mongo.ErrNoDocuments) {
			result.Unavailable = append(result.Unavailable, checkoutLine{ID: row.ListingID.Hex(), Title: "(removed listing)", Reason: "This listing no longer exists"})
			continue
		}
		if err != nil {
			serverError(w, "looking up cart listing", err)
			return
		}

		claim, err := db.Collection(listingsCollection).UpdateOne(ctx,
			bson.M{"_id": row.ListingID, "sold": false, "user_id": bson.M{"$ne": me}},
			bson.M{"$set": bson.M{"sold": true, "buyer_id": me, "sold_at": now, "updated_at": now}})
		if err != nil {
			serverError(w, "marking listing sold", err)
			return
		}

		line := checkoutLine{ID: listing.ID.Hex(), Title: listing.Title, Price: listing.Price}
		switch {
		case claim.MatchedCount == 1:
			result.Purchased = append(result.Purchased, line)
			result.Total += listing.Price
			purchasedIDs = append(purchasedIDs, listing.ID)
		case listing.UserID == me:
			// Only possible for cart rows written by the previous version.
			line.Reason = "This is your own listing"
			result.Unavailable = append(result.Unavailable, line)
		case listing.Sold && listing.BuyerID != nil && *listing.BuyerID == me:
			// A retry after an interrupted checkout: it is already theirs.
			line.Reason = "Already purchased by you"
			result.Unavailable = append(result.Unavailable, line)
		default:
			line.Reason = "Already sold to someone else"
			result.Unavailable = append(result.Unavailable, line)
		}
	}

	// Empty the caller's cart, and pull the items they just bought out of
	// everyone else's carts too.
	if _, err := db.Collection(cartCollection).DeleteMany(ctx, bson.M{"user_id": me}); err != nil {
		log.Println("clearing cart after checkout:", err)
	}
	if len(purchasedIDs) > 0 {
		if _, err := db.Collection(cartCollection).DeleteMany(ctx, bson.M{"listing_id": bson.M{"$in": purchasedIDs}}); err != nil {
			log.Println("removing sold items from other carts:", err)
		}
	}

	writeJSON(w, http.StatusOK, result)
}
