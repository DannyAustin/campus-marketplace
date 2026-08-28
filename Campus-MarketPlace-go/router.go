package main

import (
	"net/http"

	"github.com/gorilla/mux"
)

// objectIDPattern restricts {id} route variables to valid 24-hex ObjectIDs so
// "/books/mine" can never be mistaken for "/books/{id}".
const objectIDPattern = "[0-9a-fA-F]{24}"

// SetupRoutes wires every endpoint. Everything except sign-up, sign-in and
// listing photos requires a valid bearer token.
func SetupRoutes() http.Handler {
	r := mux.NewRouter()

	// Auth
	r.HandleFunc("/register", RegisterHandler).Methods(http.MethodPost)
	r.HandleFunc("/login", LoginHandler).Methods(http.MethodPost)
	r.HandleFunc("/me", requireAuth(MeHandler)).Methods(http.MethodGet)

	// Listings
	r.HandleFunc("/books", requireAuth(ListBooksHandler)).Methods(http.MethodGet)
	r.HandleFunc("/books", requireAuth(CreateBookHandler)).Methods(http.MethodPost)
	r.HandleFunc("/books/mine", requireAuth(MyBooksHandler)).Methods(http.MethodGet)
	r.HandleFunc("/books/{id:"+objectIDPattern+"}", requireAuth(UpdateBookHandler)).Methods(http.MethodPut)
	r.HandleFunc("/books/{id:"+objectIDPattern+"}/image", BookImageHandler).Methods(http.MethodGet)

	// Cart & checkout
	r.HandleFunc("/cart", requireAuth(GetCartHandler)).Methods(http.MethodGet)
	r.HandleFunc("/cart", requireAuth(AddToCartHandler)).Methods(http.MethodPost)
	r.HandleFunc("/cart/{bookId:"+objectIDPattern+"}", requireAuth(RemoveFromCartHandler)).Methods(http.MethodDelete)
	r.HandleFunc("/checkout", requireAuth(CheckoutHandler)).Methods(http.MethodPost)

	r.NotFoundHandler = http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		writeError(w, http.StatusNotFound, "No such endpoint")
	})
	r.MethodNotAllowedHandler = http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
	})

	return r
}
