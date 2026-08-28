package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"time"

	"github.com/rs/cors"
)

func main() {
	cfg := LoadConfig()
	SetJWTSecret(cfg.JWTSecret)

	client := InitializeDatabase(cfg)
	disconnect := func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := client.Disconnect(ctx); err != nil {
			log.Println("Error disconnecting from MongoDB:", err)
		}
	}

	// CORS is configured here and only here. Origins come from ALLOWED_ORIGINS.
	corsHandler := cors.New(cors.Options{
		AllowedOrigins:   cfg.AllowedOrigins,
		AllowedMethods:   []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodOptions},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: false, // bearer tokens, not cookies
		MaxAge:           600,
	})

	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           logRequests(corsHandler.Handler(SetupRoutes())),
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       60 * time.Second, // image uploads
		WriteTimeout:      60 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	// Stop cleanly on Ctrl+C / SIGTERM so in-flight requests finish.
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()
	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = server.Shutdown(shutdownCtx)
	}()

	log.Printf("Server listening on http://localhost:%s (allowed origins: %v)", cfg.Port, cfg.AllowedOrigins)
	err := server.ListenAndServe()
	disconnect()
	if err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
	log.Println("Server stopped")
}
