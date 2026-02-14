package handlers

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/models"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/xuri/excelize/v2"
)

// ExportFinanceExcel generates the Finance report
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

	// --- 1. PREPARE DATA ---

	// A. Students
	var students []models.Profile
	h.DB.Where("class_id = ?", classID).Order("nim ASC").Find(&students)

	// B. Class Name
	var cls models.Class
	h.DB.First(&cls, classID)
	className := cls.Name
	if className == "" {
		className = "Unknown Class"
	}

	// C. Transactions (Global & Class) - NEEDED FOR MONTHLY SHEETS DETAIL (Text List)
	var allTxs []models.Transaction
	h.DB.Find(&allTxs)

	// D. Dues - Fetch ALL for these students (For Matrix)
	var allDues []models.WeeklyDue
	studentIDs := make([]uuid.UUID, len(students))
	for i, s := range students {
		studentIDs[i] = s.UserID
	}
	if len(studentIDs) > 0 {
		h.DB.Where("student_id IN ?", studentIDs).Find(&allDues)
	}

	// --- EXCEL GENERATION ---
	f := excelize.NewFile()
	defer f.Close()

	// --- STYLES ---
	navyStyle, _ := f.NewStyle(&excelize.Style{
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"1E293B"}, Pattern: 1},
		Font:      &excelize.Font{Bold: true, Color: "FFFFFF", Size: 12},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center", WrapText: true},
		Border:    []excelize.Border{{Type: "left", Color: "000000", Style: 1}, {Type: "top", Color: "000000", Style: 1}, {Type: "bottom", Color: "000000", Style: 1}, {Type: "right", Color: "000000", Style: 1}},
	})
	normalStyle, _ := f.NewStyle(&excelize.Style{
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center", WrapText: true},
		Border:    []excelize.Border{{Type: "left", Color: "000000", Style: 1}, {Type: "top", Color: "000000", Style: 1}, {Type: "bottom", Color: "000000", Style: 1}, {Type: "right", Color: "000000", Style: 1}},
	})
	greenStyle, _ := f.NewStyle(&excelize.Style{
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"C6EFCE"}, Pattern: 1},
		Font:      &excelize.Font{Color: "006100", Bold: true},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center", WrapText: true},
		Border:    []excelize.Border{{Type: "left", Color: "000000", Style: 1}, {Type: "top", Color: "000000", Style: 1}, {Type: "bottom", Color: "000000", Style: 1}, {Type: "right", Color: "000000", Style: 1}},
	})
	// PENDING STYLE (Yellow/Orange)
	yellowStyle, _ := f.NewStyle(&excelize.Style{
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"FFEB9C"}, Pattern: 1},
		Font:      &excelize.Font{Color: "9C6500", Bold: true},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center", WrapText: true},
		Border:    []excelize.Border{{Type: "left", Color: "000000", Style: 1}, {Type: "top", Color: "000000", Style: 1}, {Type: "bottom", Color: "000000", Style: 1}, {Type: "right", Color: "000000", Style: 1}},
	})
	redBgStyle, _ := f.NewStyle(&excelize.Style{
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"FFC7CE"}, Pattern: 1},
		Font:      &excelize.Font{Color: "9C0006", Bold: true},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center", WrapText: true},
		Border:    []excelize.Border{{Type: "left", Color: "000000", Style: 1}, {Type: "top", Color: "000000", Style: 1}, {Type: "bottom", Color: "000000", Style: 1}, {Type: "right", Color: "000000", Style: 1}},
	})
	redTextStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Color: "FF0000", Bold: true},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center", WrapText: true},
		Border:    []excelize.Border{{Type: "left", Color: "000000", Style: 1}, {Type: "top", Color: "000000", Style: 1}, {Type: "bottom", Color: "000000", Style: 1}, {Type: "right", Color: "000000", Style: 1}},
	})
	boldLeftStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true},
		Alignment: &excelize.Alignment{Horizontal: "left", Vertical: "center"},
		Border:    []excelize.Border{{Type: "left", Color: "000000", Style: 1}, {Type: "top", Color: "000000", Style: 1}, {Type: "bottom", Color: "000000", Style: 1}, {Type: "right", Color: "000000", Style: 1}},
	})
	boldRightStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true},
		Alignment: &excelize.Alignment{Horizontal: "right", Vertical: "center"},
		Border:    []excelize.Border{{Type: "left", Color: "000000", Style: 1}, {Type: "top", Color: "000000", Style: 1}, {Type: "bottom", Color: "000000", Style: 1}, {Type: "right", Color: "000000", Style: 1}},
	})
	blueStyle, _ := f.NewStyle(&excelize.Style{
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"BDD7EE"}, Pattern: 1}, // Light Blue
		Font:      &excelize.Font{Color: "1F4E78", Bold: true},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center", WrapText: true},
		Border:    []excelize.Border{{Type: "left", Color: "000000", Style: 1}, {Type: "top", Color: "000000", Style: 1}, {Type: "bottom", Color: "000000", Style: 1}, {Type: "right", Color: "000000", Style: 1}},
	})

	emeraldStyle, _ := f.NewStyle(&excelize.Style{
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"D1FAE5"}, Pattern: 1}, // Light Emerald
		Font:      &excelize.Font{Color: "065F46", Bold: true, Size: 12},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center", WrapText: true},
		Border:    []excelize.Border{{Type: "left", Color: "000000", Style: 1}, {Type: "top", Color: "000000", Style: 1}, {Type: "bottom", Color: "000000", Style: 1}, {Type: "right", Color: "000000", Style: 1}},
	})
	titleStyle, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true, Size: 11}})

	monthNames := []string{"", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"}

	// ==========================================
	// 1. SHEET: LIFETIME
	// ==========================================

	// CALCULATE LIFETIME STATS (Year scope)
	// Global: We need Global Dues for Card 2
	_, _, gDues, gBal := h.GetPeriodStats(nil, 0, year)
	// Class Specific: We need Class Income for Card 3, Class Dues for Card 1
	cInc, _, cDues, cBal := h.GetPeriodStats(&classID, 0, year)

	sheet := "LIFETIME"
	f.SetSheetName("Sheet1", sheet)

	f.SetColWidth(sheet, "A", "A", 5)
	f.SetColWidth(sheet, "B", "B", 15)
	f.SetColWidth(sheet, "C", "C", 35)
	f.SetColWidth(sheet, "D", "F", 18)

	f.SetCellValue(sheet, "A1", fmt.Sprintf("LAPORAN KAS PTIK UNJ - %s", className))
	f.MergeCell(sheet, "A1", "F1")
	f.SetCellStyle(sheet, "A1", "F1", navyStyle)

	f.SetCellValue(sheet, "A2", "Total Saldo Bersih Angkatan (Aggregated)")
	f.MergeCell(sheet, "A2", "F2")
	f.SetCellStyle(sheet, "A2", "F2", emeraldStyle)

	f.SetCellValue(sheet, "A3", FormatRupiah(gBal))
	f.MergeCell(sheet, "A3", "F3")
	f.SetCellStyle(sheet, "A3", "F3", normalStyle)

	// Row 4: Summary Headers
	f.SetCellValue(sheet, "A4", fmt.Sprintf("Saldo Kelas %s", className))
	f.MergeCell(sheet, "A4", "B4")
	f.SetCellStyle(sheet, "A4", "B4", navyStyle)

	f.SetCellValue(sheet, "C4", "Total Kas Angkatan")
	f.SetCellStyle(sheet, "C4", "C4", navyStyle)

	f.SetCellValue(sheet, "D4", "Total Pemasukan Lain")
	f.MergeCell(sheet, "D4", "E4")
	f.SetCellStyle(sheet, "D4", "E4", navyStyle)

	f.SetCellValue(sheet, "F4", "Saldo Akhir")
	f.SetCellStyle(sheet, "F4", "F4", navyStyle)

	// Row 5: Summary Values
	f.SetCellValue(sheet, "A5", FormatRupiah(cDues)) // Saldo Kelas = Dues Only
	f.MergeCell(sheet, "A5", "B5")
	f.SetCellStyle(sheet, "A5", "B5", normalStyle)

	f.SetCellValue(sheet, "C5", FormatRupiah(gDues)) // Total Kas Angkatan = Global Dues Only
	f.SetCellStyle(sheet, "C5", "C5", normalStyle)

	f.SetCellValue(sheet, "D5", FormatRupiah(cInc)) // Total Pemasukan Lain = Class Specific Income Only
	f.MergeCell(sheet, "D5", "E5")
	f.SetCellStyle(sheet, "D5", "E5", normalStyle)

	f.SetCellValue(sheet, "F5", FormatRupiah(cBal)) // Saldo Akhir = Class Balance
	f.SetCellStyle(sheet, "F5", "F5", normalStyle)

	// Row 6: Table Headers
	headers := []string{"No", "NIM", "Nama Mahasiswa", "Total Bulan Update", "Total Nominal Kurang", "Status"}
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 6)
		f.SetCellValue(sheet, cell, h)
		f.SetCellStyle(sheet, cell, cell, navyStyle)
	}

	// Prepare Dues Map for students
	studentPaidDuesMap := make(map[uuid.UUID][]models.WeeklyDue)
	duesMap := make(map[uuid.UUID]map[int]map[int]map[int]string)

	for _, d := range allDues {
		// Populate map
		if duesMap[d.StudentID] == nil {
			duesMap[d.StudentID] = make(map[int]map[int]map[int]string)
		}
		if duesMap[d.StudentID][d.Year] == nil {
			duesMap[d.StudentID][d.Year] = make(map[int]map[int]string)
		}
		if duesMap[d.StudentID][d.Year][d.Month] == nil {
			duesMap[d.StudentID][d.Year][d.Month] = make(map[int]string)
		}
		duesMap[d.StudentID][d.Year][d.Month][d.WeekNumber] = d.Status

		if d.Status == "paid" || d.Status == "lunas" {
			studentPaidDuesMap[d.StudentID] = append(studentPaidDuesMap[d.StudentID], d)
		}
	}

	// Data Rows
	for i, s := range students {
		r := 6 + i + 1

		// AUTO-PILOT CALCULATION (Strict: March -> Current Month)
		currentMonth := int(time.Now().Month())
		startMonth := 3 // March

		// Map to check week status
		// monthlyGroups contains amounts and weeks count.
		// But we need to know if a week is 'paid' OR 'free'.
		// Re-structuring map to store status? Use duesMap directly.

		// Reset calculation
		totalNominal := 0.0
		fullMonths := 0
		var deficiencies []string
		deficiencyAmount := 0.0

		// Logic: Iterate Months (3 -> Current)
		if currentMonth >= startMonth {
			for m := startMonth; m <= currentMonth; m++ {
				// Calculate stats for this month
				paidWeeksCount := 0
				weekDeficiency := 0

				for w := 1; w <= 4; w++ {
					status := duesMap[s.UserID][year][m][w]
					switch status {
					case "paid", "lunas":
						paidWeeksCount++
						totalNominal += 5000 // Assume 5000
					case "free", "bebas":
						paidWeeksCount++
						// No amount added
					default:
						// Unpaid / Pending
						weekDeficiency++
					}
				}

				if paidWeeksCount >= 4 {
					fullMonths++
				}
				if weekDeficiency > 0 {
					mName := ""
					if m >= 1 && m <= 12 {
						mName = monthNames[m]
					}
					deficiencies = append(deficiencies, fmt.Sprintf("%s (-%d mg)", mName, weekDeficiency))
					deficiencyAmount += float64(weekDeficiency * 5000)
				}
			}
		}

		col6Val := ""
		col6Style := normalStyle
		col5Val := "-" + FormatRupiah(deficiencyAmount)
		col5Style := redTextStyle

		if deficiencyAmount == 0 {
			col5Val = FormatRupiah(0)
			col5Style = normalStyle
		} else {
			col5Val = FormatRupiah(-deficiencyAmount)
		}

		if len(deficiencies) > 0 {
			col6Val = strings.Join(deficiencies, " - ")
			col6Style = redTextStyle
		} else if totalNominal == 0 {
			col6Val = "Belum Bayar"
			col6Style = redBgStyle
		} else {
			col6Val = "✅ LUNAS"
			col6Style = greenStyle
		}

		f.SetCellValue(sheet, fmt.Sprintf("A%d", r), i+1)
		f.SetCellValue(sheet, fmt.Sprintf("B%d", r), s.NIM)
		f.SetCellValue(sheet, fmt.Sprintf("C%d", r), s.FullName)
		f.SetCellValue(sheet, fmt.Sprintf("D%d", r), fmt.Sprintf("%d Bulan", fullMonths))
		f.SetCellValue(sheet, fmt.Sprintf("E%d", r), col5Val)
		f.SetCellStyle(sheet, fmt.Sprintf("E%d", r), fmt.Sprintf("E%d", r), col5Style)
		f.SetCellValue(sheet, fmt.Sprintf("F%d", r), col6Val)
		f.SetCellStyle(sheet, fmt.Sprintf("F%d", r), fmt.Sprintf("F%d", r), col6Style)

		f.SetCellStyle(sheet, fmt.Sprintf("A%d", r), fmt.Sprintf("D%d", r), normalStyle)
	}

	// ==========================================
	// 2. SHEETS: MONTHLY
	// ==========================================
	months := []string{"JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"}

	for mIdx, mName := range months {
		f.NewSheet(mName)
		currMonth := mIdx + 1

		// CALCULATE MONTHLY STATS
		// Global Month Stats: We need mGlobalDues for Card 2
		_, _, mGlobalDues, _ := h.GetPeriodStats(nil, currMonth, year)
		// Class Month Stats: We need mClassInc, mClassDues, mClassBal
		mClassInc, _, mClassDues, mClassBal := h.GetPeriodStats(&classID, currMonth, year)

		f.SetColWidth(mName, "A", "A", 5)
		f.SetColWidth(mName, "B", "B", 15)
		f.SetColWidth(mName, "C", "C", 35)
		f.SetColWidth(mName, "D", "G", 18)

		f.SetCellValue(mName, "A1", fmt.Sprintf("LAPORAN IURAN - %s %d", mName, year))
		f.MergeCell(mName, "A1", "G1")
		f.SetCellStyle(mName, "A1", "G1", navyStyle)

		f.SetCellValue(mName, "A2", fmt.Sprintf("Saldo Kas %s", className))
		f.MergeCell(mName, "A2", "B2")
		f.SetCellStyle(mName, "A2", "B2", navyStyle)

		f.SetCellValue(mName, "C2", "Total Kas Angkatan")
		f.SetCellStyle(mName, "C2", "C2", navyStyle)

		f.SetCellValue(mName, "D2", "Hibah/Pemasukan")
		f.MergeCell(mName, "D2", "E2")
		f.SetCellStyle(mName, "D2", "E2", navyStyle)

		f.SetCellValue(mName, "F2", "Saldo Bersih")
		f.MergeCell(mName, "F2", "G2")
		f.SetCellStyle(mName, "F2", "G2", navyStyle)

		// Values
		f.SetCellValue(mName, "A3", FormatRupiah(mClassDues)) // Saldo Kas Class = Dues Only
		f.MergeCell(mName, "A3", "B3")
		f.SetCellStyle(mName, "A3", "B3", normalStyle)

		f.SetCellValue(mName, "C3", FormatRupiah(mGlobalDues)) // Total Kas Angkatan = Global Dues Only
		f.SetCellStyle(mName, "C3", "C3", normalStyle)

		f.SetCellValue(mName, "D3", FormatRupiah(mClassInc)) // Hibah = Class Specific Income
		f.MergeCell(mName, "D3", "E3")
		f.SetCellStyle(mName, "D3", "E3", normalStyle)

		f.SetCellValue(mName, "F3", FormatRupiah(mClassBal)) // Net Balance for class this month
		f.MergeCell(mName, "F3", "G3")
		f.SetCellStyle(mName, "F3", "G3", normalStyle)

		headersM := []string{"No", "NIM", "Nama Mahasiswa", "W1", "W2", "W3", "W4"}
		for i, h := range headersM {
			cell, _ := excelize.CoordinatesToCellName(i+1, 4)
			f.SetCellValue(mName, cell, h)
			f.SetCellStyle(mName, cell, cell, navyStyle)
		}

		lastRow := 4
		for i, s := range students {
			r := 4 + i + 1
			lastRow = r
			f.SetCellValue(mName, fmt.Sprintf("A%d", r), i+1)
			f.SetCellValue(mName, fmt.Sprintf("B%d", r), s.NIM)
			f.SetCellValue(mName, fmt.Sprintf("C%d", r), s.FullName)
			f.SetCellStyle(mName, fmt.Sprintf("A%d", r), fmt.Sprintf("C%d", r), normalStyle)

			for w := 1; w <= 4; w++ {
				colName, _ := excelize.CoordinatesToCellName(3+w, r)
				status := duesMap[s.UserID][year][currMonth][w]

				display := "BELUM BAYAR"
				style := redBgStyle

				switch status {
				case "paid", "lunas":
					display = "✅ LUNAS"
					style = greenStyle
				case "pending":
					display = "PENDING"
					style = yellowStyle
				case "free", "bebas":
					display = "BEBAS KAS"
					style = blueStyle
				}

				f.SetCellValue(mName, colName, display)
				f.SetCellStyle(mName, colName, colName, style)
			}
		}

		// RINGKASAN TRANSAKSI
		titleRow := lastRow + 2
		f.SetCellValue(mName, fmt.Sprintf("A%d", titleRow), "RINGKASAN TRANSAKSI")
		f.SetCellStyle(mName, fmt.Sprintf("A%d", titleRow), fmt.Sprintf("A%d", titleRow), titleStyle)

		headerRow := lastRow + 3
		f.SetCellValue(mName, fmt.Sprintf("A%d", headerRow), "Keterangan")
		f.MergeCell(mName, fmt.Sprintf("A%d", headerRow), fmt.Sprintf("C%d", headerRow))

		f.SetCellValue(mName, fmt.Sprintf("D%d", headerRow), "Tipe")
		f.SetCellValue(mName, fmt.Sprintf("E%d", headerRow), "Tanggal")

		f.SetCellValue(mName, fmt.Sprintf("F%d", headerRow), "Nominal")
		f.MergeCell(mName, fmt.Sprintf("F%d", headerRow), fmt.Sprintf("G%d", headerRow))
		f.SetCellStyle(mName, fmt.Sprintf("A%d", headerRow), fmt.Sprintf("G%d", headerRow), navyStyle)

		currentTxRow := headerRow + 1
		var txTotalIncome, txTotalExpense float64

		for _, t := range allTxs {
			if t.ClassID != nil && *t.ClassID == classID && t.TransactionDate.Month() == time.Month(currMonth) && t.TransactionDate.Year() == year {

				f.SetCellValue(mName, fmt.Sprintf("A%d", currentTxRow), getString(t.Description))
				f.MergeCell(mName, fmt.Sprintf("A%d", currentTxRow), fmt.Sprintf("C%d", currentTxRow))

				typeStr := "MASUK"
				if t.Type == "expense" {
					typeStr = "KELUAR"
					txTotalExpense += t.Amount
				} else {
					txTotalIncome += t.Amount
				}

				f.SetCellValue(mName, fmt.Sprintf("D%d", currentTxRow), typeStr)
				f.SetCellValue(mName, fmt.Sprintf("E%d", currentTxRow), t.TransactionDate.Format("2006-01-02"))

				f.SetCellValue(mName, fmt.Sprintf("F%d", currentTxRow), FormatRupiah(t.Amount))
				f.MergeCell(mName, fmt.Sprintf("F%d", currentTxRow), fmt.Sprintf("G%d", currentTxRow))

				f.SetCellStyle(mName, fmt.Sprintf("A%d", currentTxRow), fmt.Sprintf("G%d", currentTxRow), normalStyle)
				currentTxRow++
			}
		}

		recapStart := currentTxRow + 1

		f.SetCellValue(mName, fmt.Sprintf("A%d", recapStart), "TOTAL PEMASUKAN")
		f.MergeCell(mName, fmt.Sprintf("A%d", recapStart), fmt.Sprintf("E%d", recapStart))
		f.SetCellStyle(mName, fmt.Sprintf("A%d", recapStart), fmt.Sprintf("E%d", recapStart), boldLeftStyle)

		f.SetCellValue(mName, fmt.Sprintf("F%d", recapStart), FormatRupiah(txTotalIncome))
		f.MergeCell(mName, fmt.Sprintf("F%d", recapStart), fmt.Sprintf("G%d", recapStart))
		f.SetCellStyle(mName, fmt.Sprintf("F%d", recapStart), fmt.Sprintf("G%d", recapStart), boldRightStyle)

		recapExpense := recapStart + 1
		f.SetCellValue(mName, fmt.Sprintf("A%d", recapExpense), "TOTAL PENGELUARAN")
		f.MergeCell(mName, fmt.Sprintf("A%d", recapExpense), fmt.Sprintf("E%d", recapExpense))
		f.SetCellStyle(mName, fmt.Sprintf("A%d", recapExpense), fmt.Sprintf("E%d", recapExpense), boldLeftStyle)

		f.SetCellValue(mName, fmt.Sprintf("F%d", recapExpense), FormatRupiah(txTotalExpense))
		f.MergeCell(mName, fmt.Sprintf("F%d", recapExpense), fmt.Sprintf("G%d", recapExpense))
		f.SetCellStyle(mName, fmt.Sprintf("F%d", recapExpense), fmt.Sprintf("G%d", recapExpense), boldRightStyle)

		recapBalance := recapStart + 2
		txBalance := txTotalIncome - txTotalExpense
		f.SetCellValue(mName, fmt.Sprintf("A%d", recapBalance), "TOTAL SALDO")
		f.MergeCell(mName, fmt.Sprintf("A%d", recapBalance), fmt.Sprintf("E%d", recapBalance))
		f.SetCellStyle(mName, fmt.Sprintf("A%d", recapBalance), fmt.Sprintf("E%d", recapBalance), boldLeftStyle)

		f.SetCellValue(mName, fmt.Sprintf("F%d", recapBalance), FormatRupiah(txBalance))
		f.MergeCell(mName, fmt.Sprintf("F%d", recapBalance), fmt.Sprintf("G%d", recapBalance))
		f.SetCellStyle(mName, fmt.Sprintf("F%d", recapBalance), fmt.Sprintf("G%d", recapBalance), boldRightStyle)
	}

	f.SetActiveSheet(0)
	filename := fmt.Sprintf("Laporan_Keuangan_%s_%d.xlsx", className, year)
	c.Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))

	return f.Write(c.Response().BodyWriter())
}

func getString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
