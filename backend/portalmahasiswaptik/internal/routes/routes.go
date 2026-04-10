package routes

import (
	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/handlers"
	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/handlers/auth"
	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/handlers/repository"
	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/middleware"
	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/models"
	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/storage"
	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// SetupRoutes configures all API routes
func SetupRoutes(app *fiber.App, db *gorm.DB, storageSrv *storage.SupabaseStorage, validate *validator.Validate) {
	// Initialize handlers
	userHandler := handlers.NewUserHandler(db, validate)
	financeHandler := handlers.NewFinanceHandler(db, validate)
	attendanceHandler := handlers.NewAttendanceHandler(db, validate)
	automationHandler := handlers.NewAutomationHandler(db)
	repoHandler := repository.NewRepositoryHandler(db, storageSrv)
	configHandler := handlers.NewConfigHandler(db, validate)
	webauthnHandler, _ := auth.NewWebAuthnHandler(db)

	// API v1 group
	api := app.Group("/api")

	// ========================================
	// PUBLIC WEBAUTHN ROUTES (LOGIN)
	// ========================================
	// Penting: Definisi ini harus di atas 'protected' group agar tidak kena middleware auth
	waPublic := api.Group("/auth/webauthn")
	waPublic.Post("/login/begin", webauthnHandler.BeginLogin)
	waPublic.Post("/login/finish", webauthnHandler.FinishLogin)

	// Public config route
	api.Get("/config", userHandler.GetSupabaseConfig)

	// Automation Webhook (Secret/Supabase only)
	api.Post("/webhooks/automation", automationHandler.HandleSupabaseWebhook)

	// API documentation
	api.Get("/docs", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"name": "Portal Mahasiswa PTIK API", "version": "1.0.0"})
	})

	// ========================================
	// PROTECTED ROUTES
	// ========================================
	protected := api.Group("", middleware.AuthMiddleware(db))

	// Get current user's profile
	protected.Get("/profile", userHandler.GetProfile)
	protected.Get("/classes", userHandler.GetClasses)

	// User Management
	users := protected.Group("/users")
	users.Get("", middleware.RequireAdmin(), userHandler.GetUsers)
	users.Get("/:id", userHandler.GetUserByID)
	users.Post("", middleware.RequireAdminDev(), userHandler.CreateUser)
	users.Put("/:id", userHandler.UpdateUser)
	users.Delete("/:id", middleware.RequireAdminDev(), userHandler.DeleteUser)

	// Finance
	finance := protected.Group("/finance")
	finance.Get("/summary", financeHandler.GetFinanceSummary)
	finance.Get("/transactions", financeHandler.GetTransactions)
	finance.Get("/transactions/stats", financeHandler.GetTransactionStats)
	finance.Post("/transaction", middleware.RequireAdmin(), middleware.ClassScopeMiddleware(), financeHandler.CreateTransaction)
	finance.Get("/dues/summary", financeHandler.GetWeeklyDuesSummary)
	finance.Post("/dues/bulk", middleware.RequireAdminDev(), financeHandler.BulkUpdateDues)
	finance.Get("/dues/matrix", financeHandler.GetDuesMatrix)
	finance.Get("/export", financeHandler.ExportFinanceExcel)

	// Attendance
	attendance := protected.Group("/attendance")
	attendance.Get("/subjects", attendanceHandler.GetSubjects)
	attendance.Get("/meetings/:subjectId", attendanceHandler.GetMeetings)
	attendance.Post("/session", middleware.RequireLecturer(), attendanceHandler.CreateSession)
	attendance.Get("/sessions", attendanceHandler.GetActiveSessions)
	attendance.Post("/scan", middleware.RequireRole(models.RoleAdminDev, models.RoleMahasiswa, models.RoleAdminKelas), attendanceHandler.ScanQR)
	attendance.Get("/records", attendanceHandler.GetAttendanceRecords)
	attendance.Post("/session/:id/refresh", middleware.RequireLecturer(), attendanceHandler.RefreshSession)
	attendance.Post("/session/:id/deactivate", middleware.RequireLecturer(), attendanceHandler.DeactivateSession)

	// Repository
	repo := protected.Group("/repository")
	repo.Get("/semesters", repoHandler.GetSemesters)
	repo.Get("/files", repoHandler.GetFiles)
	repo.Post("/upload-drive", repoHandler.UploadToDrive)
	repo.Get("/download/:id", repoHandler.DownloadMaterial)

	// Export
	export := protected.Group("/export")
	export.Get("/finance/excel", financeHandler.ExportFinanceExcel)
	export.Get("/attendance/excel", attendanceHandler.ExportAttendanceExcel)
	export.Get("/attendance/master-excel", attendanceHandler.ExportMasterAttendanceExcel)

	// Global Config
	configGrp := protected.Group("/config")
	configGrp.Get("/billing-range", configHandler.GetBillingRange)
	configGrp.Post("/save-range", middleware.RequireAdmin(), configHandler.SaveBillingRange)

	// PROTECTED WEBAUTHN ROUTES (REGISTER & MANAGE)
	waProtected := protected.Group("/auth/webauthn")
	waProtected.Get("/register/begin", webauthnHandler.BeginRegistration)
	waProtected.Post("/register/finish", webauthnHandler.FinishRegistration)
	waProtected.Post("/verify/begin", webauthnHandler.BeginLogin)   // Support for re-auth (Satpam)
	waProtected.Post("/verify/finish", webauthnHandler.FinishLogin) // Support for re-auth (Satpam)
	waProtected.Get("/status", webauthnHandler.GetStatus)
	waProtected.Delete("/delete", webauthnHandler.DeleteCredential)
}
