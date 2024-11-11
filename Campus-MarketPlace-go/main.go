package main

import (
	"log"
	"net/http"
	"github.com/rs/cors"
)

func main() {
	// Initialize the database
	InitializeDatabase()

	// Set up routes
	router := SetupRoutes()

	// Enable CORS - You can configure CORS as needed
	corsHandler := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000"}, // Allow your React frontend to make requests
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
	})

	// Wrap the router with CORS middleware
	handler := corsHandler.Handler(router)

	// Start the server
	log.Println("Server starting on http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", handler))
}
