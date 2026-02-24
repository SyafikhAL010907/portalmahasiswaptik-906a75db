package handlers

import (
	"fmt"
	"strconv"
	"time"

	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/middleware"
	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/models"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/xuri/excelize/v2"
)

// ExportAttendanceExcel generates a professional attendance report for a SINGLE session
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

	user := c.Locals("user").(middleware.UserContext)

	// --- IDOR PROTECTION (Zero Tolerance) ---
	// AdminDev can see everything. Others only their own class.
	if user.Role != models.RoleAdminDev {
		if user.ClassID == nil || *user.ClassID != session.ClassID {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Akses Ditolak: Anda tidak memiliki akses ke data absensi kelas ini.",
			})
		}
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

	// Generate Sheet
	sheetName := "Attendance"
	f.SetSheetName("Sheet1", sheetName)
	generateAttendanceSheet(f, sheetName, &session, students, recordMap)

	// Finalize
	filename := fmt.Sprintf("Absensi_%s_%s_P%d.xlsx", session.Meeting.Subject.Name, session.Class.Name, session.Meeting.MeetingNumber)
	c.Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))

	return f.Write(c.Response().BodyWriter())
}

// ExportMasterAttendanceExcel generates a multi-sheet Excel for ALL meetings of a subject/class
// GET /api/export/attendance/master-excel?subject_id=...&class_id=...
func (h *AttendanceHandler) ExportMasterAttendanceExcel(c *fiber.Ctx) error {
	subjectIDStr := c.Query("subject_id")
	classIDStr := c.Query("class_id")

	if subjectIDStr == "" || classIDStr == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "subject_id and class_id required"})
	}

	subjectID, _ := uuid.Parse(subjectIDStr)
	classID, _ := uuid.Parse(classIDStr)

	user := c.Locals("user").(middleware.UserContext)

	// --- IDOR PROTECTION (Zero Tolerance) ---
	// AdminDev can see everything. Others only their own class.
	if user.Role != models.RoleAdminDev {
		if user.ClassID == nil || *user.ClassID != classID {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Akses Ditolak: Anda tidak memiliki akses ke data absensi kelas ini.",
			})
		}
	}

	// 1. Fetch Context (Subject, Class, Meetings, Students)
	var subject models.Subject
	if err := h.DB.First(&subject, subjectID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Subject not found"})
	}

	var class models.Class
	if err := h.DB.First(&class, classID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Class not found"})
	}

	var meetings []models.Meeting
	h.DB.Where("subject_id = ?", subjectID).Order("meeting_number ASC").Find(&meetings)

	var students []models.Profile
	h.DB.Where("class_id = ?", classID).Order("nim ASC").Find(&students)

	// 2. Create Excel
	f := excelize.NewFile()
	defer f.Close()

	// Rename default sheet to Summary or first meeting
	if len(meetings) > 0 {
		f.SetSheetName("Sheet1", fmt.Sprintf("Pertemuan %d", meetings[0].MeetingNumber))
	} else {
		f.SetSheetName("Sheet1", "Summary")
	}

	// 3. Loop Meetings and Generate Sheets
	for i, meeting := range meetings {
		sheetName := fmt.Sprintf("Pertemuan %d", meeting.MeetingNumber)
		if i > 0 {
			f.NewSheet(sheetName)
		}

		// Try to find session
		// Use Order("created_at DESC") to get the LATEST session if duplicates exist
		var session models.AttendanceSession
		err := h.DB.Where("meeting_id = ? AND class_id = ?", meeting.ID, classID).Order("created_at DESC").First(&session).Error

		// Prepare Data
		recordMap := make(map[uuid.UUID]models.AttendanceRecord)

		// If session exists, fetch records
		if err == nil {
			// Hydrate relationships manually for the helper
			session.Meeting = &meetings[i]
			session.Meeting.Subject = &subject
			session.Class = &class

			// EXACT COPY OF FETCHING LOGIC FROM ExportAttendanceExcel
			var records []models.AttendanceRecord
			h.DB.Where("session_id = ?", session.ID).Find(&records)

			for _, r := range records {
				recordMap[r.StudentID] = r
			}
		} else {
			// Mock session for display if not exists
			session = models.AttendanceSession{
				Meeting: &models.Meeting{
					MeetingNumber: meeting.MeetingNumber,
					Subject:       &subject,
				},
				Class: &class,
			}
		}

		generateAttendanceSheet(f, sheetName, &session, students, recordMap)
	}

	// Finalize
	filename := fmt.Sprintf("Master_Absensi_%s_%s.xlsx", subject.Name, class.Name)
	c.Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))

	return f.Write(c.Response().BodyWriter())
}

// Helper to generate a single attendance sheet
func generateAttendanceSheet(f *excelize.File, sheet string, session *models.AttendanceSession, students []models.Profile, recordMap map[uuid.UUID]models.AttendanceRecord) {
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

	// Safe checks for nil pointers in case of partial session data
	subjectName := "-"
	if session.Meeting != nil && session.Meeting.Subject != nil {
		subjectName = session.Meeting.Subject.Name
	}
	className := "-"
	if session.Class != nil {
		className = session.Class.Name
	}
	meetingNum := 0
	if session.Meeting != nil {
		meetingNum = session.Meeting.MeetingNumber
	}

	f.SetCellValue(sheet, "A3", "Mata Kuliah:")
	f.SetCellValue(sheet, "B3", subjectName)
	f.SetCellStyle(sheet, "A3", "A3", metaLabelStyle)

	f.SetCellValue(sheet, "A4", "Kelas:")
	f.SetCellValue(sheet, "B4", className)
	f.SetCellStyle(sheet, "A4", "A4", metaLabelStyle)

	f.SetCellValue(sheet, "A5", "Pertemuan:")
	f.SetCellValue(sheet, "B5", strconv.Itoa(meetingNum))
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
			// Force treat as UTC then shift to WIB (UTC+7)
			loc := time.FixedZone("WIB", 7*3600)
			scanTime = record.ScannedAt.UTC().In(loc).Format("03:04 PM")

			switch status {
			case "present", "hadir":
				style = presentStyle
				status = "HADIR"
			case "absent", "alpha":
				style = absentStyle
				status = "ALPHA"
			case "permit", "izin":
				style = normalStyle // Or yellow if defined
				status = "IZIN"
			case "pending":
				status = "PENDING"
				style = normalStyle
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
}
