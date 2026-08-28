package main

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// decodeJSON reads a small JSON body into v.
func decodeJSON(w http.ResponseWriter, r *http.Request, v interface{}) error {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	return json.NewDecoder(r.Body).Decode(v)
}

type credentials struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type authResponse struct {
	Token    string `json:"token"`
	UserID   string `json:"user_id"`
	Username string `json:"username"`
}

func respondWithToken(w http.ResponseWriter, status int, user User) {
	token, err := issueToken(user.ID)
	if err != nil {
		serverError(w, "issuing token", err)
		return
	}
	writeJSON(w, status, authResponse{Token: token, UserID: user.ID.Hex(), Username: user.Username})
}

// dummyHash is compared against when a login names an unknown user, so the
// request takes the same time as a wrong password and reveals nothing.
var dummyHash string

func init() {
	h, err := hashPassword("not-a-real-password")
	if err != nil {
		panic(err)
	}
	dummyHash = h
}

// RegisterHandler creates an account and signs the new user in.
//
//	POST /register  {"username": "...", "password": "..."}  -> 201 {token, user_id, username}
func RegisterHandler(w http.ResponseWriter, r *http.Request) {
	var creds credentials
	if err := decodeJSON(w, r, &creds); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	creds.Username = strings.TrimSpace(creds.Username)
	if msg := validateCredentials(creds.Username, creds.Password); msg != "" {
		writeError(w, http.StatusBadRequest, msg)
		return
	}
	if !registerLimiter.allow(clientIP(r)) {
		writeError(w, http.StatusTooManyRequests, "Too many accounts created from this address. Please wait a minute and try again")
		return
	}

	hash, err := hashPassword(creds.Password)
	if err != nil {
		serverError(w, "hashing password", err)
		return
	}

	user := User{Username: creds.Username, Password: hash, CreatedAt: time.Now()}
	result, err := db.Collection(usersCollection).InsertOne(r.Context(), user)
	if isDuplicateKey(err) {
		writeError(w, http.StatusConflict, "That username is already taken")
		return
	}
	if err != nil {
		serverError(w, "creating user", err)
		return
	}
	user.ID = result.InsertedID.(primitive.ObjectID)

	respondWithToken(w, http.StatusCreated, user)
}

// LoginHandler verifies credentials and returns a token.
//
//	POST /login  {"username": "...", "password": "..."}  -> 200 {token, user_id, username}
func LoginHandler(w http.ResponseWriter, r *http.Request) {
	var creds credentials
	if err := decodeJSON(w, r, &creds); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	creds.Username = strings.TrimSpace(creds.Username)
	if !loginLimiter.allow(clientIP(r) + "|" + creds.Username) {
		writeError(w, http.StatusTooManyRequests, "Too many sign-in attempts. Please wait a minute and try again")
		return
	}

	var user User
	err := db.Collection(usersCollection).FindOne(r.Context(), bson.M{"username": creds.Username}).Decode(&user)
	if errors.Is(err, mongo.ErrNoDocuments) {
		checkPassword(dummyHash, creds.Password) // constant-time-ish: same work as a real user
		writeError(w, http.StatusUnauthorized, "Invalid username or password")
		return
	}
	if err != nil {
		serverError(w, "looking up user", err)
		return
	}
	if !checkPassword(user.Password, creds.Password) {
		writeError(w, http.StatusUnauthorized, "Invalid username or password")
		return
	}

	respondWithToken(w, http.StatusOK, user)
}

// MeHandler lets a client confirm that its stored token is still valid.
//
//	GET /me  -> 200 {user_id, username}
func MeHandler(w http.ResponseWriter, r *http.Request) {
	var user User
	err := db.Collection(usersCollection).FindOne(r.Context(), bson.M{"_id": currentUserID(r)}).Decode(&user)
	if errors.Is(err, mongo.ErrNoDocuments) {
		writeError(w, http.StatusUnauthorized, "This account no longer exists")
		return
	}
	if err != nil {
		serverError(w, "looking up user", err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"user_id": user.ID.Hex(), "username": user.Username})
}
