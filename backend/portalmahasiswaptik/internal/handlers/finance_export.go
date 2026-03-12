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
		// --- QUOTA CHECK (STRICT V12.1) ---
		var quota struct {
			Restricted bool      `json:"restricted"`
			ResetAt    time.Time `json:"reset_at"`
		}
		if err := h.DB.Raw("SELECT * FROM public.check_download_quota(?, ?, ?, ?)", 
			user.UserID, "finance", user.Role, classID.String()).Scan(&quota).Error; err != nil {
			fmt.Printf("❌ Database Error (Finance Quota): %v\n", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Sistem Gagal Verifikasi Jatah Export. Silakan coba lagi nanti.",
			})
		}

		if quota.Restricted {
			// STRICT: Return 403 Forbidden instead of 429
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Jatah download mingguan (2x/7hari) habis. Tunggu hingga jatah reset.",
			})
		}
		
		// --- LOG DOWNLOAD (STRICT V12.1 - MANDATORY) ---
		if err := h.DB.Exec("INSERT INTO public.download_logs (user_id, resource_id, download_type) VALUES (?, ?, ?)", 
			user.UserID, classID.String(), "finance").Error; err != nil {
			fmt.Printf("❌ Critical Error (Finance Log / Audit Failure): %v\n", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Gagal mencatat audit download. Proses dibatalkan demi keamanan jatah data.",
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
	blueStyle, _ := f.NewStyle(&excelize.Style{
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"BDD7EE"}, Pattern: 1},
		Font:      &excelize.Font{Color: "1F4E78", Bold: true},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center", WrapText: true},
		Border:    []excelize.Border{{Type: "left", Color: "000000", Style: 1}, {Type: "top", Color: "000000", Style: 1}, {Type: "bottom", Color: "000000", Style: 1}, {Type: "right", Color: "000000", Style: 1}},
	})
	emeraldStyle, _ := f.NewStyle(&excelize.Style{
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"D1FAE5"}, Pattern: 1},
		Font:      &excelize.Font{Color: "065F46", Bold: true, Size: 12},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center", WrapText: true},
		Border:    []excelize.Border{{Type: "left", Color: "000000", Style: 1}, {Type: "top", Color: "000000", Style: 1}, {Type: "bottom", Color: "000000", Style: 1}, {Type: "right", Color: "000000", Style: 1}},
	})

	monthNamesFull := []string{"", "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"}
	monthNamesShort := []string{"", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"}

	// ==========================================
	// 1. SHEET: LIFETIME
	// ==========================================
	// Precise Stats for Summary Board
	_, _, gDuesFinal, gBal := h.GetPeriodStats(nil, 0, year)
	cIncFinal, _, cDueFinal, cBalFinal := h.GetPeriodStats(&classID, 0, year)

	sheet := "LIFETIME"
	f.SetSheetName("Sheet1", sheet)
	f.SetColWidth(sheet, "A", "A", 5)
	f.SetColWidth(sheet, "B", "B", 15)
	f.SetColWidth(sheet, "C", "C", 35)
	f.SetColWidth(sheet, "D", "F", 18)

	f.SetCellValue(sheet, "A1", fmt.Sprintf("LAPORAN KAS PTIK UNJ - %s", cls.Name))
	f.MergeCell(sheet, "A1", "F1"); f.SetCellStyle(sheet, "A1", "F1", navyStyle)

	f.SetCellValue(sheet, "A2", "Total Saldo Bersih Angkatan (Aggregated)")
	f.MergeCell(sheet, "A2", "F2"); f.SetCellStyle(sheet, "A2", "F2", emeraldStyle)

	f.SetCellValue(sheet, "A3", FormatRupiah(gBal))
	f.MergeCell(sheet, "A3", "F3"); f.SetCellStyle(sheet, "A3", "F3", normalStyle)

	// Summary Board (Rows 4-5) - RECONSTRUCTED
	f.SetCellValue(sheet, "A4", fmt.Sprintf("Saldo Kelas %s", cls.Name)); f.MergeCell(sheet, "A4", "B4"); f.SetCellStyle(sheet, "A4", "B4", navyStyle)
	f.SetCellValue(sheet, "C4", "Total Kas Angkatan"); f.SetCellStyle(sheet, "C4", "C4", navyStyle)
	f.SetCellValue(sheet, "D4", "Total Pemasukan Lain"); f.MergeCell(sheet, "D4", "E4"); f.SetCellStyle(sheet, "D4", "E4", navyStyle)
	f.SetCellValue(sheet, "F4", "Saldo Akhir"); f.SetCellStyle(sheet, "F4", "F4", navyStyle)

	f.SetCellValue(sheet, "A5", FormatRupiah(cDueFinal)); f.MergeCell(sheet, "A5", "B5"); f.SetCellStyle(sheet, "A5", "B5", normalStyle)
	f.SetCellValue(sheet, "C5", FormatRupiah(gDuesFinal)); f.SetCellStyle(sheet, "C5", "C5", normalStyle)
	f.SetCellValue(sheet, "D5", FormatRupiah(cIncFinal)); f.MergeCell(sheet, "D5", "E5"); f.SetCellStyle(sheet, "D5", "E5", normalStyle)
	f.SetCellValue(sheet, "F5", FormatRupiah(cBalFinal)); f.SetCellStyle(sheet, "F5", "F5", normalStyle)

	// Table Headers (Row 6) - FORMALIZED
	headers := []string{"No", "NIM", "Nama Mahasiswa", "Total Bulan Update", "Total Nominal Kurang", "Status"}
	for i, head := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 6)
		f.SetCellValue(sheet, cell, head); f.SetCellStyle(sheet, cell, cell, navyStyle)
	}

	startM, _ := strconv.Atoi(c.Query("start_month")); if startM == 0 { startM = 1 }
	endM, _ := strconv.Atoi(c.Query("end_month")); if endM == 0 { endM = 6 }

	for i, s := range students {
		rowNum := 7 + i
		fullMonths := 0; deficiencyAmount := 0.0; var deficiencies []string

		for m := startM; m <= endM; m++ {
			paidWeeks := 0
			if mm, ok := duesMap[s.UserID][m]; ok {
				for w := 1; w <= 4; w++ { if st, ok := mm[w]; ok && (st=="paid"||st=="lunas"||st=="free"||st=="bebas") { paidWeeks++ } }
			}
			if paidWeeks >= 4 { fullMonths++ } else {
				missing := 4 - paidWeeks
				debt := float64(missing) * 5000
				deficiencies = append(deficiencies, fmt.Sprintf("%s %dmg", monthNamesShort[m], missing))
				deficiencyAmount += debt
			}
		}

		f.SetCellValue(sheet, fmt.Sprintf("A%d", rowNum), i+1)
		f.SetCellValue(sheet, fmt.Sprintf("B%d", rowNum), s.NIM)
		f.SetCellValue(sheet, fmt.Sprintf("C%d", rowNum), s.FullName)
		f.SetCellValue(sheet, fmt.Sprintf("D%d", rowNum), fmt.Sprintf("%d Bulan", fullMonths))

		col5Val := FormatRupiah(-deficiencyAmount); col5Style := redTextStyle
		if deficiencyAmount == 0 { col5Val = FormatRupiah(0); col5Style = normalStyle }
		f.SetCellValue(sheet, fmt.Sprintf("E%d", rowNum), col5Val); f.SetCellStyle(sheet, fmt.Sprintf("E%d", rowNum), fmt.Sprintf("E%d", rowNum), col5Style)

		col6Val := "✅ LUNAS"; col6Style := greenStyle
		if len(deficiencies) > 0 { col6Val = strings.Join(deficiencies, ", "); col6Style = redTextStyle }
		f.SetCellValue(sheet, fmt.Sprintf("F%d", rowNum), col6Val); f.SetCellStyle(sheet, fmt.Sprintf("F%d", rowNum), fmt.Sprintf("F%d", rowNum), col6Style)

		f.SetCellStyle(sheet, fmt.Sprintf("A%d", rowNum), fmt.Sprintf("D%d", rowNum), normalStyle)
	}

	// --- APPEND REKAP TRANSAKSI KAS ANGKATAN (LIFETIME ONLY) ---
	lastRow := 6 + len(students)
	rekapStartRow := lastRow + 3

	// Specific Styles for Rekap (Centered & Bold)
	rekapTitleStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 12},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
	})
	rekapHeaderStyle, _ := f.NewStyle(&excelize.Style{
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"E2E8F0"}, Pattern: 1}, // Slate header
		Font:      &excelize.Font{Bold: true},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Border:    []excelize.Border{{Type: "left", Color: "000000", Style: 1}, {Type: "top", Color: "000000", Style: 1}, {Type: "bottom", Color: "000000", Style: 1}, {Type: "right", Color: "000000", Style: 1}},
	})
	rekapDataStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Border:    []excelize.Border{{Type: "left", Color: "000000", Style: 1}, {Type: "top", Color: "000000", Style: 1}, {Type: "bottom", Color: "000000", Style: 1}, {Type: "right", Color: "000000", Style: 1}},
	})

	// Row 1: Title
	f.SetCellValue(sheet, fmt.Sprintf("D%d", rekapStartRow), "Daftar Transaksi Kas Angkatan")
	f.MergeCell(sheet, fmt.Sprintf("D%d", rekapStartRow), fmt.Sprintf("F%d", rekapStartRow))
	f.SetCellStyle(sheet, fmt.Sprintf("D%d", rekapStartRow), fmt.Sprintf("F%d", rekapStartRow), rekapTitleStyle)

	// Row 2: Headers
	f.SetCellValue(sheet, fmt.Sprintf("D%d", rekapStartRow+1), "Total Pemasukan")
	f.SetCellValue(sheet, fmt.Sprintf("E%d", rekapStartRow+1), "Total Pengeluaran")
	f.SetCellValue(sheet, fmt.Sprintf("F%d", rekapStartRow+1), "Saldo Akhir (Validasi)")
	f.SetCellStyle(sheet, fmt.Sprintf("D%d", rekapStartRow+1), fmt.Sprintf("F%d", rekapStartRow+1), rekapHeaderStyle)

	// Row 3: Data Values (Sinkron dengan gInc/gExp global untuk Lifetime)
	f.SetCellValue(sheet, fmt.Sprintf("D%d", rekapStartRow+2), FormatRupiah(gInc))
	f.SetCellValue(sheet, fmt.Sprintf("E%d", rekapStartRow+2), FormatRupiah(gExp))
	f.SetCellValue(sheet, fmt.Sprintf("F%d", rekapStartRow+2), FormatRupiah(gInc-gExp))
	f.SetCellStyle(sheet, fmt.Sprintf("D%d", rekapStartRow+2), fmt.Sprintf("F%d", rekapStartRow+2), rekapDataStyle)

	// ==========================================
	// 2. SHEETS: MONTHLY
	// ==========================================
	for m := 1; m <= 12; m++ {
		name := monthNamesFull[m]; f.NewSheet(name)
		
		// Monthly Dashboard (Rows 2-3) - RECONSTRUCTED
		_, _, mGDue, _ := h.GetPeriodStats(nil, m, year)
		mCInc, _, mCDue, mCBal := h.GetPeriodStats(&classID, m, year)

		f.SetColWidth(name, "A", "A", 5); f.SetColWidth(name, "B", "B", 15); f.SetColWidth(name, "C", "C", 35); f.SetColWidth(name, "D", "G", 18)

		f.SetCellValue(name, "A1", fmt.Sprintf("LAPORAN IURAN - %s %d", name, year))
		f.MergeCell(name, "A1", "G1"); f.SetCellStyle(name, "A1", "G1", navyStyle)

		f.SetCellValue(name, "A2", fmt.Sprintf("Saldo Kas %s", cls.Name)); f.MergeCell(name, "A2", "B2"); f.SetCellStyle(name, "A2", "B2", navyStyle)
		f.SetCellValue(name, "C2", "Total Kas Angkatan"); f.SetCellStyle(name, "C2", "C2", navyStyle)
		f.SetCellValue(name, "D2", "Hibah/Pemasukan"); f.MergeCell(name, "D2", "E2"); f.SetCellStyle(name, "D2", "E2", navyStyle)
		f.SetCellValue(name, "F2", "Saldo Bersih"); f.MergeCell(name, "F2", "G2"); f.SetCellStyle(name, "F2", "G2", navyStyle)

		f.SetCellValue(name, "A3", FormatRupiah(mCDue)); f.MergeCell(name, "A3", "B3"); f.SetCellStyle(name, "A3", "B3", normalStyle)
		f.SetCellValue(name, "C3", FormatRupiah(mGDue)); f.SetCellStyle(name, "C3", "C3", normalStyle)
		f.SetCellValue(name, "D3", FormatRupiah(mCInc)); f.MergeCell(name, "D3", "E3"); f.SetCellStyle(name, "D3", "E3", normalStyle)
		f.SetCellValue(name, "F3", FormatRupiah(mCBal)); f.MergeCell(name, "F3", "G3"); f.SetCellStyle(name, "F3", "G3", normalStyle)

		headersM := []string{"No", "NIM", "Nama Mahasiswa", "W1", "W2", "W3", "W4"}
		for i, head := range headersM {
			cell, _ := excelize.CoordinatesToCellName(i+1, 4)
			f.SetCellValue(name, cell, head); f.SetCellStyle(name, cell, cell, navyStyle)
		}

		for i, s := range students {
			r := 5 + i
			f.SetCellValue(name, fmt.Sprintf("A%d", r), i+1)
			f.SetCellValue(name, fmt.Sprintf("B%d", r), s.NIM)
			f.SetCellValue(name, fmt.Sprintf("C%d", r), s.FullName)
			f.SetCellStyle(name, fmt.Sprintf("A%d", r), fmt.Sprintf("C%d", r), normalStyle)

			for w := 1; w <= 4; w++ {
				col, _ := excelize.CoordinatesToCellName(3+w, r)
				display := "BELUM BAYAR"; style := redBgStyle
				
				if mm, ok := duesMap[s.UserID][m]; ok {
					if st, ok := mm[w]; ok {
						switch strings.ToLower(st) {
						case "paid", "lunas": display = "✅ LUNAS"; style = greenStyle
						case "free", "bebas": display = "BEBAS KAS"; style = blueStyle
						case "pending": display = "PENDING"; style = yellowStyle
						}
					}
				}
				f.SetCellValue(name, col, display); f.SetCellStyle(name, col, col, style)
			}
		}

		// RINGKASAN TRANSAKSI - RESTORED FROM COMMIT 36264ca
		lastRow := 5 + len(students)
		titleRow := lastRow + 2
		f.SetCellValue(name, fmt.Sprintf("A%d", titleRow), "RINGKASAN TRANSAKSI")
		
		headerRow := lastRow + 3
		headerLabels := []string{"Keterangan", "", "", "Tipe", "Tanggal", "Nominal", ""}
		for i, h := range headerLabels {
			if h != "" {
				cell, _ := excelize.CoordinatesToCellName(i+1, headerRow)
				f.SetCellValue(name, cell, h)
			}
		}
		f.MergeCell(name, fmt.Sprintf("A%d", headerRow), fmt.Sprintf("C%d", headerRow))
		f.MergeCell(name, fmt.Sprintf("F%d", headerRow), fmt.Sprintf("G%d", headerRow))
		f.SetCellStyle(name, fmt.Sprintf("A%d", headerRow), fmt.Sprintf("G%d", headerRow), navyStyle)

		currentTxRow := headerRow + 1
		var txTotalIncome, txTotalExpense float64

		for _, t := range allTxs {
			if t.ClassID != nil && *t.ClassID == classID && t.TransactionDate.Month() == time.Month(m) && t.TransactionDate.Year() == year {
				f.SetCellValue(name, fmt.Sprintf("A%d", currentTxRow), getString(t.Description))
				f.MergeCell(name, fmt.Sprintf("A%d", currentTxRow), fmt.Sprintf("C%d", currentTxRow))

				typeStr := "MASUK"
				if t.Type == "expense" {
					typeStr = "KELUAR"
					txTotalExpense += t.Amount
				} else {
					txTotalIncome += t.Amount
				}

				f.SetCellValue(name, fmt.Sprintf("D%d", currentTxRow), typeStr)
				f.SetCellValue(name, fmt.Sprintf("E%d", currentTxRow), t.TransactionDate.Format("2006-01-02"))
				f.SetCellValue(name, fmt.Sprintf("F%d", currentTxRow), FormatRupiah(t.Amount))
				f.MergeCell(name, fmt.Sprintf("F%d", currentTxRow), fmt.Sprintf("G%d", currentTxRow))
				f.SetCellStyle(name, fmt.Sprintf("A%d", currentTxRow), fmt.Sprintf("G%d", currentTxRow), normalStyle)
				currentTxRow++
			}
		}

		recapStart := currentTxRow + 1
		f.SetCellValue(name, fmt.Sprintf("A%d", recapStart), "TOTAL PEMASUKAN BULANAN (NON-IURAN)"); f.MergeCell(name, fmt.Sprintf("A%d", recapStart), fmt.Sprintf("E%d", recapStart))
		f.SetCellValue(name, fmt.Sprintf("F%d", recapStart), FormatRupiah(txTotalIncome)); f.MergeCell(name, fmt.Sprintf("F%d", recapStart), fmt.Sprintf("G%d", recapStart))

		recapExpense := recapStart + 1
		f.SetCellValue(name, fmt.Sprintf("A%d", recapExpense), "TOTAL PENGELUARAN BULANAN"); f.MergeCell(name, fmt.Sprintf("A%d", recapExpense), fmt.Sprintf("E%d", recapExpense))
		f.SetCellValue(name, fmt.Sprintf("F%d", recapExpense), FormatRupiah(txTotalExpense)); f.MergeCell(name, fmt.Sprintf("F%d", recapExpense), fmt.Sprintf("G%d", recapExpense))

		recapBalance := recapStart + 2
		f.SetCellValue(name, fmt.Sprintf("A%d", recapBalance), "TOTAL SALDO TRANSAKSI"); f.MergeCell(name, fmt.Sprintf("A%d", recapBalance), fmt.Sprintf("E%d", recapBalance))
		f.SetCellValue(name, fmt.Sprintf("F%d", recapBalance), FormatRupiah(txTotalIncome-txTotalExpense)); f.MergeCell(name, fmt.Sprintf("F%d", recapBalance), fmt.Sprintf("G%d", recapBalance))
		
		f.SetCellStyle(name, fmt.Sprintf("A%d", recapStart), fmt.Sprintf("G%d", recapBalance), normalStyle)
	}

	f.SetActiveSheet(0)
	c.Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=Laporan_%s_%d.xlsx", cls.Name, year))
	return f.Write(c.Response().BodyWriter())
}

func getString(s *string) string {
	if s == nil { return "" }
	return *s
}




