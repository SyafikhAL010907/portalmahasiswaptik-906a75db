package finance

import (
	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/middleware"
	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/models"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// MatrixStudentData represents student dues matrix
type MatrixStudentData struct {
	StudentName string   `json:"name"`
	StudentID   string   `json:"student_id"`
	Payments    []string `json:"payments"` // Array status: ["paid", "pending", "unpaid", "unpaid"]
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

// GetDuesMatrix returns the matrix of student dues
// GET /api/finance/dues/matrix?class_id=...
func (h *FinanceHandler) GetDuesMatrix(c *fiber.Ctx) error {
	classID := c.Query("class_id")
	if classID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "class_id required"})
	}

	// 1. Fetch all students for the class
	type StudentResult struct {
		UserID   uuid.UUID `json:"user_id"`
		FullName string    `json:"full_name"`
	}

	var students []StudentResult
	if err := h.DB.Raw("SELECT user_id, full_name FROM profiles WHERE class_id = ? ORDER BY full_name ASC", classID).Scan(&students).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch students"})
	}

	// 2. Fetch all dues for these students (bulk fetch)
	var studentIDs []uuid.UUID
	for _, s := range students {
		studentIDs = append(studentIDs, s.UserID)
	}

	type DuesResult struct {
		StudentID  uuid.UUID `json:"student_id"`
		WeekNumber int       `json:"week_number"`
		Status     string    `json:"status"`
	}
	var allDues []DuesResult

	if len(studentIDs) > 0 {
		h.DB.Table("weekly_dues").
			Where("student_id IN ?", studentIDs).
			Order("week_number ASC").
			Find(&allDues)
	}

	// 3. Map dues to students
	duesMap := make(map[uuid.UUID]map[int]string)
	for _, d := range allDues {
		if duesMap[d.StudentID] == nil {
			duesMap[d.StudentID] = make(map[int]string)
		}
		duesMap[d.StudentID][d.WeekNumber] = d.Status
	}

	// 4. Construct Response
	matrixData := make([]MatrixStudentData, 0)
	for _, s := range students {
		paymentStatuses := []string{"unpaid", "unpaid", "unpaid", "unpaid"} // Default 4 weeks

		if studentDues, ok := duesMap[s.UserID]; ok {
			for i := 1; i <= 4; i++ {
				if status, exists := studentDues[i]; exists {
					paymentStatuses[i-1] = status
				}
			}
		}

		matrixData = append(matrixData, MatrixStudentData{
			StudentName: s.FullName,
			StudentID:   s.UserID.String(),
			Payments:    paymentStatuses,
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    matrixData,
	})
}
