package main

import (
	"log"
	"os"
	"strings"
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
	// Create Fiber app (Updated with larger buffer for Supabase Tokens)
	app := fiber.New(fiber.Config{
		AppName:      "Portal Mahasiswa PTIK API v1.0",
		ErrorHandler: customErrorHandler,
		// Tambahkan dua baris di bawah ini:
		ReadBufferSize: 16384,            // Naikin ke 16KB biar token gak mental (Error 431)
		BodyLimit:      20 * 1024 * 1024, // Izinkan kirim data sampai 20MB
	})

	// 🚀 FAST HEALTH CHECK (Place before heavy middleware/auth for Koyeb stability)
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.Status(200).JSON(fiber.Map{
			"status":  "healthy",
			"service": "Portal Mahasiswa PTIK API",
			"version": "1.0.0",
		})
	})

	app.Get("/", func(c *fiber.Ctx) error {
		return c.Status(200).SendString("Backend PTIK is Running!")
	})

	// 1. Recover Middleware (Crucial for stability)
	app.Use(recover.New())

	// 2. CORS Middleware (Must be early to handle OPTIONS correctly)
	// ✅ Advanced CORS: Allow dynamic origins from environment
	allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
	webauthnOrigin := os.Getenv("WEBAUTHN_ORIGIN")

	var origins []string
	if allowedOrigins != "" {
		origins = append(origins, strings.Split(allowedOrigins, ",")...)
	}
	if webauthnOrigin != "" {
		origins = append(origins, webauthnOrigin)
	}

	// Default origins if none provided
	if len(origins) == 0 {
		origins = []string{"http://localhost:5173", "https://portal-mahasiswa-ptik.vercel.app"}
	}

	// Clean up and unique origins
	originMap := make(map[string]bool)
	var finalOrigins []string
	for _, o := range origins {
		trimmed := strings.TrimSpace(o)
		if trimmed != "" && !originMap[trimmed] {
			originMap[trimmed] = true
			finalOrigins = append(finalOrigins, trimmed)
		}
	}

	app.Use(cors.New(cors.Config{
		AllowOrigins:     strings.Join(finalOrigins, ","),
		AllowMethods:     "GET,POST,PUT,PATCH,DELETE,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization,X-Client-Info,apikey,X-Requested-With,X-Download-Remaining",
		AllowCredentials: true,
		ExposeHeaders:    "Content-Length,Content-Disposition,X-Download-Remaining",
		MaxAge:           86400,
	}))

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

	if err := app.Listen("0.0.0.0:" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

// Custom error handler (Secure in Production)
func customErrorHandler(c *fiber.Ctx, err error) error {
	// Log detail di server (internal)
	log.Printf("🔥 [SERVER ERROR] %s | Path: %s | Method: %s", err.Error(), c.Path(), c.Method())

	// Default status code
	code := fiber.StatusInternalServerError
	message := "Internal Server Error"

	// Check if it's a Fiber error
	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
		message = e.Message
	}

	// Production safety: Don't leak technical details on 500s
	if os.Getenv("APP_ENV") == "production" && code == fiber.StatusInternalServerError {
		message = "Terjadi kesalahan pada sistem. Silakan coba lagi nanti."
	}

	// ALWAYS return JSON to prevent frontend breakdown (avoid Non-JSON response error)
	return c.Status(code).JSON(fiber.Map{
		"success": false,
		"error":   message,
		"code":    code,
	})
}
