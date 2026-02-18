package main

import (
	"log"
	"os"
	"time"

	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/config"
	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/routes"
	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/storage"
	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/helmet"
	"github.com/gofiber/fiber/v2/middleware/limiter"
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

	// Enhanced Security Headers
	app.Use(helmet.New(helmet.Config{
		XSSProtection:         "1; mode=block",
		ContentTypeNosniff:    "nosniff",
		XFrameOptions:         "DENY",
		ReferrerPolicy:        "strict-origin-when-cross-origin",
		ContentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://owqjsqvpmsctztpgensg.supabase.co; connect-src 'self' https://owqjsqvpmsctztpgensg.supabase.co;",
	}))

	// Permissions Policy (Limit browser features)
	app.Use(func(c *fiber.Ctx) error {
		c.Set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()")
		return c.Next()
	})

	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} - ${method} ${path} ${latency}\n",
	}))

	// Rate Limiting (Brute Force Protection)
	app.Use(limiter.New(limiter.Config{
		Max:        100,
		Expiration: 15 * time.Minute,
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"success": false,
				"error":   "Too many requests. Please try again later.",
			})
		},
	}))

	app.Use(cors.New(cors.Config{
		// ✅ Strict CORS: Only allow production and local development origins
		AllowOrigins:     os.Getenv("ALLOWED_ORIGINS"),
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

	// Initialize validator
	validate := validator.New()

	// Setup routes
	routes.SetupRoutes(app, db, storageSrv, validate)

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

// Custom error handler (Secure in Production)
func customErrorHandler(c *fiber.Ctx, err error) error {
	// Log detail di server (internal)
	log.Printf("🔥 [SERVER ERROR] %s | Path: %s | Method: %s", err.Error(), c.Path(), c.Method())

	code := fiber.StatusInternalServerError
	message := "Internal Server Error"

	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
		message = e.Message
	}

	// Di produksi, jangan return error mentah/stack trace
	if os.Getenv("APP_ENV") == "production" && code == fiber.StatusInternalServerError {
		message = "Terjadi kesalahan pada sistem. Silakan coba lagi nanti."
	}

	return c.Status(code).JSON(fiber.Map{
		"success": false,
		"error":   message,
		"code":    code,
	})
}
