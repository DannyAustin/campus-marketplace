
# Campus Marketplace

Campus Marketplace is a full-stack web application where users can list, browse, and manage items for sale—tailored for a campus environment.

---

## 🧱 Project Structure

```
campus-marketplace/
├── Campus-MarketPlace/        # React Frontend
├── Campus-MarketPlace-go/     # Go Backend (REST API + MongoDB)
```

---

## 🚀 Features

- **User Authentication** (Sign up / Sign in)
- **List New Items** for sale
- **View and Manage Listings**
- **Add to Cart / Remove from Cart**
- **Receive Notifications**
- **Responsive Design** with custom CSS per page

---

## ⚙️ Frontend Setup

**Path**: `Campus-MarketPlace`

```bash
cd Campus-MarketPlace
npm install
npm start
```

This starts the React development server at http://localhost:3000. Start the backend first (below) — the frontend expects it at http://localhost:8080.

---

## 🔧 Backend Setup

**Path**: `Campus-MarketPlace-go`

```bash
cd Campus-MarketPlace-go
go mod tidy
go run .
```

Requirements:

- **Go 1.23+** (see `go.mod`)
- **MongoDB** running locally on `mongodb://localhost:27017` — the server connects to it on startup and exits if it is unreachable. The database `bookbay` is created automatically.

---

## 📁 Notable Directories & Files

### Frontend:
- `src/components/`: Reusable components (e.g., `Header.js`, `BookCard.js`)
- `src/pages/`: Main route components (e.g., `HomePage.js`, `CartPage.js`)
- `src/styles/`: Page-specific CSS
- `src/services/api.js`: API request functions

### Backend:
- `models.go`: Defines data structures like Listings, Users, Cart
- `handlers.go`: All request handling logic (CRUD)
- `router.go`: Endpoint routing
- `database.go`: DB initialization

---

## 📝 Notes

- All instances of the word *book* refer to marketplace *items/listings* and may need renaming in future cleanups.
- `.DS_Store` and `__MACOSX` files are macOS artifacts and can be ignored or deleted.
