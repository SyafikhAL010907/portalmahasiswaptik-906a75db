package finance

import (
	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/models"
	"github.com/gofiber/fiber/v2"
)

type BalanceResponse struct {
	TotalIncome  float64 `json:"total_income"`
	TotalExpense float64 `json:"total_expense"`
	Balance      float64 `json:"balance"`
	DuesTotal    float64 `json:"dues_total"`
	ClassBalance float64 `json:"class_balance"` // Saldo Kas Kelas
	GrantTotal   float64 `json:"grant_total"`   // Dana Hibah
}

// GetBalance returns calculated finance balance
// GET /api/finance/balance?class_id=...
func (h *FinanceHandler) GetBalance(c *fiber.Ctx) error {
	classID := c.Query("class_id")

	// 1. Calculate Dues Total (ALL - Saldo Kas Angkatan)
	var duesTotal float64
	if err := h.DB.Model(&models.WeeklyDue{}).Where("status = ?", "paid").Select("COALESCE(SUM(amount), 0)").Scan(&duesTotal).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to sum dues"})
	}

	// 2. Calculate Class Balance (Saldo Kas Kelas - if classID provided)
	var classBalance float64
	if classID != "" {
		// Join weekly_dues -> profiles -> where class_id = ?
		h.DB.Table("weekly_dues").
			Joins("JOIN profiles ON weekly_dues.student_id = profiles.user_id").
			Where("weekly_dues.status = ? AND profiles.class_id = ?", "paid", classID).
			Select("COALESCE(SUM(weekly_dues.amount), 0)").
			Scan(&classBalance)
	}

	// 3. Calculate Grant Total (Dana Hibah - category='Hibah')
	var grantTotal float64
	// Assuming 'Hibah' is in category field of transactions. Note: Frontend says 'Dana Hibah/Lainnya' comes from manualSummary.total_income
	// In the original code manualSummary.total_income came from transactions type='income'.
	// So Grant Total = Total Income from transactions (excluding dues which are separate).
	// Let's stick to existing logic for manualSummary.total_income == Transaction Income.
	// But user asked for "Kotak 3: Dana Hibah (income category='hibah')".
	// Let's filter specifically for category='Hibah' (case insensitive if needed, or just 'Hibah').
	h.DB.Model(&models.Transaction{}).Where("type = ? AND category = ?", "income", "Hibah").Select("COALESCE(SUM(amount), 0)").Scan(&grantTotal)

	// 4. Calculate Total Income (Transactions type='income' - ALL)
	// This is for Kotak 4: "Total Pemasukan" -> In frontend this uses `REALTIME_TOTAL_INCOME` which is `manualSummary.total_income + duesTotal`.
	// So we return `totalTransactionIncome` as `TotalIncome` here to match frontend expectation.
	var totalTransactionIncome float64
	if err := h.DB.Model(&models.Transaction{}).Where("type = ?", "income").Select("COALESCE(SUM(amount), 0)").Scan(&totalTransactionIncome).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to calculate income"})
	}

	// 5. Calculate Total Expense (Transactions type='expense')
	var totalExpense float64
	if err := h.DB.Model(&models.Transaction{}).Where("type = ?", "expense").Select("COALESCE(SUM(amount), 0)").Scan(&totalExpense).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to calculate expense"})
	}

	// 6. Calculate Final Balance
	// Balance = (Dues + Transaction Income) - Expense
	realtimeTotalIncome := totalTransactionIncome + duesTotal
	balance := realtimeTotalIncome - totalExpense

	return c.JSON(BalanceResponse{
		TotalIncome:  totalTransactionIncome, // "Dana Hibah/Lainnya" (Non-Dues Income)
		TotalExpense: totalExpense,
		Balance:      balance,
		DuesTotal:    duesTotal,    // "Saldo Kas Angkatan" (Dues Only)
		ClassBalance: classBalance, // "Saldo Kas Kelas"
		GrantTotal:   grantTotal,   // "Dana Hibah" (Specific category)
	})
}
