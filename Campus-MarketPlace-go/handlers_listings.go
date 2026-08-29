package main

import (
	"bytes"
	"context"
	"errors"
	"io"
	"math"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const (
	maxImageBytes     = 10 << 20 // 10 MB
	maxTitleLength    = 120
	maxDescriptionLen = 2000
	maxSearchLength   = 100
	maxPrice          = 1_000_000
)

// withoutImage excludes the (large) photo bytes from list and detail queries.
var withoutImage = bson.M{"image": 0, "image_type": 0}

// allowedImageTypes lists the photo formats accepted for a listing, keyed by
// what http.DetectContentType reports for the uploaded bytes.
var allowedImageTypes = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
	"image/gif":  true,
	"image/webp": true,
}

// Sort orders accepted by GET /listings.
var sortOrders = map[string]bson.D{
	"newest":     {{Key: "created_at", Value: -1}},
	"price_asc":  {{Key: "price", Value: 1}, {Key: "created_at", Value: -1}},
	"price_desc": {{Key: "price", Value: -1}, {Key: "created_at", Value: -1}},
}

// listingInput is the validated content of a create/update form.
type listingInput struct {
	Title       string
	Price       float64
	Description string
	Category    string
	Condition   string
	Image       []byte
	ImageType   string
}

// parseListingInput reads and validates the multipart form shared by create
// and update. It returns a user-facing message when the input is rejected.
func parseListingInput(w http.ResponseWriter, r *http.Request, imageRequired bool) (listingInput, string) {
	var in listingInput

	r.Body = http.MaxBytesReader(w, r.Body, maxImageBytes+(1<<20))
	if err := r.ParseMultipartForm(maxImageBytes); err != nil {
		return in, "The upload is too large (max 10 MB) or the form is malformed"
	}

	// Limits count characters (runes) to match the maxLength on the forms.
	in.Title = strings.TrimSpace(r.FormValue("title"))
	if in.Title == "" {
		return in, "Title is required"
	}
	if utf8.RuneCountInString(in.Title) > maxTitleLength {
		return in, "Title must be at most 120 characters"
	}

	in.Description = strings.TrimSpace(r.FormValue("description"))
	if utf8.RuneCountInString(in.Description) > maxDescriptionLen {
		return in, "Description must be at most 2000 characters"
	}

	in.Category = strings.TrimSpace(r.FormValue("category"))
	if !isOneOf(in.Category, Categories) {
		return in, "Please choose a category"
	}
	in.Condition = strings.TrimSpace(r.FormValue("condition"))
	if !isOneOf(in.Condition, Conditions) {
		return in, "Please choose the item's condition"
	}

	price, err := strconv.ParseFloat(strings.TrimSpace(r.FormValue("price")), 64)
	if err != nil || math.IsNaN(price) || math.IsInf(price, 0) {
		return in, "Price must be a number greater than 0 (and at most 1,000,000)"
	}
	// Round to cents first so a sub-cent value like 0.001 cannot slip through
	// the "greater than 0" rule and be stored as 0.
	in.Price = math.Round(price*100) / 100
	if in.Price <= 0 || in.Price > maxPrice {
		return in, "Price must be a number greater than 0 (and at most 1,000,000)"
	}

	file, _, err := r.FormFile("image")
	if errors.Is(err, http.ErrMissingFile) {
		if imageRequired {
			return in, "A photo is required"
		}
		return in, ""
	}
	if err != nil {
		return in, "Could not read the uploaded photo"
	}
	defer file.Close()

	data, err := io.ReadAll(file)
	if err != nil {
		return in, "Could not read the uploaded photo"
	}
	if len(data) == 0 {
		if imageRequired {
			return in, "A photo is required"
		}
		return in, ""
	}
	if len(data) > maxImageBytes {
		// ParseMultipartForm's argument only controls memory use; enforce the
		// advertised limit on the file itself.
		return in, "The photo is too large (max 10 MB)"
	}

	contentType := http.DetectContentType(data)
	if !allowedImageTypes[contentType] {
		return in, "The uploaded file must be an image (JPEG, PNG, GIF or WebP)"
	}
	in.Image = data
	in.ImageType = contentType
	return in, ""
}

