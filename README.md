# Campus Marketplace

Campus Marketplace is a full-stack web application where students can list, browse, and buy items from each other.

- **Frontend** – React 18 (Create React App), `Campus-MarketPlace/`
- **Backend** – Go 1.23+, gorilla/mux, MongoDB, `Campus-MarketPlace-go/`

---

## Project structure

```
campus-marketplace/
├── Campus-MarketPlace/        # React frontend
│   └── src/
│       ├── components/        # Header, BookCard, EditBookForm, StatusMessage, Layout
│       ├── pages/             # HomePage, CartPage, AddBookPage, UserBooksPage, SoldItemsPage, SignIn/SignUp
│       ├── hooks/             # useAuth (session), useBooks (listing loader)
│       ├── context/           # AuthContext
│       ├── services/api.js    # every backend call, token handling
│       └── styles/            # App.css (global), BookCard.css, CartPage.css
└── Campus-MarketPlace-go/     # Go backend
    ├── main.go                # server + CORS
    ├── config.go              # environment variables
    ├── router.go              # endpoints
    ├── auth.go                # JWT, password hashing, requireAuth middleware
    ├── handlers_auth.go       # /register, /login, /me
    ├── handlers_books.go      # listings + photos
    ├── handlers_cart.go       # cart + checkout
    ├── database.go            # connection + indexes
    ├── models.go              # User, Book, CartItem
    └── respond.go             # JSON helpers, request log
```

---

## Features

- Sign up / sign in with hashed passwords and JWT sessions (7-day tokens)
- Post an item for sale with a photo; edit your own unsold listings
- Browse everything for sale by other students, with search
- Cart with one-click checkout that can never sell the same item twice
- "Sold" page showing which of your items have been bought

---

## Running it locally

You need **Node.js 18+**, **Go 1.23+**, and **MongoDB** running on `mongodb://localhost:27017`
(the `bookbay` database and its indexes are created automatically).

### 1. Backend

```bash
cd Campus-MarketPlace-go
go run .
```

The server listens on http://localhost:8080. Without `JWT_SECRET` it generates a random
secret and warns you — fine for development, but every restart signs everyone out.

| Variable          | Default                       | Purpose                                              |
|-------------------|-------------------------------|------------------------------------------------------|
| `PORT`            | `8080`                        | Port to listen on                                    |
| `MONGO_URI`       | `mongodb://localhost:27017`   | MongoDB connection string                            |
| `MONGO_DB`        | `bookbay`                     | Database name                                        |
| `ALLOWED_ORIGINS` | `http://localhost:3000`       | Comma-separated browser origins allowed by CORS (see note) |
| `JWT_SECRET`      | *(random per start)*          | Secret used to sign session tokens — **set in prod** |

`JWT_SECRET` must be at least 32 characters (the server refuses shorter ones). Generate one with
`openssl rand -hex 32` or PowerShell `-join ((1..48) | % { [char](Get-Random -Min 33 -Max 126) })`.

Example (PowerShell): `$env:JWT_SECRET = "<your-64-char-secret>"; go run .`
Example (bash): `JWT_SECRET=<your-64-char-secret> go run .`

Upgrading from the previous version? Start the new server against the same database: it
removes any duplicate cart rows the old code allowed and builds the indexes. If the old
code ever produced two accounts with the same username, the server will stop and tell you
to rename or delete one of them first.

### 2. Frontend

```bash
cd Campus-MarketPlace
npm install
npm start
```

Opens http://localhost:3000. To point it at a backend elsewhere, copy `.env.example`
to `.env` and set `REACT_APP_API_URL`.

**Origins must match.** The backend only answers browsers whose origin is in `ALLOWED_ORIGINS`.
If the frontend runs anywhere other than `http://localhost:3000` (a different port because 3000
was busy, `127.0.0.1` instead of `localhost`, a deployed host), add that exact origin to
`ALLOWED_ORIGINS` or every request will fail with "Could not reach the server".

### Tests

```bash
cd Campus-MarketPlace && npm test        # React tests (jest + testing-library)
cd Campus-MarketPlace-go && go vet ./... # backend static checks
```

---

## API

All responses are JSON. Errors look like `{"error": "human readable message"}`.
Endpoints marked 🔒 need an `Authorization: Bearer <token>` header.

| Method | Path                  | Auth | Description                                                          |
|--------|-----------------------|------|----------------------------------------------------------------------|
| POST   | `/register`           |      | `{username, password}` → `201 {token, user_id, username}`             |
| POST   | `/login`              |      | `{username, password}` → `200 {token, user_id, username}`             |
| GET    | `/me`                 | 🔒   | Validate the token → `{user_id, username}`                            |
| GET    | `/books`              | 🔒   | Unsold listings by other users                                        |
| GET    | `/books/mine`         | 🔒   | Your listings, sold and unsold                                        |
| POST   | `/books`              | 🔒   | multipart `title, price, description, image` → `201 Book`             |
| PUT    | `/books/{id}`         | 🔒   | Edit your own unsold listing (`image` optional) → `200 Book`          |
| GET    | `/books/{id}/image`   |      | The listing photo (correct `Content-Type`, cacheable)                 |
| GET    | `/cart`               | 🔒   | Listings in your cart that are still available                        |
| POST   | `/cart`               | 🔒   | `{book_id}` → `201`; `400` own item, `409` sold or already in cart    |
| DELETE | `/cart/{bookId}`      | 🔒   | Remove one item                                                       |
| POST   | `/checkout`           | 🔒   | Buy everything in the cart → `{purchased, unavailable, total}`        |

A `Book` is `{id, title, price, description, user_id, sold, buyer_id?, sold_at?, created_at, updated_at, image_url}`.
Photos are never inlined in JSON — load them from `image_url`.

Rules enforced server-side: usernames are 3–32 characters of letters, digits, `.`, `_`, `-`;
passwords are at least 8 characters and at most 72 bytes (bcrypt's limit); titles up to 120 and
descriptions up to 2000 characters; uploads must be JPEG, PNG, GIF or WebP up to 10 MB; you can only edit
your own listings; you cannot cart or buy your own listing; an item can only be sold once.

---

## Security notes

- Passwords are stored as bcrypt hashes; login failures never reveal whether the username exists.
- Sessions are JWTs (HS256) kept in `localStorage`. That is standard for a project like this, but it
  means any XSS would expose the token — keep dependencies updated and never render untrusted HTML.
- Every data-changing endpoint derives the acting user from the token, never from the request body.
- Sign-in is throttled to 10 attempts per minute per address and username, and account creation to 5 per minute per address (in memory; use a shared store if you run several instances).
- Listing photos are only ever served with an `image/*` content type; anything else is refused, and all responses carry `X-Content-Type-Options: nosniff`.
- Set a strong `JWT_SECRET` and restrict `ALLOWED_ORIGINS` before exposing the server publicly. `.env` files are git-ignored so local secrets stay local.

---

## Notes

- The code and database still say *book* in places — every listing can be any item.
- Photos are stored inside the MongoDB document (max 10 MB each). For a large deployment
  move them to object storage and keep only the URL.
