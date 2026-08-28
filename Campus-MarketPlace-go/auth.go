package main

import (
	"context"
	"errors"
	"net"
	"net/http"
	"regexp"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/crypto/bcrypt"
)

const tokenLifetime = 7 * 24 * time.Hour

var jwtSecret []byte

// SetJWTSecret must be called once at startup before issuing or verifying tokens.
func SetJWTSecret(secret []byte) { jwtSecret = secret }

// --- Credentials validation ---------------------------------------------------

var usernamePattern = regexp.MustCompile(`^[A-Za-z0-9_.-]{3,32}$`)

// validateCredentials enforces the sign-up rules. It returns a user-facing
// message when something is wrong, or "" when the credentials are acceptable.
func validateCredentials(username, password string) string {
	if !usernamePattern.MatchString(username) {
		return "Username must be 3-32 characters using only letters, numbers, '.', '_' or '-'"
	}
	if utf8.RuneCountInString(password) < 8 {
		return "Password must be at least 8 characters"
	}
	if len(password) > 72 { // bcrypt's hard limit is 72 bytes
		return "Password is too long (at most 72 bytes; non-Latin characters count as several)"
	}
	return ""
}

func hashPassword(password string) (string, error) {
	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(hashed), err
}

func checkPassword(hash, password string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

// --- Tokens -----------------------------------------------------------------------

// issueToken creates a signed JWT identifying the user.
func issueToken(userID primitive.ObjectID) (string, error) {
	now := time.Now()
	claims := jwt.RegisteredClaims{
		Subject:   userID.Hex(),
		IssuedAt:  jwt.NewNumericDate(now),
		ExpiresAt: jwt.NewNumericDate(now.Add(tokenLifetime)),
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(jwtSecret)
}

// parseToken verifies a JWT and returns the user ID it identifies.
func parseToken(tokenString string) (primitive.ObjectID, error) {
	claims := &jwt.RegisteredClaims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return jwtSecret, nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))
	if err != nil || !token.Valid {
		return primitive.NilObjectID, errors.New("invalid token")
	}
	return primitive.ObjectIDFromHex(claims.Subject)
}

// --- Brute-force throttling ---------------------------------------------------

// attemptLimiter is a small in-memory fixed-window counter: at most `limit`
// hits per key per `window`. Good enough to blunt online password guessing on
// a single-instance server; use a shared store if you run several replicas.
type attemptLimiter struct {
	mu        sync.Mutex
	hits      map[string][]time.Time
	limit     int
	window    time.Duration
	lastSweep time.Time
}

func newAttemptLimiter(limit int, window time.Duration) *attemptLimiter {
	return &attemptLimiter{hits: make(map[string][]time.Time), limit: limit, window: window, lastSweep: time.Now()}
}

// allow records an attempt for key and reports whether it is within the limit.
func (l *attemptLimiter) allow(key string) bool {
	now := time.Now()
	l.mu.Lock()
	defer l.mu.Unlock()

	// Periodically forget keys whose attempts have all expired.
	if now.Sub(l.lastSweep) > l.window {
		for k, times := range l.hits {
			if len(times) == 0 || now.Sub(times[len(times)-1]) > l.window {
				delete(l.hits, k)
			}
		}
		l.lastSweep = now
	}

	recent := l.hits[key][:0]
	for _, t := range l.hits[key] {
		if now.Sub(t) < l.window {
			recent = append(recent, t)
		}
	}
	if len(recent) >= l.limit {
		l.hits[key] = recent
		return false
	}
	l.hits[key] = append(recent, now)
	return true
}

// loginLimiter allows 10 sign-in attempts per minute per (client IP, username).
var loginLimiter = newAttemptLimiter(10, time.Minute)

// registerLimiter allows 5 account creations per minute per client IP.
var registerLimiter = newAttemptLimiter(5, time.Minute)

// clientIP returns the remote address without the port. It deliberately does
// not trust X-Forwarded-For; configure that at the proxy if you run one.
func clientIP(r *http.Request) string {
	if host, _, err := net.SplitHostPort(r.RemoteAddr); err == nil {
		return host
	}
	return r.RemoteAddr
}

// --- Middleware -----------------------------------------------------------------

type contextKey string

const userIDKey contextKey = "userID"

// requireAuth rejects requests without a valid "Authorization: Bearer <token>"
// header and otherwise stores the caller's user ID in the request context.
func requireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// The scheme name is case-insensitive per RFC 7235.
		scheme, token, found := strings.Cut(r.Header.Get("Authorization"), " ")
		if !found || !strings.EqualFold(scheme, "Bearer") {
			writeError(w, http.StatusUnauthorized, "Please sign in")
			return
		}
		userID, err := parseToken(strings.TrimSpace(token))
		if err != nil {
			writeError(w, http.StatusUnauthorized, "Your session is invalid or has expired. Please sign in again")
			return
		}
		next(w, r.WithContext(context.WithValue(r.Context(), userIDKey, userID)))
	}
}

// currentUserID returns the authenticated user's ID. Only valid inside
// handlers wrapped with requireAuth.
func currentUserID(r *http.Request) primitive.ObjectID {
	id, _ := r.Context().Value(userIDKey).(primitive.ObjectID)
	return id
}
