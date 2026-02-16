package main

import (
	"log"
	"os"

	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/config"
	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/routes"
	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/storage"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	// Initialize database connection
	db, err := config.InitDatabase()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Ensure Storage Buckets exist (avatars, repository)
	config.InitStorageBucket(db)

	// Initialize Supabase Storage Service
	storageSrv := storage.NewSupabaseStorage()

	// Create Fiber app
	app := fiber.New(fiber.Config{
		AppName:      "Portal Mahasiswa PTIK API v1.0",
		ErrorHandler: customErrorHandler,
	})

	// Root Health Check
	app.Get("/", func(c *fiber.Ctx) error {
		return c.Status(200).SendString("Backend PTIK is Running!")
	})

	// Middleware
	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} - ${method} ${path} ${latency}\n",
	}))

	// CORS configuration
	allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
	if allowedOrigins == "" {
		allowedOrigins = "http://localhost:5173,http://127.0.0.1:5173"
	}

	app.Use(cors.New(cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowMethods:     "GET,POST,PUT,PATCH,DELETE,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization,X-Client-Info,apikey,X-Requested-With",
		AllowCredentials: true,
		ExposeHeaders:    "Content-Length",
		MaxAge:           86400,
	}))

	// Health check endpoint
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "healthy",
			"service": "Portal Mahasiswa PTIK API",
			"version": "1.0.0",
		})
	})

	// Setup routes
	routes.SetupRoutes(app, db, storageSrv)

	// Get port from environment
	port := os.Getenv("PORT")
	if port == "" {
		port = "9000"
	}

	// Start server
	log.Printf("🚀 Server starting on port %s", port)
	log.Printf("📡 Environment: %s", os.Getenv("APP_ENV"))
	log.Printf("📚 API Documentation: http://localhost:%s/api/docs", port)

	if err := app.Listen(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

// Custom error handler
func customErrorHandler(c *fiber.Ctx, err error) error {
	println("🔥 GLOBAL ERROR:", err.Error())
	code := fiber.StatusInternalServerError
	message := "Internal Server Error"

	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
		message = e.Message
	}

	return c.Status(code).JSON(fiber.Map{
		"success": false,
		"error":   message,
		"code":    code,
	})

}
