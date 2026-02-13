package handlers

import (
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

const PARENT_FOLDER_ID = "1b4bby3CRLAX9pL1QKD87HU0Os0slKaIi"

type AutomationHandler struct {
	DB *gorm.DB
}

func NewAutomationHandler(db *gorm.DB) *AutomationHandler {
	return &AutomationHandler{
		DB: db,
	}
}

type SupabaseWebhookPayload struct {
	Type   string                 `json:"type"`
	Table  string                 `json:"table"`
	Record map[string]interface{} `json:"record"`
}

// HandleSupabaseWebhook handles inserts for semesters and subjects (DEACTIVATED GOOGLE DRIVE)
// POST /api/webhooks/automation
func (h *AutomationHandler) HandleSupabaseWebhook(c *fiber.Ctx) error {
	/*
		// Google Drive Folder Creation Deactivated
		var payload SupabaseWebhookPayload
		if err := c.BodyParser(&payload); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "invalid payload"})
		}

		if payload.Type != "INSERT" {
			return c.SendStatus(200) // Only handle inserts
		}
		// ... logic removed ...
	*/

	return c.SendStatus(200)
}
