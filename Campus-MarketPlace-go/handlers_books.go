package main

import (
	"bytes"
	"context"
	"errors"
	"io"
	"math"
	"net/http"
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
	maxImageBytes      = 10 << 20 // 10 MB
	maxTitleLength     = 120
	maxDescriptionLen  = 2000
	maxPrice           = 1_000_000
	listingsSortNewest = "created_at"
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

// listingInput is the validated content of a create/update form.
type listingInput struct {
	Title       string
	Price       float64
	Description string
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

// findBooks runs a query with the image excluded and returns a non-nil slice.
func findBooks(ctx context.Context, filter bson.M) ([]Book, error) {
	opts := options.Find().SetProjection(withoutImage).SetSort(bson.D{{Key: listingsSortNewest, Value: -1}})
	cursor, err := db.Collection(booksCollection).Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	books := []Book{}
	for cursor.Next(ctx) {
		var book Book
		if err := cursor.Decode(&book); err != nil {
			return nil, err
		}
		books = append(books, book.withImageURL())
	}
	return books, cursor.Err()
}

// ListBooksHandler returns everything currently for sale by other people.
//
//	GET /books  -> 200 [Book]
func ListBooksHandler(w http.ResponseWriter, r *http.Request) {
	books, err := findBooks(r.Context(), bson.M{"sold": false, "user_id": bson.M{"$ne": currentUserID(r)}})
	if err != nil {
		serverError(w, "listing books", err)
		return
	}
	writeJSON(w, http.StatusOK, books)
}

// MyBooksHandler returns the caller's own listings, sold or not.
//
//	GET /books/mine  -> 200 [Book]
func MyBooksHandler(w http.ResponseWriter, r *http.Request) {
	books, err := findBooks(r.Context(), bson.M{"user_id": currentUserID(r)})
	if err != nil {
		serverError(w, "listing own books", err)
		return
	}
	writeJSON(w, http.StatusOK, books)
}

// CreateBookHandler posts a new listing.
//
//	POST /books  multipart: title, price, description, image  -> 201 Book
func CreateBookHandler(w http.ResponseWriter, r *http.Request) {
	in, msg := parseListingInput(w, r, true)
	if msg != "" {
		writeError(w, http.StatusBadRequest, msg)
		return
	}

	now := time.Now()
	book := Book{
		Title:       in.Title,
		Price:       in.Price,
		Description: in.Description,
		UserID:      currentUserID(r),
		Sold:        false,
		CreatedAt:   now,
		UpdatedAt:   now,
		Image:       in.Image,
		ImageType:   in.ImageType,
	}
	result, err := db.Collection(booksCollection).InsertOne(r.Context(), book)
	if err != nil {
		serverError(w, "creating book", err)
		return
	}
	book.ID = result.InsertedID.(primitive.ObjectID)

	writeJSON(w, http.StatusCreated, book.withImageURL())
}

// UpdateBookHandler edits one of the caller's own unsold listings.
//
//	PUT /books/{id}  multipart: title, price, description, [image]  -> 200 Book
func UpdateBookHandler(w http.ResponseWriter, r *http.Request) {
	bookID, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid book ID")
		return
	}
	me := currentUserID(r)

	// Check ownership first so a non-owner gets a clear answer before we
	// bother parsing their upload.
	var existing Book
	err = db.Collection(booksCollection).FindOne(r.Context(), bson.M{"_id": bookID},
		options.FindOne().SetProjection(bson.M{"user_id": 1, "sold": 1})).Decode(&existing)
	if errors.Is(err, mongo.ErrNoDocuments) {
		writeError(w, http.StatusNotFound, "Listing not found")
		return
	}
	if err != nil {
		serverError(w, "looking up book", err)
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
		"updated_at":  time.Now(),
	}
	if len(in.Image) > 0 {
		set["image"] = in.Image
		set["image_type"] = in.ImageType
	}

	// The filter repeats the ownership/sold conditions so a concurrent sale
	// between the check above and this write cannot slip through.
	result, err := db.Collection(booksCollection).UpdateOne(r.Context(),
		bson.M{"_id": bookID, "user_id": me, "sold": false}, bson.M{"$set": set})
	if err != nil {
		serverError(w, "updating book", err)
		return
	}
	if result.MatchedCount == 0 {
		writeError(w, http.StatusConflict, "This item was just sold and can no longer be edited")
		return
	}

	var updated Book
	err = db.Collection(booksCollection).FindOne(r.Context(), bson.M{"_id": bookID},
		options.FindOne().SetProjection(withoutImage)).Decode(&updated)
	if err != nil {
		serverError(w, "reloading book", err)
		return
	}
	writeJSON(w, http.StatusOK, updated.withImageURL())
}

// BookImageHandler serves a listing's photo. It is public so plain <img>
// tags can load it, and cacheable because the URL carries a version.
//
//	GET /books/{id}/image  -> image bytes
func BookImageHandler(w http.ResponseWriter, r *http.Request) {
	bookID, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid book ID")
		return
	}

	var book Book
	err = db.Collection(booksCollection).FindOne(r.Context(), bson.M{"_id": bookID},
		options.FindOne().SetProjection(bson.M{"image": 1, "image_type": 1, "updated_at": 1})).Decode(&book)
	if errors.Is(err, mongo.ErrNoDocuments) || (err == nil && len(book.Image) == 0) {
		writeError(w, http.StatusNotFound, "No photo for this listing")
		return
	}
	if err != nil {
		serverError(w, "loading image", err)
		return
	}

	contentType := book.ImageType
	if contentType == "" {
		// Listing created by the previous version, which stored any file.
		contentType = http.DetectContentType(book.Image)
	}
	if !strings.HasPrefix(contentType, "image/") {
		// Never serve non-image bytes from this public endpoint.
		writeError(w, http.StatusNotFound, "No photo for this listing")
		return
	}
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	http.ServeContent(w, r, "", book.UpdatedAt, bytes.NewReader(book.Image))
}
