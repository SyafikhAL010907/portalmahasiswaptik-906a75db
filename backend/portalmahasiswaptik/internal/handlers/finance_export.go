package handlers

import (
	"fmt"
	"strconv"
	"time"

	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/models"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/xuri/excelize/v2"
)

// ExportFinanceExcel generates the 13-sheet Finance report
// GET /api/finance/excel?class_id=...&year=...
func (h *FinanceHandler) ExportFinanceExcel(c *fiber.Ctx) error {
	classIDStr := c.Query("class_id")
	yearStr := c.Query("year")

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

	// 1. Fetch Class Info
	var class models.Class
	h.DB.First(&class, classID)

	// 2. Fetch Students sorted by NIM
	var students []models.Profile
	h.DB.Where("class_id = ?", classID).Order("nim ASC").Find(&students)

	// 3. Create Excel
	f := excelize.NewFile()
	defer f.Close()

	// Define Months
	months := []string{"JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"}

	// Delete default Sheet1 later, or rename it to LIFETIME
	f.SetSheetName("Sheet1", "LIFETIME")

	// --- SETUP STYLES ---
	headerStyle, _ := f.NewStyle(&excelize.Style{
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"1E293B"}, Pattern: 1},
		Font:      &excelize.Font{Bold: true, Color: "FFFFFF", Size: 12},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Border: []excelize.Border{
			{Type: "left", Color: "000000", Style: 1},
			{Type: "top", Color: "000000", Style: 1},
			{Type: "bottom", Color: "000000", Style: 1},
			{Type: "right", Color: "000000", Style: 1},
		},
	})

	paidStyle, _ := f.NewStyle(&excelize.Style{
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"D1FAE5"}, Pattern: 1},
		Font:      &excelize.Font{Color: "065F46", Bold: true},
		Alignment: &excelize.Alignment{Horizontal: "center"},
		Border:    []excelize.Border{{Type: "left", Color: "000000", Style: 1}, {Type: "top", Color: "000000", Style: 1}, {Type: "bottom", Color: "000000", Style: 1}, {Type: "right", Color: "000000", Style: 1}},
	})

	unpaidStyle, _ := f.NewStyle(&excelize.Style{
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"FEE2E2"}, Pattern: 1},
		Font:      &excelize.Font{Color: "991B1B", Bold: true},
		Alignment: &excelize.Alignment{Horizontal: "center"},
		Border:    []excelize.Border{{Type: "left", Color: "000000", Style: 1}, {Type: "top", Color: "000000", Style: 1}, {Type: "bottom", Color: "000000", Style: 1}, {Type: "right", Color: "000000", Style: 1}},
	})

	normalStyle, _ := f.NewStyle(&excelize.Style{
		Alignment: &excelize.Alignment{Horizontal: "center"},
		Border:    []excelize.Border{{Type: "left", Color: "000000", Style: 1}, {Type: "top", Color: "000000", Style: 1}, {Type: "bottom", Color: "000000", Style: 1}, {Type: "right", Color: "000000", Style: 1}},
	})

	summaryHeaderStyle, _ := f.NewStyle(&excelize.Style{
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"334155"}, Pattern: 1},
		Font:      &excelize.Font{Bold: true, Color: "FFFFFF"},
		Alignment: &excelize.Alignment{Horizontal: "center"},
	})

	// --- 1. LIFETIME SHEET ---
	sheet := "LIFETIME"

	// Aggregated Balance Calculations
	var totalIncome, totalExpense float64
	h.DB.Model(&models.Transaction{}).Where("class_id = ? AND type = 'income'", classID).Select("COALESCE(SUM(amount), 0)").Scan(&totalIncome)
	h.DB.Model(&models.Transaction{}).Where("class_id = ? AND type = 'expense'", classID).Select("COALESCE(SUM(amount), 0)").Scan(&totalExpense)
	balance := totalIncome - totalExpense

	// Header Info
	f.SetCellValue(sheet, "A1", "LAPORAN KAS PTIK UNJ - "+class.Name)
	f.MergeCell(sheet, "A1", "F1")
	f.SetCellStyle(sheet, "A1", "F1", headerStyle)

	// Summary Box
	f.SetCellValue(sheet, "A3", "Summary")
	f.SetCellValue(sheet, "B3", "Total Pemasukan")
	f.SetCellValue(sheet, "C3", "Total Pengeluaran")
	f.SetCellValue(sheet, "D3", "Saldo Akhir")
	f.SetCellStyle(sheet, "A3", "D3", summaryHeaderStyle)

	f.SetCellValue(sheet, "B4", totalIncome)
	f.SetCellValue(sheet, "C4", totalExpense)
	f.SetCellValue(sheet, "D4", balance)
	f.SetCellStyle(sheet, "A4", "D4", normalStyle)

	// Table Headers
	f.SetCellValue(sheet, "A6", "No")
	f.SetCellValue(sheet, "B6", "NIM")
	f.SetCellValue(sheet, "C6", "Nama Mahasiswa")
	f.SetCellValue(sheet, "D6", "Total Bayar")
	f.SetCellValue(sheet, "E6", "Tunggakan")
	f.SetCellValue(sheet, "F6", "Status")
	f.SetCellStyle(sheet, "A6", "F6", headerStyle)

	// Fill Data
	for i, s := range students {
		row := i + 7
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), i+1)
		f.SetCellValue(sheet, fmt.Sprintf("B%d", row), s.NIM)
		f.SetCellValue(sheet, fmt.Sprintf("C%d", row), s.FullName)

		// Fetch lifetime paid count
		var paidCount int64
		h.DB.Model(&models.WeeklyDue{}).Where("student_id = ? AND status = 'paid'", s.UserID).Count(&paidCount)
		paidAmount := float64(paidCount) * 5000

		// Status logic
		status := "LUNAS"
		statusStyle := paidStyle
		// If arrears (simplified check: assuming everyone should pay at least 1 week for now)
		if paidCount == 0 {
			status = "BELUM BAYAR"
			statusStyle = unpaidStyle
		}

		f.SetCellValue(sheet, fmt.Sprintf("D%d", row), paidAmount)
		f.SetCellValue(sheet, fmt.Sprintf("E%d", row), 0)
		f.SetCellValue(sheet, fmt.Sprintf("F%d", row), status)

		f.SetCellStyle(sheet, fmt.Sprintf("A%d", row), fmt.Sprintf("E%d", row), normalStyle)
		f.SetCellStyle(sheet, fmt.Sprintf("F%d", row), fmt.Sprintf("F%d", row), statusStyle)
	}
	f.SetColWidth(sheet, "C", "C", 35)
	f.SetColWidth(sheet, "B", "B", 15)

	// --- 2. MONTHLY SHEETS (12 Sheets) ---
	for mIdx, mName := range months {
		f.NewSheet(mName)
		f.SetCellValue(mName, "A1", "LAPORAN IURAN - "+mName+" "+strconv.Itoa(year))
		f.MergeCell(mName, "A1", "G1")
		f.SetCellStyle(mName, "A1", "G1", headerStyle)

		// Headers
		f.SetCellValue(mName, "A3", "No")
		f.SetCellValue(mName, "B3", "NIM")
		f.SetCellValue(mName, "C3", "Nama Mahasiswa")
		f.SetCellValue(mName, "D3", "W1")
		f.SetCellValue(mName, "E3", "W2")
		f.SetCellValue(mName, "F3", "W3")
		f.SetCellValue(mName, "G3", "W4")
		f.SetCellStyle(mName, "A3", "G3", headerStyle)

		// Fill Student Data
		for i, s := range students {
			row := i + 4
			f.SetCellValue(mName, fmt.Sprintf("A%d", row), i+1)
			f.SetCellValue(mName, fmt.Sprintf("B%d", row), s.NIM)
			f.SetCellValue(mName, fmt.Sprintf("C%d", row), s.FullName)

			var dues []models.WeeklyDue
			h.DB.Where("student_id = ? AND month = ? AND year = ?", s.UserID, mIdx+1, year).Find(&dues)

			duesMap := make(map[int]string)
			for _, d := range dues {
				duesMap[d.WeekNumber] = d.Status
			}

			cols := []string{"D", "E", "F", "G"}
			for w := 1; w <= 4; w++ {
				cell := fmt.Sprintf("%s%d", cols[w-1], row)
				status, ok := duesMap[w]
				if !ok {
					status = "unpaid"
				}

				switch status {
				case "paid":
					f.SetCellValue(mName, cell, "LUNAS")
					f.SetCellStyle(mName, cell, cell, paidStyle)
				case "pending":
					f.SetCellValue(mName, cell, "PENDING")
					f.SetCellStyle(mName, cell, cell, unpaidStyle)
				default:
					f.SetCellValue(mName, cell, "X")
					f.SetCellStyle(mName, cell, cell, normalStyle)
				}
			}
			f.SetCellStyle(mName, fmt.Sprintf("A%d", row), fmt.Sprintf("C%d", row), normalStyle)
		}
		f.SetColWidth(mName, "C", "C", 35)
		f.SetColWidth(mName, "B", "B", 15)
	}

	f.SetActiveSheet(0)
	filename := fmt.Sprintf("Laporan_Keuangan_%s_%d.xlsx", class.Name, year)
	c.Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))

	return f.Write(c.Response().BodyWriter())
}
