// model.go
package main

import "go.mongodb.org/mongo-driver/bson/primitive"

// User represents a user in the Campus MarketPlace application
type User struct {
	ID       primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Username string             `bson:"username" json:"username"`
	Password string             `bson:"password,omitempty" json:"password"` // hashed password
}

// Book represents a book that a user has posted for sale
type Book struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Title       string             `bson:"title" json:"title"`
	Price       float64            `bson:"price" json:"price"`
	Description string             `bson:"description" json:"description"` // New field
	UserID      primitive.ObjectID `bson:"user_id,omitempty" json:"user_id"` 
	Image       []byte             `bson:"image,omitempty" json:"image"`
	Sold        bool               `bson:"sold" json:"sold"`
}


type Cart struct {
	ID     primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID primitive.ObjectID `bson:"user_id" json:"user_id"` // References User
	BookID primitive.ObjectID `bson:"book_id" json:"book_id"` // References Book
}