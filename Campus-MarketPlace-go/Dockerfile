# ---- build ----
FROM golang:1.23-alpine AS build
WORKDIR /src

# Cache dependencies separately from source so code edits don't re-download them.
COPY go.mod go.sum ./
RUN go mod download

COPY . .
# Static binary: no libc needed at runtime, so the final image stays tiny.
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/server .

# ---- run ----
FROM alpine:3.20
# ca-certificates is required for the TLS connection to MongoDB Atlas.
RUN apk add --no-cache ca-certificates \
    && adduser -D -u 10001 appuser
COPY --from=build /out/server /usr/local/bin/server
USER appuser

ENV PORT=8080
EXPOSE 8080
CMD ["server"]
