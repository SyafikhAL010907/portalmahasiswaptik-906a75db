package handlers

import (
	"time"

	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/middleware"
	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/models"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type FinanceHandler struct {
	DB *gorm.DB
}

func NewFinanceHandler(db *gorm.DB) *FinanceHandler {
	return &FinanceHandler{DB: db}
}

// ChartDataPoint represents data formatted for Recharts
type ChartDataPoint struct {
	Name    string  `json:"name"`
	Income  float64 `json:"income"`
	Expense float64 `json:"expense"`
	Balance float64 `json:"balance"`
}

// ClassFinanceSummary represents per-class financial summary
type ClassFinanceSummary struct {
	ClassID     uuid.UUID `json:"class_id"`
	ClassName   string    `json:"class_name"`
	TotalIncome float64   `json:"total_income"`
	TotalExpense float64  `json:"total_expense"`
	Balance     float64   `json:"balance"`
}

// MonthlyData represents monthly breakdown
type MonthlyData struct {
	Month   string  `json:"month"`
	Income  float64 `json:"income"`
	Expense float64 `json:"expense"`
}

// FinanceSummaryResponse is the API response structure
type FinanceSummaryResponse struct {
	TotalIncome      float64             `json:"total_income"`
	TotalExpense     float64             `json:"total_expense"`
	Balance          float64             `json:"balance"`
	ClassBreakdown   []ClassFinanceSummary `json:"class_breakdown"`
	ChartData        []ChartDataPoint    `json:"chart_data"`
	MonthlyBreakdown []MonthlyData       `json:"monthly_breakdown"`
}

// GetFinanceSummary returns financial summary with chart data
// GET /api/finance/summary
func (h *FinanceHandler) GetFinanceSummary(c *fiber.Ctx) error {
	user := c.Locals("user").(middleware.UserContext)

	var classFilter string
	var args []interface{}

	// AdminDev sees all, others see only their class
	if user.Role != models.RoleAdminDev && user.ClassID != nil {
		classFilter = "class_id = ?"
		args = append(args, *user.ClassID)
	}

	// Get total income
	var totalIncome float64
	incomeQuery := h.DB.Model(&models.Transaction{}).Where("type = ?", "income")
	if classFilter != "" {
		incomeQuery = incomeQuery.Where(classFilter, args...)
	}
	incomeQuery.Select("COALESCE(SUM(amount), 0)").Scan(&totalIncome)

	// Get total expense
	var totalExpense float64
	expenseQuery := h.DB.Model(&models.Transaction{}).Where("type = ?", "expense")
	if classFilter != "" {
		expenseQuery = expenseQuery.Where(classFilter, args...)
	}
	expenseQuery.Select("COALESCE(SUM(amount), 0)").Scan(&totalExpense)

	// Get per-class breakdown (for Recharts bar/candlestick chart)
	var classBreakdown []ClassFinanceSummary
	classQuery := `
		SELECT 
			c.id as class_id,
			c.name as class_name,
			COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) as total_income,
			COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as total_expense,
			COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END), 0) as balance
		FROM classes c
		LEFT JOIN transactions t ON t.class_id = c.id
	`
	if classFilter != "" {
		classQuery += " WHERE c.id = ?"
		h.DB.Raw(classQuery+" GROUP BY c.id, c.name ORDER BY c.name", args...).Scan(&classBreakdown)
	} else {
		h.DB.Raw(classQuery + " GROUP BY c.id, c.name ORDER BY c.name").Scan(&classBreakdown)
	}

	// Convert to chart data format
	chartData := make([]ChartDataPoint, len(classBreakdown))
	for i, cb := range classBreakdown {
		chartData[i] = ChartDataPoint{
			Name:    cb.ClassName,
			Income:  cb.TotalIncome,
			Expense: cb.TotalExpense,
			Balance: cb.Balance,
		}
	}

	// Get monthly breakdown for the current year
	currentYear := time.Now().Year()
	var monthlyBreakdown []MonthlyData
	monthlyQuery := `
		SELECT 
			TO_CHAR(transaction_date, 'Mon') as month,
			COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
			COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
		FROM transactions
		WHERE EXTRACT(YEAR FROM transaction_date) = ?
	`
	if classFilter != "" {
		monthlyQuery += " AND " + classFilter
		h.DB.Raw(monthlyQuery+" GROUP BY TO_CHAR(transaction_date, 'Mon'), EXTRACT(MONTH FROM transaction_date) ORDER BY EXTRACT(MONTH FROM transaction_date)", currentYear, args[0]).Scan(&monthlyBreakdown)
	} else {
		h.DB.Raw(monthlyQuery+" GROUP BY TO_CHAR(transaction_date, 'Mon'), EXTRACT(MONTH FROM transaction_date) ORDER BY EXTRACT(MONTH FROM transaction_date)", currentYear).Scan(&monthlyBreakdown)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": FinanceSummaryResponse{
			TotalIncome:      totalIncome,
			TotalExpense:     totalExpense,
			Balance:          totalIncome - totalExpense,
			ClassBreakdown:   classBreakdown,
			ChartData:        chartData,
			MonthlyBreakdown: monthlyBreakdown,
		},
	})
}

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
			"page":       page,
			"limit":      limit,
			"total":      total,
			"total_pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// GetWeeklyDuesSummary returns dues collection status per class
// GET /api/finance/dues/summary
func (h *FinanceHandler) GetWeeklyDuesSummary(c *fiber.Ctx) error {
	user := c.Locals("user").(middleware.UserContext)

	type DuesSummary struct {
		ClassName   string  `json:"class_name"`
		TotalDues   int64   `json:"total_dues"`
		PaidDues    int64   `json:"paid_dues"`
		PendingDues int64   `json:"pending_dues"`
		UnpaidDues  int64   `json:"unpaid_dues"`
		TotalAmount float64 `json:"total_amount"`
		PaidAmount  float64 `json:"paid_amount"`
	}

	var summaries []DuesSummary

	query := `
		SELECT 
			c.name as class_name,
			COUNT(wd.id) as total_dues,
			COUNT(CASE WHEN wd.status = 'paid' THEN 1 END) as paid_dues,
			COUNT(CASE WHEN wd.status = 'pending' THEN 1 END) as pending_dues,
			COUNT(CASE WHEN wd.status = 'unpaid' THEN 1 END) as unpaid_dues,
			COALESCE(SUM(wd.amount), 0) as total_amount,
			COALESCE(SUM(CASE WHEN wd.status = 'paid' THEN wd.amount ELSE 0 END), 0) as paid_amount
		FROM classes c
		LEFT JOIN profiles p ON p.class_id = c.id
		LEFT JOIN weekly_dues wd ON wd.student_id = p.user_id
	`

	if user.Role != models.RoleAdminDev && user.ClassID != nil {
		query += " WHERE c.id = ?"
		h.DB.Raw(query+" GROUP BY c.id, c.name ORDER BY c.name", *user.ClassID).Scan(&summaries)
	} else {
		h.DB.Raw(query + " GROUP BY c.id, c.name ORDER BY c.name").Scan(&summaries)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    summaries,
	})
}
