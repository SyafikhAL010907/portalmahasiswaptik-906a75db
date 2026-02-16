package handlers

import (
	"strconv"

	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/middleware"
	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/models"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

type ConfigHandler struct {
	DB *gorm.DB
}

func NewConfigHandler(db *gorm.DB) *ConfigHandler {
	return &ConfigHandler{DB: db}
}

type BillingRangeResponse struct {
	StartMonth    int `json:"start_month"`
	EndMonth      int `json:"end_month"`
	SelectedMonth int `json:"selected_month"`
}

type SaveBillingRangeRequest struct {
	StartMonth    int `json:"start_month"`
	EndMonth      int `json:"end_month"`
	SelectedMonth int `json:"selected_month"`
}

// GetBillingRange handles GET /api/config/billing-range
func (h *ConfigHandler) GetBillingRange(c *fiber.Ctx) error {
	var configs []models.GlobalConfig

	// Fetch billing settings
	if err := h.DB.Where("key IN ?", []string{"billing_start_month", "billing_end_month", "billing_selected_month"}).Find(&configs).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch configs"})
	}

	response := BillingRangeResponse{
		StartMonth:    1, // Default
		EndMonth:      6, // Default
		SelectedMonth: 0, // Default (Lifetime)
	}

	for _, item := range configs {
		if val, err := strconv.Atoi(item.Value); err == nil {
			switch item.Key {
			case "billing_start_month":
				response.StartMonth = val
			case "billing_end_month":
				response.EndMonth = val
			case "billing_selected_month":
				response.SelectedMonth = val
			}
		}
	}

	return c.JSON(response)
}

// SaveBillingRange handles POST /api/config/save-range
// SaveBillingRange handles POST /api/config/save-range
func (h *ConfigHandler) SaveBillingRange(c *fiber.Ctx) error {
	println("📥 API CALL: SaveBillingRange")
	// 1. Strict Role Check (Double Security)
	userVal := c.Locals("user")
	var role string

	// Handle both possible types (JWT Token or UserContext struct) depending on middleware version
	if u, ok := userVal.(middleware.UserContext); ok {
		role = string(u.Role)
	} else if u, ok := userVal.(*jwt.Token); ok {
		claims := u.Claims.(jwt.MapClaims)
		role = claims["role"].(string)
	} else {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	// Allow admin_dev and admin_kelas
	if role != "admin_dev" && role != "admin_kelas" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Forbidden: Only Admin Dev or Class Admin can change billing settings"})
	}

	var req struct {
		StartMonth    int `json:"start_month"`
		EndMonth      int `json:"end_month"`
		SelectedMonth int `json:"selected_month"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Validate months
	if req.StartMonth < 1 || req.StartMonth > 12 || req.EndMonth < 1 || req.EndMonth > 12 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Billing months must be between 1 and 12"})
	}

	// SelectedMonth can be 0 (Lifetime) to 12
	if req.SelectedMonth < 0 || req.SelectedMonth > 12 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Selected month must be between 0 and 12"})
	}

	if req.StartMonth > req.EndMonth {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Start month cannot be greater than end month"})
	}

	// TRANSACTION START
	err := h.DB.Transaction(func(tx *gorm.DB) error {
		configs := []models.GlobalConfig{
			{Key: "billing_start_month", Value: strconv.Itoa(req.StartMonth)},
			{Key: "billing_end_month", Value: strconv.Itoa(req.EndMonth)},
			{Key: "billing_selected_month", Value: strconv.Itoa(req.SelectedMonth)},
		}

		for _, cfg := range configs {
			println("💾 Saving config:", cfg.Key, "=", cfg.Value)
			// Use more explicit Save to avoid column missing issues if possible
			// or just simple Exec for absolute certainty
			if err := tx.Exec(`
				INSERT INTO global_configs (key, value, updated_at)
				VALUES (?, ?, CURRENT_TIMESTAMP)
				ON CONFLICT (key) DO UPDATE SET 
					value = EXCLUDED.value,
					updated_at = EXCLUDED.updated_at
			`, cfg.Key, cfg.Value).Error; err != nil {
				println("❌ DB EXEC ERROR for", cfg.Key, ":", err.Error())
				return err
			}
		}
		return nil
	})

	if err != nil {
		println("❌ TRANSACTION FAILED (SaveBillingRange):", err.Error())
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Gagal menyimpan konfigurasi",
			"details": err.Error(),
		})
	}

	println("✅ TRANSACTION SUCCESS (SaveBillingRange)")
	return c.JSON(fiber.Map{
		"success": true,
		"message": "Konfigurasi berhasil disinkronkan ke database",
	})
}
