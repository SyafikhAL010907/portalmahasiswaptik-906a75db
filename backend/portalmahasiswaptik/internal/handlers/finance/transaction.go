package finance

import (
	"time"

	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/middleware"
	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/models"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// CreateTransactionRequest represents the request body
type CreateTransactionRequest struct {
	ClassID         uuid.UUID `json:"class_id" validate:"required"`
	Type            string    `json:"type" validate:"required,oneof=income expense"`
	Category        string    `json:"category" validate:"required"`
	Amount          float64   `json:"amount" validate:"required,gt=0"`
	Description     string    `json:"description"`
	ProofURL        string    `json:"proof_url"`
	TransactionDate string    `json:"transaction_date"`
}

// CreateTransaction creates a new financial transaction
// POST /api/finance/transaction
func (h *FinanceHandler) CreateTransaction(c *fiber.Ctx) error {
	user := c.Locals("user").(middleware.UserContext)

	// Only AdminDev and AdminKelas can create transactions
	if user.Role != models.RoleAdminDev && user.Role != models.RoleAdminKelas {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"error":   "Only administrators can create transactions",
		})
	}

	var req CreateTransactionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid request body",
		})
	}

	// Validate required fields
	if req.Type != "income" && req.Type != "expense" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Type must be 'income' or 'expense'",
		})
	}

	if req.Amount <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Amount must be greater than 0",
		})
	}

	// AdminKelas can only create transactions for their own class
	if user.Role == models.RoleAdminKelas {
		if user.ClassID == nil || *user.ClassID != req.ClassID {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"success": false,
				"error":   "You can only create transactions for your own class",
			})
		}
	}

	// Parse transaction date
	transactionDate := time.Now()
	if req.TransactionDate != "" {
		parsedDate, err := time.Parse("2006-01-02", req.TransactionDate)
		if err == nil {
			transactionDate = parsedDate
		}
	}

	// Create transaction
	transaction := models.Transaction{
		ClassID:         req.ClassID,
		CreatedBy:       user.UserID,
		Type:            req.Type,
		Category:        req.Category,
		Amount:          req.Amount,
		Description:     &req.Description,
		ProofURL:        &req.ProofURL,
		TransactionDate: transactionDate,
	}

	if err := h.DB.Create(&transaction).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to create transaction",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"data":    transaction,
		"message": "Transaction created successfully",
	})
}

// GetTransactions returns list of transactions with filters
// GET /api/finance/transactions
func (h *FinanceHandler) GetTransactions(c *fiber.Ctx) error {
	user := c.Locals("user").(middleware.UserContext)

	// Pagination
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 20)
	offset := (page - 1) * limit

	// Build query
	query := h.DB.Model(&models.Transaction{}).Preload("Class")

	// Filter by class for non-admin users
	if user.Role != models.RoleAdminDev && user.ClassID != nil {
		query = query.Where("class_id = ?", *user.ClassID)
	}

	// Optional filters
	if classID := c.Query("class_id"); classID != "" {
		query = query.Where("class_id = ?", classID)
	}
	if transactionType := c.Query("type"); transactionType != "" {
		query = query.Where("type = ?", transactionType)
	}
	if category := c.Query("category"); category != "" {
		query = query.Where("category = ?", category)
	}
	if startDate := c.Query("start_date"); startDate != "" {
		query = query.Where("transaction_date >= ?", startDate)
	}
	if endDate := c.Query("end_date"); endDate != "" {
		query = query.Where("transaction_date <= ?", endDate)
	}

	// Get total count
	var total int64
	query.Count(&total)

	// Get paginated results
	var transactions []models.Transaction
	query.Order("transaction_date DESC, created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&transactions)

	return c.JSON(fiber.Map{
		"success": true,
		"data":    transactions,
		"meta": fiber.Map{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}
