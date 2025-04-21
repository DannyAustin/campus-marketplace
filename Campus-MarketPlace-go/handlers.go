package main

import (
	"context"
	"encoding/json"
	"net/http"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/crypto/bcrypt"
	"io"
	"strconv"
	"fmt"
)


// Register User
func RegisterHandler(w http.ResponseWriter, r *http.Request) {
	var user User
	// Decode the incoming user data from the request body
	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Check if the username already exists in the database
	var existingUser User
	err := db.Collection("users").FindOne(context.TODO(), bson.M{"username": user.Username}).Decode(&existingUser)
	if err == nil {
		http.Error(w, "Username already exists", http.StatusConflict) // HTTP 409 Conflict
		return
	}

	// If the username does not exist, hash the user's password before saving it
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Error hashing password", http.StatusInternalServerError)
		return
	}
	user.Password = string(hashedPassword)

	// Insert the user into the database
	result, err := db.Collection("users").InsertOne(context.TODO(), user)
	if err != nil {
		http.Error(w, "Error registering user", http.StatusInternalServerError)
		return
	}

	// Retrieve the generated ObjectID after insertion
	userID := result.InsertedID.(primitive.ObjectID).Hex() // Convert ObjectID to hex string

	// Respond with the user ID and a success message
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"message": "User registered successfully",
		"user_id": userID,
	})
}


// Login User
func LoginHandler(w http.ResponseWriter, r *http.Request) {
	var credentials struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	// Decode the incoming login credentials
	if err := json.NewDecoder(r.Body).Decode(&credentials); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Find user by username in the "users" collection
	var user User
	err := db.Collection("users").FindOne(context.TODO(), bson.M{"username": credentials.Username}).Decode(&user)
	if err != nil {
		http.Error(w, "User not found", http.StatusUnauthorized)
		return
	}

	// Compare the hashed password with the incoming password
	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(credentials.Password))
	if err != nil {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	// Return the user ID as part of the response
	userID := user.ID.Hex()

	// Respond with the success message and user ID
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Login successful",
		"user_id": userID,
	})
}

// Add a Book
func AddBookHandler(w http.ResponseWriter, r *http.Request) {
    err := r.ParseMultipartForm(10 << 20) // 10 MB limit
    if err != nil {
        http.Error(w, "Error parsing form", http.StatusBadRequest)
        return
    }

    title := r.FormValue("title")
    description := r.FormValue("description") // New field
    priceStr := r.FormValue("price")
    price, err := strconv.ParseFloat(priceStr, 64)
    if err != nil {
        http.Error(w, "Invalid price", http.StatusBadRequest)
        return
    }

    imageFile, _, err := r.FormFile("image")
    if err != nil {
        http.Error(w, "Error retrieving image file", http.StatusBadRequest)
        return
    }
    defer imageFile.Close()

    imageBytes, err := io.ReadAll(imageFile)
    if err != nil {
        http.Error(w, "Error reading image file", http.StatusInternalServerError)
        return
    }

    userIDStr := r.FormValue("userId")
    userID, err := primitive.ObjectIDFromHex(userIDStr)
    if err != nil {
        http.Error(w, "Invalid user ID", http.StatusBadRequest)
        return
    }

    book := Book{
        Title:       title,
        Description: description, // Include the description
        Price:       price,
        UserID:      userID,
        Image:       imageBytes,
        Sold:        false,
    }

    _, err = db.Collection("books").InsertOne(context.TODO(), book)
    if err != nil {
        http.Error(w, "Error adding book", http.StatusInternalServerError)
        return
    }

    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(book)
}



// Fetch Books by User
func GetUserBooksHandler(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodGet {
        http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
        return
    }

    userIDStr := r.URL.Query().Get("userId")
    userID, err := primitive.ObjectIDFromHex(userIDStr)
    if err != nil {
        http.Error(w, "Invalid user ID", http.StatusBadRequest)
        return
    }

    // Fetch all books for the user, including sold ones
    cursor, err := db.Collection("books").Find(context.TODO(), bson.M{
        "user_id": userID,
    })
    if err != nil {
        http.Error(w, "Error retrieving books", http.StatusInternalServerError)
        return
    }
    defer cursor.Close(context.TODO())

    var books []Book
    for cursor.Next(context.TODO()) {
        var book Book
        err := cursor.Decode(&book)
        if err != nil {
            http.Error(w, "Error decoding book data", http.StatusInternalServerError)
            return
        }
        books = append(books, book)
    }

    json.NewEncoder(w).Encode(books)
}


