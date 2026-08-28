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

// Book is an item listed for sale. (The name is historical - it can be anything.)
//
// Image bytes are stored in the document but never serialised into list
// responses; clients load them from ImageURL instead, which keeps listing
// payloads small and lets the browser cache the picture.
type Book struct {
	ID          primitive.ObjectID  `bson:"_id,omitempty" json:"id"`
	Title       string              `bson:"title" json:"title"`
	Price       float64             `bson:"price" json:"price"`
	Description string              `bson:"description" json:"description"`
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
func (b Book) withImageURL() Book {
	b.ImageURL = "/books/" + b.ID.Hex() + "/image?v=" + strconv.FormatInt(b.UpdatedAt.UnixMilli(), 10)
	return b
}

// CartItem links a user to a book they intend to buy.
type CartItem struct {
	ID      primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID  primitive.ObjectID `bson:"user_id" json:"user_id"`
	BookID  primitive.ObjectID `bson:"book_id" json:"book_id"`
	AddedAt time.Time          `bson:"added_at" json:"added_at"`
}
