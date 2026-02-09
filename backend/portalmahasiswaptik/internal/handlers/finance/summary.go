package finance

import (
	"time"

	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/middleware"
	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/models"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

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

	// Get per-class breakdown
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
