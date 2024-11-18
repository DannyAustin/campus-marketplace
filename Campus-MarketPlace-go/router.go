package main

import (
    "github.com/gorilla/mux"
    "github.com/rs/cors"
    "net/http"
)

func SetupRoutes() http.Handler {
    // Create a new router
    router := mux.NewRouter()
    
    // Define your routes
    router.HandleFunc("/register", RegisterHandler).Methods("POST")
    router.HandleFunc("/login", LoginHandler).Methods("POST")
    router.HandleFunc("/books", AddBookHandler).Methods("POST")
    router.HandleFunc("/user/books", GetUserBooksHandler).Methods("GET")
    router.HandleFunc("/getallbooks", GetAllBooksHandler).Methods("GET")
    router.HandleFunc("/addtocart", AddCartItemHandler).Methods("POST")
    router.HandleFunc("/getcart", GetCartItemsHandler).Methods("GET")
    router.HandleFunc("/updatebook", UpdateBookHandler).Methods("PUT")
    router.HandleFunc("/updatebookdetails", UpdateBookDetailsHandler).Methods("PUT") // Corrected to PUT
	router.HandleFunc("/deletefromcart", DeleteCartItemHandler).Methods("DELETE")
	
    
    // Apply CORS middleware to allow all origins
    handler := cors.AllowAll().Handler(router)

    // Return the CORS-enabled handler
    return handler
}