// Get All Books
func GetAllBooksHandler(w http.ResponseWriter, r *http.Request) {
	// Retrieve all books without filtering by user_id
	cursor, err := db.Collection("books").Find(context.TODO(), bson.M{})
	if err != nil {
		http.Error(w, "Error retrieving books", http.StatusInternalServerError)
		return
	}
	defer cursor.Close(context.TODO())

	var books []Book
	for cursor.Next(context.TODO()) {
		var book Book
		err := cursor.Decode(&book)
		if err != nil {
			http.Error(w, "Error decoding book data", http.StatusInternalServerError)
			return
		}
		books = append(books, book)
	}

	// Respond with the list of books
	json.NewEncoder(w).Encode(books)
}

// AddCartItemHandler adds a book to a user's cart
func AddCartItemHandler(w http.ResponseWriter, r *http.Request) {
    // Decode the cart item data from the request
    var cartItem Cart
    if err := json.NewDecoder(r.Body).Decode(&cartItem); err != nil {
        http.Error(w, "Invalid input", http.StatusBadRequest)
        return
    }

    // Check if userId and bookId are valid ObjectIDs
    if cartItem.UserID.IsZero() || cartItem.BookID.IsZero() {
        http.Error(w, "Invalid user ID or book ID", http.StatusBadRequest)
        return
    }

    // Insert the cart item into the cart collection
    cartItem.ID = primitive.NewObjectID()
    _, err := db.Collection("cart").InsertOne(context.TODO(), cartItem)
    if err != nil {
        http.Error(w, "Failed to add item to cart", http.StatusInternalServerError)
        return
    }

    // Respond with the added cart item
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(cartItem)
}