// findListings runs a query with the image excluded and returns a non-nil slice.
func findListings(ctx context.Context, filter bson.M, sort bson.D) ([]Listing, error) {
	opts := options.Find().SetProjection(withoutImage).SetSort(sort)
	cursor, err := db.Collection(listingsCollection).Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	listings := []Listing{}
	for cursor.Next(ctx) {
		var listing Listing
		if err := cursor.Decode(&listing); err != nil {
			return nil, err
		}
		listings = append(listings, listing.withImageURL())
	}
	return listings, cursor.Err()
}

// parseOptionalPrice reads a non-negative price query parameter. The bool
// reports whether the parameter was present.
func parseOptionalPrice(raw string) (float64, bool, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return 0, false, nil
	}
	v, err := strconv.ParseFloat(raw, 64)
	if err != nil || math.IsNaN(v) || math.IsInf(v, 0) || v < 0 || v > maxPrice {
		return 0, true, errors.New("invalid price")
	}
	return v, true, nil
}

// ListListingsHandler returns everything currently for sale by other people,
// optionally filtered and sorted.
//
//	GET /listings?q=&category=&condition=&min_price=&max_price=&sort=newest|price_asc|price_desc
func ListListingsHandler(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	filter := bson.M{"sold": false, "user_id": bson.M{"$ne": currentUserID(r)}}

	if category := strings.TrimSpace(query.Get("category")); category != "" {
		if !isOneOf(category, Categories) {
			writeError(w, http.StatusBadRequest, "Unknown category")
			return
		}
		filter["category"] = category
	}
	if condition := strings.TrimSpace(query.Get("condition")); condition != "" {
		if !isOneOf(condition, Conditions) {
			writeError(w, http.StatusBadRequest, "Unknown condition")
			return
		}
		filter["condition"] = condition
	}

	minPrice, hasMin, err := parseOptionalPrice(query.Get("min_price"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "min_price must be a number between 0 and 1,000,000")
		return
	}
	maxPriceParam, hasMax, err := parseOptionalPrice(query.Get("max_price"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "max_price must be a number between 0 and 1,000,000")
		return
	}
	if hasMin && hasMax && minPrice > maxPriceParam {
		writeError(w, http.StatusBadRequest, "min_price cannot be greater than max_price")
		return
	}
	priceFilter := bson.M{}
	if hasMin {
		priceFilter["$gte"] = minPrice
	}
	if hasMax {
		priceFilter["$lte"] = maxPriceParam
	}
	if len(priceFilter) > 0 {
		filter["price"] = priceFilter
	}

	if q := strings.TrimSpace(query.Get("q")); q != "" {
		if utf8.RuneCountInString(q) > maxSearchLength {
			writeError(w, http.StatusBadRequest, "Search text must be at most 100 characters")
			return
		}
		if !utf8.ValidString(q) || strings.ContainsRune(q, 0) {
			// BSON regexes cannot carry NUL bytes or invalid UTF-8.
			writeError(w, http.StatusBadRequest, "Search text contains unsupported characters")
			return
		}
		// Case-insensitive substring match; the text is escaped so users
		// cannot inject regex syntax.
		pattern := primitive.Regex{Pattern: regexp.QuoteMeta(q), Options: "i"}
		filter["$or"] = []bson.M{{"title": pattern}, {"description": pattern}}
	}

	sortKey := strings.TrimSpace(query.Get("sort"))
	if sortKey == "" {
		sortKey = "newest"
	}
	sort, ok := sortOrders[sortKey]
	if !ok {
		writeError(w, http.StatusBadRequest, "sort must be one of newest, price_asc, price_desc")
		return
	}

	listings, err := findListings(r.Context(), filter, sort)
	if err != nil {
		serverError(w, "listing listings", err)
		return
	}
	writeJSON(w, http.StatusOK, listings)
}

// MyListingsHandler returns the caller's own listings, sold or not.
//
//	GET /listings/mine  -> 200 [Listing]
func MyListingsHandler(w http.ResponseWriter, r *http.Request) {
	listings, err := findListings(r.Context(), bson.M{"user_id": currentUserID(r)}, sortOrders["newest"])
	if err != nil {
		serverError(w, "listing own listings", err)
		return
	}
	writeJSON(w, http.StatusOK, listings)
}

