
# Campus Marketplace

Campus Marketplace is a full-stack web application where users can list, browse, and manage items for sale—tailored for a campus environment.

---

## 🧱 Project Structure

```
Code/
├── Campus-MarketPlace/        # React Frontend
├── Campus-MarketPlace-go/     # Go Backend
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

**Path**: `Code/Campus-MarketPlace`

```bash
cd Code/Campus-MarketPlace
npm install
npm start
```

This starts the React development server.

---

## 🔧 Backend Setup

**Path**: `Code/Campus-MarketPlace-go`

```bash
cd Code/Campus-MarketPlace-go
go mod tidy
go run .
```

Make sure you have Go installed (v1.16+).

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
