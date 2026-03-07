package handlers

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/middleware"
	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/models"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/xuri/excelize/v2"
)

func (h *FinanceHandler) ExportFinanceExcel(c *fiber.Ctx) error {
	classIDStr := c.Query("class_id")
	yearStr := c.Query("year")
	action := c.Query("action")

	if classIDStr == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "class_id required"})
	}
	classID, err := uuid.Parse(classIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid class_id"})
	}
	year, _ := strconv.Atoi(yearStr)
	if year == 0 {
		year = time.Now().Year()
	}

	user := c.Locals("user").(middleware.UserContext)

	// --- SECURITY & QUOTA ---
	if action == "download" && user.Role != models.RoleAdminDev {
		if user.ClassID == nil || *user.ClassID != classID {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Akses Ditolak: Hanya bisa download data kelas sendiri."})
		}
		// --- QUOTA CHECK (STRICT V12) ---
		var quota struct {
			Restricted bool      `json:"restricted"`
			ResetAt    time.Time `json:"reset_at"`
		}
		if err := h.DB.Raw("SELECT * FROM public.check_download_quota(?, ?, ?, ?)", 
			user.UserID, "finance", user.Role, classID).Scan(&quota).Error; err != nil {
			fmt.Printf("❌ Database Error (Finance Quota): %v\n", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Sistem Gagal Verifikasi Jatah Export. Silakan coba lagi nanti.",
			})
		}

		if quota.Restricted {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "Jatah download mingguan (2x/7hari) habis. Tunggu hingga jatah reset.",
			})
		}
		
		// --- LOG DOWNLOAD (STRICT V12) ---
		if err := h.DB.Exec("INSERT INTO public.download_logs (user_id, resource_id, download_type) VALUES (?, ?, ?)", 
			user.UserID, classID, "finance").Error; err != nil {
			fmt.Printf("❌ Critical Error (Finance Log): %v\n", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Gagal mencatat audit download. Proses dibatalkan demi keamanan.",
			})
		}
	}

	// --- 1. BULK DATA FETCHING ---
	var students []models.Profile
	h.DB.Where("class_id = ?", classID).Order("nim ASC").Find(&students)
	if len(students) == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Mahasiswa tidak ditemukan."})
	}

	sIDs := make([]uuid.UUID, len(students))
	for i, s := range students { sIDs[i] = s.UserID }

	var allDues []models.WeeklyDue
	h.DB.Where("student_id IN ? AND year = ?", sIDs, year).Find(&allDues)

	var allTxs []models.Transaction
	h.DB.Where("class_id = ? AND EXTRACT(YEAR FROM transaction_date) = ?", classID, year).Find(&allTxs)

	var cls models.Class
	h.DB.First(&cls, classID)

	// Global Stats (Optimized)
	var gInc, gExp, gDues float64
	h.DB.Table("transactions").Where("type = ? AND EXTRACT(YEAR FROM transaction_date) = ?", "income", year).Select("COALESCE(SUM(amount), 0)").Scan(&gInc)
	h.DB.Table("transactions").Where("type = ? AND EXTRACT(YEAR FROM transaction_date) = ?", "expense", year).Select("COALESCE(SUM(amount), 0)").Scan(&gExp)
	h.DB.Table("weekly_dues").Where("status IN ? AND year = ?", []string{"paid", "lunas"}, year).Select("COALESCE(SUM(amount), 0)").Scan(&gDues)

	// --- 2. IN-MEMORY AGGREGATION ---
	duesMap := make(map[uuid.UUID]map[int]map[int]string)
	type MonthSum struct { Inc, Exp, Due float64 }
	mStats := make(map[int]*MonthSum)
	for i:=1; i<=12; i++ { mStats[i] = &MonthSum{} }

	for _, d := range allDues {
		if duesMap[d.StudentID] == nil { duesMap[d.StudentID] = make(map[int]map[int]string) }
		if duesMap[d.StudentID][d.Month] == nil { duesMap[d.StudentID][d.Month] = make(map[int]string) }
		duesMap[d.StudentID][d.Month][d.WeekNumber] = d.Status
		if d.Status == "paid" || d.Status == "lunas" { mStats[d.Month].Due += d.Amount }
	}
	for _, t := range allTxs {
		m := int(t.TransactionDate.Month())
		if t.Type == "income" { mStats[m].Inc += t.Amount } else { mStats[m].Exp += t.Amount }
	}

	var cInc, cExp, cDue float64
	for _, ms := range mStats { cInc += ms.Inc; cExp += ms.Exp; cDue += ms.Due }

	// --- 3. EXCEL CONSTRUCTION ---
	f := excelize.NewFile()
	defer f.Close()

	// Styles
	navy, _ := f.NewStyle(&excelize.Style{Fill: excelize.Fill{Type: "pattern", Color: []string{"1E293B"}, Pattern: 1}, Font: &excelize.Font{Bold: true, Color: "FFFFFF"}, Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"}, Border: []excelize.Border{{Type: "left", Color: "000000", Style: 1}, {Type: "top", Color: "000000", Style: 1}, {Type: "bottom", Color: "000000", Style: 1}, {Type: "right", Color: "000000", Style: 1}}})
	norm, _ := f.NewStyle(&excelize.Style{Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"}, Border: []excelize.Border{{Type: "left", Color: "000000", Style: 1}, {Type: "top", Color: "000000", Style: 1}, {Type: "bottom", Color: "000000", Style: 1}, {Type: "right", Color: "000000", Style: 1}}})
	green, _ := f.NewStyle(&excelize.Style{Fill: excelize.Fill{Type: "pattern", Color: []string{"C6EFCE"}, Pattern: 1}, Font: &excelize.Font{Color: "006100", Bold: true}, Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"}, Border: []excelize.Border{{Type: "left", Color: "000000", Style: 1}, {Type: "top", Color: "000000", Style: 1}, {Type: "bottom", Color: "000000", Style: 1}, {Type: "right", Color: "000000", Style: 1}}})
	red, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Color: "FF0000", Bold: true}, Alignment: &excelize.Alignment{Horizontal: "center"}, Border: []excelize.Border{{Type: "left", Color: "000000", Style: 1}, {Type: "top", Color: "000000", Style: 1}, {Type: "bottom", Color: "000000", Style: 1}, {Type: "right", Color: "000000", Style: 1}}})

	// LIFETIME
	sheet := "LIFETIME"
	f.SetSheetName("Sheet1", sheet)
	f.SetCellValue(sheet, "A1", "LAPORAN KAS - "+cls.Name); f.MergeCell(sheet, "A1", "F1"); f.SetCellStyle(sheet, "A1", "F1", navy)
	f.SetCellValue(sheet, "A2", "Saldo Angkatan"); f.SetCellValue(sheet, "A3", FormatRupiah(gInc-gExp+gDues)); f.MergeCell(sheet, "A3", "F3"); f.SetCellStyle(sheet, "A3", "F3", norm)

	startM, _ := strconv.Atoi(c.Query("start_month")); if startM == 0 { startM = 1 }
	endM, _ := strconv.Atoi(c.Query("end_month")); if endM == 0 { endM = 6 }
	
	mNames := []string{"", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"}
	for i, h := range []string{"No", "NIM", "Nama", "Bulan", "Kurang", "Status"} {
		cell, _ := excelize.CoordinatesToCellName(i+1, 6)
		f.SetCellValue(sheet, cell, h); f.SetCellStyle(sheet, cell, cell, navy)
	}

	for i, s := range students {
		r := 7 + i; paidM := 0; debt := 0.0; var dStr []string
		for m := startM; m <= endM; m++ {
			pw := 0
			if mm, ok := duesMap[s.UserID][m]; ok {
				for w := 1; w <= 4; w++ { if st, ok := mm[w]; ok && (st=="paid"||st=="lunas"||st=="free"||st=="bebas") { pw++ } }
			}
			if pw >= 4 { paidM++ } else { debt += float64(4-pw)*5000; dStr = append(dStr, mNames[m]) }
		}
		f.SetCellValue(sheet, fmt.Sprintf("A%d", r), i+1); f.SetCellValue(sheet, fmt.Sprintf("B%d", r), s.NIM); f.SetCellValue(sheet, fmt.Sprintf("C%d", r), s.FullName); f.SetCellValue(sheet, fmt.Sprintf("D%d", r), fmt.Sprintf("%d Bln", paidM))
		f.SetCellValue(sheet, fmt.Sprintf("E%d", r), FormatRupiah(-debt)); f.SetCellValue(sheet, fmt.Sprintf("F%d", r), strings.Join(dStr, ", ")); f.SetCellStyle(sheet, fmt.Sprintf("A%d", r), fmt.Sprintf("F%d", r), norm)
		if debt == 0 { f.SetCellStyle(sheet, fmt.Sprintf("F%d", r), fmt.Sprintf("F%d", r), green) } else { f.SetCellStyle(sheet, fmt.Sprintf("E%d", r), fmt.Sprintf("F%d", r), red) }
	}

	// MONTHLY
	for m := 1; m <= 12; m++ {
		name := strings.ToUpper(mNames[m]); f.NewSheet(name)
		f.SetCellValue(name, "A1", name+" "+strconv.Itoa(year)); f.MergeCell(name, "A1", "G1"); f.SetCellStyle(name, "A1", "G1", navy)
		for i, h := range []string{"No", "NIM", "Nama", "W1", "W2", "W3", "W4"} {
			cell, _ := excelize.CoordinatesToCellName(i+1, 4)
			f.SetCellValue(name, cell, h); f.SetCellStyle(name, cell, cell, navy)
		}
		for i, s := range students {
			r := 5 + i; f.SetCellValue(name, fmt.Sprintf("A%d", r), i+1); f.SetCellValue(name, fmt.Sprintf("B%d", r), s.NIM); f.SetCellValue(name, fmt.Sprintf("C%d", r), s.FullName)
			for w := 1; w <= 4; w++ {
				col, _ := excelize.CoordinatesToCellName(3+w, r); st := "UNPAID"; if mm, ok := duesMap[s.UserID][m]; ok { if sst, ok := mm[w]; ok { st = strings.ToUpper(sst) } }
				f.SetCellValue(name, col, st); f.SetCellStyle(name, col, col, norm)
			}
		}
	}

	f.SetActiveSheet(0)
	c.Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=Laporan_%s_%d.xlsx", cls.Name, year))
	return f.Write(c.Response().BodyWriter())
}

