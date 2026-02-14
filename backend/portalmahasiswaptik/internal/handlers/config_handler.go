package handlers

import (
	"strconv"

	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/models"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type ConfigHandler struct {
	DB *gorm.DB
}

func NewConfigHandler(db *gorm.DB) *ConfigHandler {
	return &ConfigHandler{DB: db}
}

type BillingRangeResponse struct {
	StartMonth int `json:"start_month"`
	EndMonth   int `json:"end_month"`
}

type SaveBillingRangeRequest struct {
	StartMonth int `json:"start_month"`
	EndMonth   int `json:"end_month"`
}

// GetBillingRange handles GET /api/config/billing-range
func (h *ConfigHandler) GetBillingRange(c *fiber.Ctx) error {
	var configs []models.GlobalConfig

	// Fetch billing settings
	if err := h.DB.Where("key IN ?", []string{"billing_start_month", "billing_end_month"}).Find(&configs).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch configs"})
	}

	response := BillingRangeResponse{
		StartMonth: 1, // Default
		EndMonth:   6, // Default
	}

	for _, item := range configs {
		if val, err := strconv.Atoi(item.Value); err == nil {
			switch item.Key {
			case "billing_start_month":
				response.StartMonth = val
			case "billing_end_month":
				response.EndMonth = val
			}
		}
	}

	return c.JSON(response)
}

// SaveBillingRange handles POST /api/config/save-range
func (h *ConfigHandler) SaveBillingRange(c *fiber.Ctx) error {
	var req SaveBillingRangeRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Validate
	if req.StartMonth < 1 || req.StartMonth > 12 || req.EndMonth < 1 || req.EndMonth > 12 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Months must be between 1 and 12"})
	}

	if req.StartMonth > req.EndMonth {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Start month cannot be greater than end month"})
	}

	// Transaction to update both keys
	err := h.DB.Transaction(func(tx *gorm.DB) error {
		// Update start month
		startConfig := models.GlobalConfig{Key: "billing_start_month", Value: strconv.Itoa(req.StartMonth)}
		if err := tx.Save(&startConfig).Error; err != nil {
			return err
		}

		// Update end month
		endConfig := models.GlobalConfig{Key: "billing_end_month", Value: strconv.Itoa(req.EndMonth)}
		if err := tx.Save(&endConfig).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save configs"})
	}

	return c.JSON(fiber.Map{"status": "success", "message": "Billing range updated"})
}
