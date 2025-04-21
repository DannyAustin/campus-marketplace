package main

import (
	"context"
	"fmt"
	"log"
	"time"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var client *mongo.Client
var db *mongo.Database

// InitializeDatabase initializes the MongoDB connection
func InitializeDatabase() {
    uri := "mongodb://localhost:27017"

    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    clientOptions := options.Client().ApplyURI(uri)
    var err error
    client, err = mongo.Connect(ctx, clientOptions)
    if err != nil {
        log.Fatal("Error connecting to MongoDB:", err)
    }

    err = client.Ping(ctx, nil)
    if err != nil {
        log.Fatal("Error pinging MongoDB:", err)
    }

    db = client.Database("bookbay")
    fmt.Println("Connected to MongoDB!")
}
