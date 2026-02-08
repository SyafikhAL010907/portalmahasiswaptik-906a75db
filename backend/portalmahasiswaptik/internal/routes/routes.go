package routes

import (
	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/handlers"
	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/middleware"
	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/models"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// SetupRoutes configures all API routes
func SetupRoutes(app *fiber.App, db *gorm.DB) {
	// Initialize handlers
	userHandler := handlers.NewUserHandler(db)
	financeHandler := handlers.NewFinanceHandler(db)
	attendanceHandler := handlers.NewAttendanceHandler(db)

	// API v1 group
	api := app.Group("/api")

	// Public routes (no auth required)
	api.Get("/config", userHandler.GetSupabaseConfig)

	// API documentation endpoint
	api.Get("/docs", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"name":    "Portal Mahasiswa PTIK API",
			"version": "1.0.0",
			"endpoints": fiber.Map{
				"auth": fiber.Map{
					"note": "Authentication is handled by Supabase Auth. Use Supabase JWT tokens.",
				},
				"users": fiber.Map{
					"GET /api/users":     "List users (Admin only)",
					"GET /api/users/:id": "Get user by ID",
					"POST /api/users":    "Create user (AdminDev only)",
					"PUT /api/users/:id": "Update user",
					"DELETE /api/users/:id": "Delete user (AdminDev only)",
					"GET /api/profile":   "Get current user profile",
					"GET /api/classes":   "List all classes",
				},
				"finance": fiber.Map{
					"GET /api/finance/summary":      "Get financial summary with chart data",
					"GET /api/finance/transactions": "List transactions with filters",
					"POST /api/finance/transaction": "Create transaction (Admin only)",
					"GET /api/finance/dues/summary": "Get dues collection summary",
				},
				"attendance": fiber.Map{
					"POST /api/attendance/session":              "Create QR session (Dosen only)",
					"POST /api/attendance/scan":                 "Scan QR code (Mahasiswa only)",
					"GET /api/attendance/sessions":              "List active sessions",
					"GET /api/attendance/records":               "List attendance records",
					"GET /api/attendance/subjects":              "List subjects by semester",
					"GET /api/attendance/meetings/:subjectId":   "List meetings for subject",
					"POST /api/attendance/session/:id/refresh":  "Refresh QR code",
					"POST /api/attendance/session/:id/deactivate": "Deactivate session",
				},
			},
		})
	})

	// Protected routes (require authentication)
	protected := api.Group("", middleware.AuthMiddleware(db))

	// ========================================
	// USER ROUTES
	// ========================================
	users := protected.Group("/users")
	
	// Get current user's profile
	protected.Get("/profile", userHandler.GetProfile)
	
	// List all classes (any authenticated user)
	protected.Get("/classes", userHandler.GetClasses)

	// List users (Admin only)
	users.Get("", middleware.RequireAdmin(), userHandler.GetUsers)
	
	// Get single user
	users.Get("/:id", userHandler.GetUserByID)
	
	// Create user (AdminDev only)
	users.Post("", middleware.RequireAdminDev(), userHandler.CreateUser)
	
	// Update user
	users.Put("/:id", userHandler.UpdateUser)
	
	// Delete user (AdminDev only)
	users.Delete("/:id", middleware.RequireAdminDev(), userHandler.DeleteUser)

	// ========================================
	// FINANCE ROUTES
	// ========================================
	finance := protected.Group("/finance")

	// Get financial summary with chart data
	finance.Get("/summary", financeHandler.GetFinanceSummary)
	
	// List transactions
	finance.Get("/transactions", financeHandler.GetTransactions)
	
	// Create transaction (Admin only)
	finance.Post("/transaction", 
		middleware.RequireAdmin(),
		middleware.ClassScopeMiddleware(),
		financeHandler.CreateTransaction,
	)
	
	// Get dues summary
	finance.Get("/dues/summary", financeHandler.GetWeeklyDuesSummary)

	// ========================================
	// ATTENDANCE ROUTES
	// ========================================
	attendance := protected.Group("/attendance")

	// Get subjects (any authenticated user)
	attendance.Get("/subjects", attendanceHandler.GetSubjects)
	
	// Get meetings for subject
	attendance.Get("/meetings/:subjectId", attendanceHandler.GetMeetings)

	// Create session (Lecturer only)
	attendance.Post("/session", 
		middleware.RequireLecturer(),
		attendanceHandler.CreateSession,
	)
	
	// Get active sessions
	attendance.Get("/sessions", attendanceHandler.GetActiveSessions)
	
	// Scan QR (Mahasiswa only)
	attendance.Post("/scan", 
		middleware.RequireRole(models.RoleAdminDev, models.RoleMahasiswa),
		attendanceHandler.ScanQR,
	)
	
	// Get attendance records
	attendance.Get("/records", attendanceHandler.GetAttendanceRecords)
	
	// Refresh session QR
	attendance.Post("/session/:id/refresh", 
		middleware.RequireLecturer(),
		attendanceHandler.RefreshSession,
	)
	
	// Deactivate session
	attendance.Post("/session/:id/deactivate", 
		middleware.RequireLecturer(),
		attendanceHandler.DeactivateSession,
	)

	// ========================================
	// EXPORT ROUTES (Future Implementation)
	// ========================================
	// export := protected.Group("/export")
	// export.Get("/finance/excel", financeHandler.ExportToExcel)
	// export.Get("/finance/pdf", financeHandler.ExportToPDF)
	// export.Get("/attendance/excel", attendanceHandler.ExportToExcel)
}
