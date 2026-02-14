package handlers

import (
	"fmt"
	"math"
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
	ClassID      uuid.UUID `json:"class_id"`
	ClassName    string    `json:"class_name"`
	TotalIncome  float64   `json:"total_income"`
	TotalExpense float64   `json:"total_expense"`
	Balance      float64   `json:"balance"`
}

// MonthlyData represents monthly breakdown
type MonthlyData struct {
	Month   string  `json:"month"`
	Income  float64 `json:"income"`
	Expense float64 `json:"expense"`
}

// FinanceSummaryResponse is the API response structure
type FinanceSummaryResponse struct {
	TotalIncome      float64               `json:"total_income"`
	TotalExpense     float64               `json:"total_expense"`
	Balance          float64               `json:"balance"`
	ClassBreakdown   []ClassFinanceSummary `json:"class_breakdown"`
	ChartData        []ChartDataPoint      `json:"chart_data"`
	MonthlyBreakdown []MonthlyData         `json:"monthly_breakdown"`
}

// ✅ STRUKTUR BARU BUAT MATRIX
type MatrixStudentData struct {
	StudentName string   `json:"name"`
	StudentID   string   `json:"student_id"`
	Payments    []string `json:"payments"` // Array status: ["paid", "pending", "unpaid", "unpaid"]
}

// FormatRupiah formats a number to IDR currency string (e.g. "Rp 150.000", "-Rp 30.000")
func FormatRupiah(amount float64) string {
	negative := amount < 0
	if negative {
		amount = math.Abs(amount)
	}

	// Convert to string with no decimals
	s := fmt.Sprintf("%.0f", amount)

	// Insert dots
	var result []byte
	count := 0
	for i := len(s) - 1; i >= 0; i-- {
		count++
		result = append(result, s[i])
		if count == 3 && i > 0 {
			result = append(result, '.')
			count = 0
		}
	}

	// Reverse
	for i, j := 0, len(result)-1; i < j; i, j = i+1, j-1 {
		result[i], result[j] = result[j], result[i]
	}

	prefix := "Rp "
	if negative {
		prefix = "-Rp "
	}
	return prefix + string(result)
}

// GetPeriodStats calculates financial stats (Txs + Dues) for a specific scope
func (h *FinanceHandler) GetPeriodStats(classID *uuid.UUID, month, year int) (float64, float64, float64, float64) {
	// Setup Strict Date Filter
	var startDate, endDate time.Time
	var useDateFilter bool

	if month > 0 && year > 0 {
		useDateFilter = true
		startDate = time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.Local)
		endDate = startDate.AddDate(0, 1, 0).Add(-1 * time.Second)
	} else if year > 0 {
		useDateFilter = true
		startDate = time.Date(year, 1, 1, 0, 0, 0, 0, time.Local)
		endDate = time.Date(year, 12, 31, 23, 59, 59, 0, time.Local)
	} else {
		// Fallback for verification/all-time (should not happen in this flow)
		startDate = time.Date(2020, 1, 1, 0, 0, 0, 0, time.Local)
		endDate = time.Now().AddDate(1, 0, 0)
	}

	// 1. QUERY INCOME (Strict Separated WHERE)
	var inc float64
	qInc := h.DB.Table("transactions").Where("type = ?", "income")

	if classID != nil {
		qInc = qInc.Where("class_id = ?", *classID)
	}

	if useDateFilter {
		qInc = qInc.Where("transaction_date >= ? AND transaction_date <= ?", startDate, endDate)
	}
	qInc.Select("COALESCE(SUM(amount), 0)").Scan(&inc)

	// 2. QUERY EXPENSE (Strict Separated WHERE)
	var exp float64
	qExp := h.DB.Table("transactions").Where("type = ?", "expense")

	if classID != nil {
		qExp = qExp.Where("class_id = ?", *classID)
	}

	if useDateFilter {
		qExp = qExp.Where("transaction_date >= ? AND transaction_date <= ?", startDate, endDate)
	}
	qExp.Select("COALESCE(SUM(amount), 0)").Scan(&exp)

	// 3. QUERY DUES (Strict Independent)
	var dues float64
	qDues := h.DB.Table("weekly_dues").Where("status IN ?", []string{"paid", "lunas"})
	if classID != nil {
		qDues = qDues.Joins("JOIN profiles ON profiles.user_id = weekly_dues.student_id").Where("profiles.class_id = ?", *classID)
	}
	if month > 0 {
		qDues = qDues.Where("month = ?", month)
	}
	if year > 0 {
		qDues = qDues.Where("year = ?", year)
	}
	qDues.Select("COALESCE(SUM(amount), 0)").Scan(&dues)

	// 4. Balance
	balance := inc - exp + dues

	return inc, exp, dues, balance
}