// GetCartItemsHandler retrieves all books in a user's cart by user ID
func GetCartItemsHandler(w http.ResponseWriter, r *http.Request) {
    userIDStr := r.URL.Query().Get("userId")
    userID, err := primitive.ObjectIDFromHex(userIDStr)
    if err != nil {
        http.Error(w, "Invalid user ID", http.StatusBadRequest)
        return
    }

    fmt.Println("Fetching cart items for user:", userIDStr) // Debug logging

    cursor, err := db.Collection("cart").Find(context.TODO(), bson.M{"user_id": userID})
    if err != nil {
        fmt.Println("Error retrieving cart items:", err) // Debug logging
        http.Error(w, "Error retrieving cart items", http.StatusInternalServerError)
        return
    }
    defer cursor.Close(context.TODO())

    var cartItems []Cart
    var bookIDs []primitive.ObjectID
    for cursor.Next(context.TODO()) {
        var cartItem Cart
        if err := cursor.Decode(&cartItem); err != nil {
            fmt.Println("Error decoding cart item:", err) // Debug logging
            http.Error(w, "Error decoding cart item", http.StatusInternalServerError)
            return
        }
        cartItems = append(cartItems, cartItem)
        bookIDs = append(bookIDs, cartItem.BookID)
    }

    fmt.Println("Book IDs for cart items:", bookIDs) // Debug logging

    // Check if bookIDs is empty before querying the books collection
    if len(bookIDs) == 0 {
        fmt.Println("No books in cart for this user") // Debug logging
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode([]Book{}) // Return an empty array if no book IDs are found
        return
    }

    bookCursor, err := db.Collection("books").Find(context.TODO(), bson.M{"_id": bson.M{"$in": bookIDs}})
    if err != nil {
        fmt.Println("Error retrieving books for cart items:", err) // Debug logging
        http.Error(w, "Error retrieving books for cart items", http.StatusInternalServerError)
        return
    }
    defer bookCursor.Close(context.TODO())

    var books []Book
    for bookCursor.Next(context.TODO()) {
        var book Book
        if err := bookCursor.Decode(&book); err != nil {
            fmt.Println("Error decoding book data:", err) // Debug logging
            http.Error(w, "Error decoding book data", http.StatusInternalServerError)
            return
        }
        books = append(books, book)
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(books)
}




// UpdateBookHandler marks a book as sold
func UpdateBookHandler(w http.ResponseWriter, r *http.Request) {
    // Ensure you're expecting PUT requests
    if r.Method != http.MethodPut {
        http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
        return
    }

    var requestData struct {
        BookID string `json:"bookId"`
        UserID string `json:"userId"`
    }

    // Decode the request data
    if err := json.NewDecoder(r.Body).Decode(&requestData); err != nil {
        http.Error(w, "Invalid request data", http.StatusBadRequest)
        return
    }

    // Convert BookID to ObjectID
    bookID, err := primitive.ObjectIDFromHex(requestData.BookID)
    if err != nil {
        http.Error(w, "Invalid book ID", http.StatusBadRequest)
        return
    }

    // Update the book's sold status in the database
    filter := bson.M{"_id": bookID}
    update := bson.M{"$set": bson.M{"sold": true}}

    _, err = db.Collection("books").UpdateOne(context.TODO(), filter, update)
    if err != nil {
        http.Error(w, "Failed to update book status", http.StatusInternalServerError)
        return
    }

    // Respond with a success message
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(map[string]string{"message": "Book marked as sold"})
}

// UpdateBookDetailsHandler updates the details of a specific book
func UpdateBookDetailsHandler(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPut {
        http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
        return
    }

    err := r.ParseMultipartForm(10 << 20) // 10 MB limit
    if err != nil {
        http.Error(w, "Error parsing form", http.StatusBadRequest)
        return
    }

    bookID := r.FormValue("id")
    title := r.FormValue("title")
    description := r.FormValue("description") // New field
    priceStr := r.FormValue("price")
    price, err := strconv.ParseFloat(priceStr, 64)
    if err != nil || price <= 0 {
        http.Error(w, "Invalid price", http.StatusBadRequest)
        return
    }

    var imageBytes []byte
    imageFile, _, err := r.FormFile("image")
    if imageFile != nil {
        defer imageFile.Close()
        imageBytes, err = io.ReadAll(imageFile)
        if err != nil {
            http.Error(w, "Error reading image file", http.StatusInternalServerError)
            return
        }
    }

    bookIDObj, err := primitive.ObjectIDFromHex(bookID)
    if err != nil {
        http.Error(w, "Invalid book ID", http.StatusBadRequest)
        return
    }

    update := bson.M{
        "$set": bson.M{
            "title":       title,
            "price":       price,
            "description": description, // Update description
        },
    }
    if len(imageBytes) > 0 {
        update["$set"].(bson.M)["image"] = imageBytes
    }

    _, err = db.Collection("books").UpdateOne(context.TODO(), bson.M{"_id": bookIDObj}, update)
    if err != nil {
        http.Error(w, "Failed to update book details", http.StatusInternalServerError)
        return
    }

    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(map[string]string{"message": "Book updated successfully"})
}



// DeleteCartItemHandler removes a book from the user's cart
func DeleteCartItemHandler(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodDelete {
        http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
        return
    }

    // Parse the request body
    var requestData struct {
        UserID string `json:"user_id"`
        BookID string `json:"book_id"`
    }

    if err := json.NewDecoder(r.Body).Decode(&requestData); err != nil {
        http.Error(w, "Invalid request data", http.StatusBadRequest)
        return
    }

    // Convert string IDs to ObjectIDs
    userID, err := primitive.ObjectIDFromHex(requestData.UserID)
    if err != nil {
        http.Error(w, "Invalid user ID", http.StatusBadRequest)
        return
    }

    bookID, err := primitive.ObjectIDFromHex(requestData.BookID)
    if err != nil {
        http.Error(w, "Invalid book ID", http.StatusBadRequest)
        return
    }

    // Delete the cart item that matches both user_id and book_id
    result, err := db.Collection("cart").DeleteOne(
        context.TODO(),
        bson.M{
            "user_id": userID,
            "book_id": bookID,
        },
    )

    if err != nil {
        http.Error(w, "Failed to delete cart item", http.StatusInternalServerError)
        return
    }

    if result.DeletedCount == 0 {
        http.Error(w, "Cart item not found", http.StatusNotFound)
        return
    }

    // Return success response
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(map[string]string{
        "message": "Item removed from cart successfully",
    })
}