// CreateListingHandler posts a new listing.
//
//	POST /listings  multipart: title, price, description, category, condition, image  -> 201 Listing
func CreateListingHandler(w http.ResponseWriter, r *http.Request) {
	in, msg := parseListingInput(w, r, true)
	if msg != "" {
		writeError(w, http.StatusBadRequest, msg)
		return
	}

	now := time.Now()
	listing := Listing{
		Title:       in.Title,
		Price:       in.Price,
		Description: in.Description,
		Category:    in.Category,
		Condition:   in.Condition,
		UserID:      currentUserID(r),
		Sold:        false,
		CreatedAt:   now,
		UpdatedAt:   now,
		Image:       in.Image,
		ImageType:   in.ImageType,
	}
	result, err := db.Collection(listingsCollection).InsertOne(r.Context(), listing)
	if err != nil {
		serverError(w, "creating listing", err)
		return
	}
	listing.ID = result.InsertedID.(primitive.ObjectID)

	writeJSON(w, http.StatusCreated, listing.withImageURL())
}

// UpdateListingHandler edits one of the caller's own unsold listings.
//
//	PUT /listings/{id}  multipart: title, price, description, category, condition, [image]  -> 200 Listing
func UpdateListingHandler(w http.ResponseWriter, r *http.Request) {
	listingID, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid listing ID")
		return
	}
	me := currentUserID(r)

	// Check ownership first so a non-owner gets a clear answer before we
	// bother parsing their upload.
	var existing Listing
	err = db.Collection(listingsCollection).FindOne(r.Context(), bson.M{"_id": listingID},
		options.FindOne().SetProjection(bson.M{"user_id": 1, "sold": 1})).Decode(&existing)
	if errors.Is(err, mongo.ErrNoDocuments) {
		writeError(w, http.StatusNotFound, "Listing not found")
		return
	}
	if err != nil {
		serverError(w, "looking up listing", err)
		return
	}
	if existing.UserID != me {
		writeError(w, http.StatusForbidden, "You can only edit your own listings")
		return
	}
	if existing.Sold {
		writeError(w, http.StatusConflict, "This item has been sold and can no longer be edited")
		return
	}

	in, msg := parseListingInput(w, r, false)
	if msg != "" {
		writeError(w, http.StatusBadRequest, msg)
		return
	}

	set := bson.M{
		"title":       in.Title,
		"price":       in.Price,
		"description": in.Description,
		"category":    in.Category,
		"condition":   in.Condition,
		"updated_at":  time.Now(),
	}
	if len(in.Image) > 0 {
		set["image"] = in.Image
		set["image_type"] = in.ImageType
	}

	// The filter repeats the ownership/sold conditions so a concurrent sale
	// between the check above and this write cannot slip through.
	result, err := db.Collection(listingsCollection).UpdateOne(r.Context(),
		bson.M{"_id": listingID, "user_id": me, "sold": false}, bson.M{"$set": set})
	if err != nil {
		serverError(w, "updating listing", err)
		return
	}
	if result.MatchedCount == 0 {
		writeError(w, http.StatusConflict, "This item was just sold and can no longer be edited")
		return
	}

	var updated Listing
	err = db.Collection(listingsCollection).FindOne(r.Context(), bson.M{"_id": listingID},
		options.FindOne().SetProjection(withoutImage)).Decode(&updated)
	if err != nil {
		serverError(w, "reloading listing", err)
		return
	}
	writeJSON(w, http.StatusOK, updated.withImageURL())
}

// ListingImageHandler serves a listing's photo. It is public so plain <img>
// tags can load it, and cacheable because the URL carries a version.
//
//	GET /listings/{id}/image  -> image bytes
func ListingImageHandler(w http.ResponseWriter, r *http.Request) {
	listingID, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid listing ID")
		return
	}

	var listing Listing
	err = db.Collection(listingsCollection).FindOne(r.Context(), bson.M{"_id": listingID},
		options.FindOne().SetProjection(bson.M{"image": 1, "image_type": 1, "updated_at": 1})).Decode(&listing)
	if errors.Is(err, mongo.ErrNoDocuments) || (err == nil && len(listing.Image) == 0) {
		writeError(w, http.StatusNotFound, "No photo for this listing")
		return
	}
	if err != nil {
		serverError(w, "loading image", err)
		return
	}

	contentType := listing.ImageType
	if contentType == "" {
		// Listing created by the previous version, which stored any file.
		contentType = http.DetectContentType(listing.Image)
	}
	if !strings.HasPrefix(contentType, "image/") {
		// Never serve non-image bytes from this public endpoint.
		writeError(w, http.StatusNotFound, "No photo for this listing")
		return
	}
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	http.ServeContent(w, r, "", listing.UpdatedAt, bytes.NewReader(listing.Image))
}
