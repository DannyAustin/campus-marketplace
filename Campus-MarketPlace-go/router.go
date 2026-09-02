package main

import (
	"net/http"

	"github.com/gorilla/mux"
)

// objectIDPattern restricts {id} route variables to valid 24-hex ObjectIDs so
// "/listings/mine" can never be mistaken for "/listings/{id}".
const objectIDPattern = "[0-9a-fA-F]{24}"

// SetupRoutes wires every endpoint. Everything except sign-up, sign-in and
// listing photos requires a valid bearer token.
func SetupRoutes() http.Handler {
	r := mux.NewRouter()

	// Operations
	r.HandleFunc("/health", HealthHandler).Methods(http.MethodGet)

	// Auth
	r.HandleFunc("/register", RegisterHandler).Methods(http.MethodPost)
	r.HandleFunc("/login", LoginHandler).Methods(http.MethodPost)
	r.HandleFunc("/me", requireAuth(MeHandler)).Methods(http.MethodGet)

	// Listings
	r.HandleFunc("/listings", requireAuth(ListListingsHandler)).Methods(http.MethodGet)
	r.HandleFunc("/listings", requireAuth(CreateListingHandler)).Methods(http.MethodPost)
	r.HandleFunc("/listings/mine", requireAuth(MyListingsHandler)).Methods(http.MethodGet)
	r.HandleFunc("/listings/{id:"+objectIDPattern+"}", requireAuth(UpdateListingHandler)).Methods(http.MethodPut)
	r.HandleFunc("/listings/{id:"+objectIDPattern+"}/image", ListingImageHandler).Methods(http.MethodGet)

	// Cart & checkout
	r.HandleFunc("/cart", requireAuth(GetCartHandler)).Methods(http.MethodGet)
	r.HandleFunc("/cart", requireAuth(AddToCartHandler)).Methods(http.MethodPost)
	r.HandleFunc("/cart/{listingId:"+objectIDPattern+"}", requireAuth(RemoveFromCartHandler)).Methods(http.MethodDelete)
	r.HandleFunc("/checkout", requireAuth(CheckoutHandler)).Methods(http.MethodPost)

	r.NotFoundHandler = http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		writeError(w, http.StatusNotFound, "No such endpoint")
	})
	r.MethodNotAllowedHandler = http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
	})

	return r
}
