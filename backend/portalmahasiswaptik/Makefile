# Makefile for Portal Mahasiswa PTIK Backend

.PHONY: help build run dev test clean docker-build docker-run

# Default target
help:
	@echo "Portal Mahasiswa PTIK - Go Backend"
	@echo ""
	@echo "Usage:"
	@echo "  make build       - Build the application"
	@echo "  make run         - Build and run the application"
	@echo "  make dev         - Run with hot reload (requires air)"
	@echo "  make test        - Run tests"
	@echo "  make clean       - Clean build artifacts"
	@echo "  make docker-build - Build Docker image"
	@echo "  make docker-run   - Run Docker container"
	@echo "  make deps        - Download dependencies"
	@echo "  make tidy        - Tidy and verify dependencies"

# Build the application
build:
	@echo "Building..."
	go build -o bin/server cmd/server/main.go

# Run the application
run: build
	@echo "Running..."
	./bin/server

# Run with hot reload (requires: go install github.com/cosmtrek/air@latest)
dev:
	@echo "Running with hot reload..."
	air

# Run tests
test:
	@echo "Running tests..."
	go test -v ./...

# Clean build artifacts
clean:
	@echo "Cleaning..."
	rm -rf bin/
	go clean

# Download dependencies
deps:
	@echo "Downloading dependencies..."
	go mod download

# Tidy dependencies
tidy:
	@echo "Tidying dependencies..."
	go mod tidy
	go mod verify

# Build Docker image
docker-build:
	@echo "Building Docker image..."
	docker build -t portal-ptik-api:latest .

# Run Docker container
docker-run:
	@echo "Running Docker container..."
	docker run -p 8080:8080 --env-file .env portal-ptik-api:latest

# Run with specific port
run-port:
	@echo "Running on port $(PORT)..."
	PORT=$(PORT) ./bin/server

# Generate API documentation
docs:
	@echo "API documentation available at http://localhost:8080/api/docs"

# Check code style
lint:
	@echo "Linting..."
	golangci-lint run ./...

# Format code
fmt:
	@echo "Formatting..."
	go fmt ./...
