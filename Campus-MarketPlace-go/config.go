package main

import (
	"crypto/rand"
	"encoding/hex"
	"log"
	"os"
	"strings"
)

// minJWTSecretLength is the shortest JWT_SECRET accepted (32 bytes = 256 bits,
// the recommended minimum for HS256).
const minJWTSecretLength = 32

// Config holds every runtime setting. Values come from environment variables
// so the same binary can run locally and in deployment without code edits.
type Config struct {
	Port           string
	MongoURI       string
	MongoDB        string
	AllowedOrigins []string
	JWTSecret      []byte
}

func envOr(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}

// LoadConfig reads the environment, applying development-friendly defaults.
func LoadConfig() Config {
	cfg := Config{
		Port:     envOr("PORT", "8080"),
		MongoURI: envOr("MONGO_URI", "mongodb://localhost:27017"),
		MongoDB:  envOr("MONGO_DB", "bookbay"),
	}

	for _, o := range strings.Split(envOr("ALLOWED_ORIGINS", "http://localhost:3000"), ",") {
		if o = strings.TrimSpace(o); o != "" {
			cfg.AllowedOrigins = append(cfg.AllowedOrigins, o)
		}
	}

	if secret := strings.TrimSpace(os.Getenv("JWT_SECRET")); secret != "" {
		if len(secret) < minJWTSecretLength {
			log.Fatalf("JWT_SECRET must be at least %d characters (got %d); tokens signed with a short secret can be cracked offline", minJWTSecretLength, len(secret))
		}
		cfg.JWTSecret = []byte(secret)
	} else {
		// Generate a throwaway secret so development "just works". Tokens
		// will not survive a restart; set JWT_SECRET for anything real.
		buf := make([]byte, 32)
		if _, err := rand.Read(buf); err != nil {
			log.Fatal("Could not generate a JWT secret:", err)
		}
		cfg.JWTSecret = []byte(hex.EncodeToString(buf))
		log.Println("WARNING: JWT_SECRET not set - using a random secret; all sessions expire when the server restarts")
	}

	return cfg
}