// CalculateFinancialData returns global stats and class breakdown
// This helper is used by both Dashboard API and Excel Export
func (h *FinanceHandler) CalculateFinancialData(classFilter string, args []interface{}) (float64, float64, []ClassFinanceSummary) {
	// Reverted to simple wrapper or kept for legacy if needed,
	// but for the Export I will use GetPeriodStats.
	// Let's keep this for GetFinanceSummary to avoid breaking it too much in this turn
	// unless GetFinanceSummary needs Dues too?
	// The Dashboard "Saldo Kas Angkatan" (Card 2) DOES include Dues.
	// So GetFinanceSummary IS improperly calculating balance if it ignores Dues.

	// Let's UPDATE CalculateFinancialData to include Dues for `Balance`.

	// 1. Global Transactions
	var totalIncome float64
	incomeQuery := h.DB.Model(&models.Transaction{}).Where("type = ?", "income")
	if classFilter != "" {
		incomeQuery = incomeQuery.Where(classFilter, args...)
	}
	incomeQuery.Select("COALESCE(SUM(amount), 0)").Scan(&totalIncome)

	var totalExpense float64
	expenseQuery := h.DB.Model(&models.Transaction{}).Where("type = ?", "expense")
	if classFilter != "" {
		expenseQuery = expenseQuery.Where(classFilter, args...)
	}
	expenseQuery.Select("COALESCE(SUM(amount), 0)").Scan(&totalExpense)

	// 2. Global Dues
	var totalDues float64
	// If classFilter is present, we need to join.
	// CalculateFinancialData is usually called with classFilter="" for Global, or "class_id=?" for specific.
	duesQuery := h.DB.Table("weekly_dues").Where("status IN ?", []string{"paid", "lunas"})
	if classFilter != "" {
		// Assuming args[0] is classID
		duesQuery = duesQuery.Joins("JOIN profiles ON profiles.user_id = weekly_dues.student_id").Where("profiles."+classFilter, args...)
	}
	duesQuery.Select("COALESCE(SUM(weekly_dues.amount), 0)").Scan(&totalDues)

	// 3. Class Breakdown
	var classBreakdown []ClassFinanceSummary
	// This query needs to join dues too if we want Class Balance to be correct!
	// COMPLEX QUERY:
	// Sum Txs per Class
	// Sum Dues per Class (via Profiles)
	// Join them.

	// Simplified for now: Get Txs breakdown, then loop to add Dues?
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

	// Inject Dues into Breakdown
	for i := range classBreakdown {
		var cd float64
		h.DB.Table("weekly_dues").
			Joins("JOIN profiles ON profiles.user_id = weekly_dues.student_id").
			Where("profiles.class_id = ? AND weekly_dues.status IN ?", classBreakdown[i].ClassID, []string{"paid", "lunas"}).
			Select("COALESCE(SUM(weekly_dues.amount), 0)").Scan(&cd)
		classBreakdown[i].Balance += cd
	}

	return totalIncome, totalExpense, classBreakdown
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

	// ✅ REUSE LOGIC
	totalIncome, totalExpense, classBreakdown := h.CalculateFinancialData(classFilter, args)

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
	ClassID         *uuid.UUID `json:"class_id,omitempty"` // Optional: null = batch-wide
	Type            string     `json:"type" validate:"required,oneof=income expense"`
	Category        string     `json:"category" validate:"required"`
	Amount          float64    `json:"amount" validate:"required,gt=0"`
	Description     string     `json:"description"`
	ProofURL        string     `json:"proof_url"`
	TransactionDate string     `json:"transaction_date"`
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
		// If ClassID is provided, it must match admin's class
		if req.ClassID != nil {
			if user.ClassID == nil || *user.ClassID != *req.ClassID {
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
					"success": false,
					"error":   "You can only create transactions for your own class",
				})
			}
		}
		// If ClassID is null, batch-wide transaction is allowed
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

