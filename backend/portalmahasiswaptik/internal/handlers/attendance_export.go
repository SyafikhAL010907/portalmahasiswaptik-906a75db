package handlers

import (
	"fmt"

	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/models"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/xuri/excelize/v2"
)

// ExportAttendanceExcel generates a professional attendance report
// GET /api/attendance/excel?session_id=...
func (h *AttendanceHandler) ExportAttendanceExcel(c *fiber.Ctx) error {
	sessionIDStr := c.Query("session_id")

	if sessionIDStr == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "session_id required"})
	}

	sessionID, err := uuid.Parse(sessionIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid session_id"})
	}

	// 1. Fetch Session Info
	var session models.AttendanceSession
	if err := h.DB.Preload("Class").Preload("Meeting.Subject").Where("id = ?", sessionID).First(&session).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Session not found"})
	}

	// 2. Fetch Students sorted by NIM
	var students []models.Profile
	h.DB.Where("class_id = ?", session.ClassID).Order("nim ASC").Find(&students)

	// 3. Fetch Records
	var records []models.AttendanceRecord
	h.DB.Where("session_id = ?", sessionID).Find(&records)

	recordMap := make(map[uuid.UUID]models.AttendanceRecord)
	for _, r := range records {
		recordMap[r.StudentID] = r
	}

	// 4. Create Excel
	f := excelize.NewFile()
	defer f.Close()

	sheet := "Attendance"
	f.SetSheetName("Sheet1", sheet)

	// --- SETUP STYLES ---
	headerStyle, _ := f.NewStyle(&excelize.Style{
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"1E293B"}, Pattern: 1},
		Font:      &excelize.Font{Bold: true, Color: "FFFFFF", Size: 12},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Border:    []excelize.Border{{Type: "left", Color: "000000", Style: 1}, {Type: "top", Color: "000000", Style: 1}, {Type: "bottom", Color: "000000", Style: 1}, {Type: "right", Color: "000000", Style: 1}},
	})

	metaLabelStyle, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true}})

	presentStyle, _ := f.NewStyle(&excelize.Style{
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"C6EFCE"}, Pattern: 1},
		Font:      &excelize.Font{Color: "006100"},
		Alignment: &excelize.Alignment{Horizontal: "center"},
		Border:    []excelize.Border{{Type: "left", Color: "000000", Style: 1}, {Type: "top", Color: "000000", Style: 1}, {Type: "bottom", Color: "000000", Style: 1}, {Type: "right", Color: "000000", Style: 1}},
	})

	absentStyle, _ := f.NewStyle(&excelize.Style{
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"FFC7CE"}, Pattern: 1},
		Font:      &excelize.Font{Color: "9C0006"},
		Alignment: &excelize.Alignment{Horizontal: "center"},
		Border:    []excelize.Border{{Type: "left", Color: "000000", Style: 1}, {Type: "top", Color: "000000", Style: 1}, {Type: "bottom", Color: "000000", Style: 1}, {Type: "right", Color: "000000", Style: 1}},
	})

	normalStyle, _ := f.NewStyle(&excelize.Style{
		Alignment: &excelize.Alignment{Horizontal: "center"},
		Border:    []excelize.Border{{Type: "left", Color: "000000", Style: 1}, {Type: "top", Color: "000000", Style: 1}, {Type: "bottom", Color: "000000", Style: 1}, {Type: "right", Color: "000000", Style: 1}},
	})

	// --- HEADERS ---
	f.SetCellValue(sheet, "A1", "LAPORAN PRESENSI MAHASISWA")
	f.MergeCell(sheet, "A1", "F1")
	f.SetCellStyle(sheet, "A1", "F1", headerStyle)

	f.SetCellValue(sheet, "A3", "Mata Kuliah:")
	f.SetCellValue(sheet, "B3", session.Meeting.Subject.Name)
	f.SetCellStyle(sheet, "A3", "A3", metaLabelStyle)

	f.SetCellValue(sheet, "A4", "Kelas:")
	f.SetCellValue(sheet, "B4", session.Class.Name)
	f.SetCellStyle(sheet, "A4", "A4", metaLabelStyle)

	f.SetCellValue(sheet, "A5", "Pertemuan:")
	f.SetCellValue(sheet, "B5", session.Meeting.MeetingNumber)
	f.SetCellStyle(sheet, "A5", "A5", metaLabelStyle)

	// Table Headers
	f.SetCellValue(sheet, "A7", "No")
	f.SetCellValue(sheet, "B7", "NIM")
	f.SetCellValue(sheet, "C7", "Nama Mahasiswa")
	f.SetCellValue(sheet, "D7", "Status")
	f.SetCellValue(sheet, "E7", "Metode")
	f.SetCellValue(sheet, "F7", "Waktu Scan")
	f.SetCellStyle(sheet, "A7", "F7", headerStyle)

	// --- DATA ---
	for i, s := range students {
		row := i + 8
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), i+1)
		f.SetCellValue(sheet, fmt.Sprintf("B%d", row), s.NIM)
		f.SetCellValue(sheet, fmt.Sprintf("C%d", row), s.FullName)

		record, ok := recordMap[s.UserID]
		status := "PENDING"
		style := normalStyle
		method := "-"
		scanTime := "-"

		if ok {
			status = record.Status
			method = fmt.Sprintf("%v", record.Method)
			if method == "" {
				method = "manual"
			}
			scanTime = record.ScannedAt.Format("15:04:05")

			switch status {
			case "present":
				style = presentStyle
				status = "HADIR"
			case "absent":
				style = absentStyle
				status = "ALPHA"
			}
		}

		f.SetCellValue(sheet, fmt.Sprintf("D%d", row), status)
		f.SetCellValue(sheet, fmt.Sprintf("E%d", row), method)
		f.SetCellValue(sheet, fmt.Sprintf("F%d", row), scanTime)

		f.SetCellStyle(sheet, fmt.Sprintf("A%d", row), fmt.Sprintf("C%d", row), normalStyle)
		f.SetCellStyle(sheet, fmt.Sprintf("D%d", row), fmt.Sprintf("D%d", row), style)
		f.SetCellStyle(sheet, fmt.Sprintf("E%d", row), fmt.Sprintf("F%d", row), normalStyle)
	}

	f.SetColWidth(sheet, "C", "C", 35)
	f.SetColWidth(sheet, "B", "B", 15)
	f.SetColWidth(sheet, "F", "F", 15)

	filename := fmt.Sprintf("Absensi_%s_%s_P%d.xlsx", session.Meeting.Subject.Name, session.Class.Name, session.Meeting.MeetingNumber)
	c.Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))

	return f.Write(c.Response().BodyWriter())
}
