package main

import (
	"strconv"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// User is an account. The password hash never leaves the server.
type User struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Username  string             `bson:"username" json:"username"`
	Password  string             `bson:"password" json:"-"`
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
}

// Categories and Conditions are the values a listing may use.
// Keep in sync with Campus-MarketPlace/src/constants/listingOptions.js.
var (
	Categories = []string{"Textbooks", "Electronics", "Furniture", "Clothing", "Tickets", "Sports", "Other"}
	Conditions = []string{"New", "Like new", "Good", "Fair"}
)

// Defaults applied to listings created before these fields existed.
const (
	DefaultCategory  = "Other"
	DefaultCondition = "Good"
)

// isOneOf reports whether value is in the allowed list (exact match).
func isOneOf(value string, allowed []string) bool {
	for _, a := range allowed {
		if a == value {
			return true
		}
	}
	return false
}

// Listing is an item for sale.
//
// Image bytes are stored in the document but never serialised into list
// responses; clients load them from ImageURL instead, which keeps listing
// payloads small and lets the browser cache the picture.
type Listing struct {
	ID          primitive.ObjectID  `bson:"_id,omitempty" json:"id"`
	Title       string              `bson:"title" json:"title"`
	Price       float64             `bson:"price" json:"price"`
	Description string              `bson:"description" json:"description"`
	Category    string              `bson:"category" json:"category"`
	Condition   string              `bson:"condition" json:"condition"`
	UserID      primitive.ObjectID  `bson:"user_id" json:"user_id"`
	Sold        bool                `bson:"sold" json:"sold"`
	BuyerID     *primitive.ObjectID `bson:"buyer_id,omitempty" json:"buyer_id,omitempty"`
	SoldAt      *time.Time          `bson:"sold_at,omitempty" json:"sold_at,omitempty"`
	CreatedAt   time.Time           `bson:"created_at" json:"created_at"`
	UpdatedAt   time.Time           `bson:"updated_at" json:"updated_at"`
	Image       []byte              `bson:"image,omitempty" json:"-"`
	ImageType   string              `bson:"image_type,omitempty" json:"-"`
	ImageURL    string              `bson:"-" json:"image_url"`
}

// withImageURL fills in the client-facing image location. The version query
// parameter changes whenever the listing is updated, so browsers can cache
// aggressively yet still pick up a replaced photo.
func (l Listing) withImageURL() Listing {
	l.ImageURL = "/listings/" + l.ID.Hex() + "/image?v=" + strconv.FormatInt(l.UpdatedAt.UnixMilli(), 10)
	return l
}

// CartItem links a user to a listing they intend to buy.
type CartItem struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID    primitive.ObjectID `bson:"user_id" json:"user_id"`
	ListingID primitive.ObjectID `bson:"listing_id" json:"listing_id"`
	AddedAt   time.Time          `bson:"added_at" json:"added_at"`
}