// GetTransactionStats returns aggregated financial statistics
// GET /api/finance/transactions/stats
func (h *FinanceHandler) GetTransactionStats(c *fiber.Ctx) error {
	// Build query
	query := h.DB.Model(&models.Transaction{})

	// Optional filters
	if classID := c.Query("class_id"); classID != "" {
		query = query.Where("class_id = ?", classID)
	}
	if month := c.Query("month"); month != "" && month != "0" {
		query = query.Where("EXTRACT(MONTH FROM transaction_date) = ?", month)
	}
	if year := c.Query("year"); year != "" {
		query = query.Where("EXTRACT(YEAR FROM transaction_date) = ?", year)
	}

	// Calculate totals
	var totalIncome, totalExpense float64

	// Get income
	query.Where("type = ?", "income").Select("COALESCE(SUM(amount), 0)").Scan(&totalIncome)

	// Reset query and get expense
	query = h.DB.Model(&models.Transaction{})
	if classID := c.Query("class_id"); classID != "" {
		query = query.Where("class_id = ?", classID)
	}
	if month := c.Query("month"); month != "" && month != "0" {
		query = query.Where("EXTRACT(MONTH FROM transaction_date) = ?", month)
	}
	if year := c.Query("year"); year != "" {
		query = query.Where("EXTRACT(YEAR FROM transaction_date) = ?", year)
	}
	query.Where("type = ?", "expense").Select("COALESCE(SUM(amount), 0)").Scan(&totalExpense)

	balance := totalIncome - totalExpense

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"total_income":  totalIncome,
			"total_expense": totalExpense,
			"balance":       balance,
		},
	})
}

// BulkUpdateDuesRequest represents the request for bulk updates
type BulkUpdateDuesRequest struct {
	StudentID    string `json:"student_id"`
	Month        int    `json:"month"`
	Year         int    `json:"year"`
	TargetStatus string `json:"target_status"` // 'paid', 'pending', 'reset'
}

// BulkUpdateDues updates validation status for all weeks in a month
// POST /api/finance/dues/bulk
func (h *FinanceHandler) BulkUpdateDues(c *fiber.Ctx) error {
	var req BulkUpdateDuesRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
	}

	studentID, err := uuid.Parse(req.StudentID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid student ID"})
	}

	// Logic
	if req.TargetStatus == "reset" {
		// Delete
		if err := h.DB.Where("student_id = ? AND month = ? AND year = ?", studentID, req.Month, req.Year).Delete(&models.WeeklyDue{}).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to reset dues"})
		}
	} else {
		// Upsert W1-W4
		for w := 1; w <= 4; w++ {
			due := models.WeeklyDue{
				StudentID:  studentID,
				WeekNumber: w,
				Month:      req.Month,
				Year:       req.Year,
				Amount:     5000,
				Status:     req.TargetStatus,
			}
			// Upsert
			if err := h.DB.Where(&models.WeeklyDue{StudentID: studentID, WeekNumber: w, Month: req.Month, Year: req.Year}).
				Assign(models.WeeklyDue{Status: req.TargetStatus, Amount: 5000}).
				FirstOrCreate(&due).Error; err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update due"})
			}
		}
	}

	return c.JSON(fiber.Map{"success": true})
}

// GetWeeklyDuesSummary returns summary of dues
// GET /api/finance/dues/summary
func (h *FinanceHandler) GetWeeklyDuesSummary(c *fiber.Ctx) error {
	// Basic implementation
	return c.JSON(fiber.Map{"message": "Not implemented yet"})
}

// GetDuesMatrix returns the dues matrix
// GET /api/finance/dues/matrix
func (h *FinanceHandler) GetDuesMatrix(c *fiber.Ctx) error {
	// Basic implementation
	return c.JSON(fiber.Map{"message": "Not implemented yet"})
}
