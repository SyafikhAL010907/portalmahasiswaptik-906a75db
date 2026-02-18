package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"math"
	"time"

	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/middleware"
	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/models"
	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AttendanceHandler struct {
	DB       *gorm.DB
	Validate *validator.Validate
}

func NewAttendanceHandler(db *gorm.DB, validate *validator.Validate) *AttendanceHandler {
	return &AttendanceHandler{
		DB:       db,
		Validate: validate,
	}
}

// Campus location for geolocation validation (Jakarta State University approximate)
const (
	CampusLatitude  = -6.1889 // Example: Jakarta State University
	CampusLongitude = 106.8500
	MaxDistanceKm   = 0.15 // 150 meters
)

// CreateSessionRequest represents the request to create attendance session
type CreateSessionRequest struct {
	ClassID   uuid.UUID `json:"class_id" validate:"required"`
	MeetingID uuid.UUID `json:"meeting_id" validate:"required"`
	Duration  int       `json:"duration"` // Duration in minutes, default 5
}

// ScanQRRequest represents the request when student scans QR
type ScanQRRequest struct {
	QRToken   string  `json:"qr_token" validate:"required"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

// CreateSession creates a new attendance session (Dosen only)
// POST /api/attendance/session
func (h *AttendanceHandler) CreateSession(c *fiber.Ctx) error {
	user := c.Locals("user").(middleware.UserContext)

	// Only AdminDosen can create sessions
	if user.Role != models.RoleAdminDev && user.Role != models.RoleAdminDosen {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"error":   "Only lecturers can create attendance sessions",
		})
	}

	var req CreateSessionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid request body",
		})
	}

	// EXECUTE VALIDATION
	if err := h.Validate.Struct(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Validasi Gagal: " + err.Error(),
		})
	}

	// Validate class exists
	var class models.Class
	if err := h.DB.Where("id = ?", req.ClassID).First(&class).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Class not found",
		})
	}

	// Validate meeting exists
	var meeting models.Meeting
	if err := h.DB.Preload("Subject").Where("id = ?", req.MeetingID).First(&meeting).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Meeting not found",
		})
	}

	// Deactivate any existing active sessions for this class/meeting
	h.DB.Model(&models.AttendanceSession{}).
		Where("class_id = ? AND meeting_id = ? AND is_active = true", req.ClassID, req.MeetingID).
		Update("is_active", false)

	// Generate unique QR token
	qrToken := generateQRToken()

	// Set duration (default 5 minutes)
	duration := 5
	if req.Duration > 0 && req.Duration <= 60 {
		duration = req.Duration
	}

	// Create session
	isActive := true
	session := models.AttendanceSession{
		ClassID:    req.ClassID,
		LecturerID: user.UserID,
		MeetingID:  req.MeetingID,
		QRCode:     qrToken,
		IsActive:   &isActive,
		ExpiresAt:  time.Now().Add(time.Duration(duration) * time.Minute),
	}

	if err := h.DB.Create(&session).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to create session",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"session_id": session.ID,
			"qr_code":    qrToken,
			"class":      class.Name,
			"subject":    meeting.Subject.Name,
			"meeting":    meeting.MeetingNumber,
			"expires_at": session.ExpiresAt,
			"duration":   duration,
		},
		"message": "Attendance session created. QR code will expire in " + string(rune(duration)) + " minutes.",
	})
}

// ScanQR processes student QR scan
// POST /api/attendance/scan
func (h *AttendanceHandler) ScanQR(c *fiber.Ctx) error {
	user := c.Locals("user").(middleware.UserContext)

	// Only Mahasiswa can scan QR
	if user.Role != models.RoleMahasiswa && user.Role != models.RoleAdminDev {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"error":   "Only students can scan attendance QR",
		})
	}

	var req ScanQRRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid request body",
		})
	}

	// EXECUTE VALIDATION
	if err := h.Validate.Struct(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Validasi Gagal: " + err.Error(),
		})
	}

	if req.QRToken == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "QR token is required",
		})
	}

	// Find active session
	var session models.AttendanceSession
	err := h.DB.Preload("Class").Preload("Meeting.Subject").
		Where("qr_code = ? AND is_active = true", req.QRToken).
		First(&session).Error

	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid or expired QR code",
		})
	}

	// Check if session is expired
	if time.Now().After(session.ExpiresAt) {
		// Deactivate expired session
		h.DB.Model(&session).Update("is_active", false)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "QR code has expired. Please ask the lecturer for a new code.",
		})
	}

	// Validate student belongs to the correct class
	var studentProfile models.Profile
	if err := h.DB.Where("user_id = ?", user.UserID).First(&studentProfile).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Student profile not found",
		})
	}

	if studentProfile.ClassID == nil || *studentProfile.ClassID != session.ClassID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"error":   "This attendance session is for a different class",
		})
	}

	// Validate geolocation (if provided)
	if req.Latitude != 0 && req.Longitude != 0 {
		distance := haversineDistance(CampusLatitude, CampusLongitude, req.Latitude, req.Longitude)
		if distance > MaxDistanceKm {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"success":  false,
				"error":    "You are too far from campus. Please scan from within campus premises.",
				"distance": distance,
				"max":      MaxDistanceKm,
			})
		}
	}

	// Check for duplicate attendance
	var existingRecord models.AttendanceRecord
	if err := h.DB.Where("session_id = ? AND student_id = ?", session.ID, user.UserID).First(&existingRecord).Error; err == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"success":    false,
			"error":      "You have already marked attendance for this session",
			"scanned_at": existingRecord.ScannedAt,
		})
	}

	// Create attendance record
	record := models.AttendanceRecord{
		SessionID: session.ID,
		StudentID: user.UserID,
		Status:    "present",
		Method:    "qr",
		ScannedAt: time.Now(),
	}

	if err := h.DB.Create(&record).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to record attendance",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"record_id":  record.ID,
			"status":     record.Status,
			"scanned_at": record.ScannedAt,
			"class":      session.Class.Name,
			"subject":    session.Meeting.Subject.Name,
			"meeting":    session.Meeting.MeetingNumber,
		},
		"message": "Attendance recorded successfully!",
	})
}

// GetActiveSessions returns active sessions for a lecturer
// GET /api/attendance/sessions
func (h *AttendanceHandler) GetActiveSessions(c *fiber.Ctx) error {
	user := c.Locals("user").(middleware.UserContext)

	query := h.DB.Model(&models.AttendanceSession{}).
		Preload("Class").
		Preload("Meeting.Subject").
		Where("is_active = true AND expires_at > ?", time.Now())

	// Filter by lecturer for non-admin
	if user.Role != models.RoleAdminDev {
		query = query.Where("lecturer_id = ?", user.UserID)
	}

	var sessions []models.AttendanceSession
	query.Order("created_at DESC").Find(&sessions)

	return c.JSON(fiber.Map{
		"success": true,
		"data":    sessions,
	})
}

// GetAttendanceRecords returns attendance records with filters
// GET /api/attendance/records
func (h *AttendanceHandler) GetAttendanceRecords(c *fiber.Ctx) error {
	user := c.Locals("user").(middleware.UserContext)

	query := h.DB.Model(&models.AttendanceRecord{}).
		Preload("Session.Class").
		Preload("Session.Meeting.Subject")

	// Students can only see their own records
	if user.Role == models.RoleMahasiswa {
		query = query.Where("student_id = ?", user.UserID)
	}

	// Optional filters
	if sessionID := c.Query("session_id"); sessionID != "" {
		query = query.Where("session_id = ?", sessionID)
	}
	if studentID := c.Query("student_id"); studentID != "" && user.Role != models.RoleMahasiswa {
		query = query.Where("student_id = ?", studentID)
	}

	// Pagination
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 50)
	offset := (page - 1) * limit

	var total int64
	query.Count(&total)

	var records []models.AttendanceRecord
	query.Order("scanned_at DESC").Offset(offset).Limit(limit).Find(&records)

	return c.JSON(fiber.Map{
		"success": true,
		"data":    records,
		"meta": fiber.Map{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// GetSubjects returns all subjects grouped by semester
// GET /api/attendance/subjects
func (h *AttendanceHandler) GetSubjects(c *fiber.Ctx) error {
	var subjects []models.Subject
	h.DB.Order("semester ASC, name ASC").Find(&subjects)

	// Group by semester
	grouped := make(map[int][]models.Subject)
	for _, s := range subjects {
		grouped[s.Semester] = append(grouped[s.Semester], s)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    subjects,
		"grouped": grouped,
	})
}

// GetMeetings returns meetings for a subject
// GET /api/attendance/meetings/:subjectId
func (h *AttendanceHandler) GetMeetings(c *fiber.Ctx) error {
	subjectID := c.Params("subjectId")

	var meetings []models.Meeting
	if err := h.DB.Where("subject_id = ?", subjectID).
		Order("meeting_number ASC").
		Find(&meetings).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Subject not found",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    meetings,
	})
}

// RefreshSession refreshes an existing session with new QR code
// POST /api/attendance/session/:id/refresh
func (h *AttendanceHandler) RefreshSession(c *fiber.Ctx) error {
	user := c.Locals("user").(middleware.UserContext)
	sessionID := c.Params("id")

	var session models.AttendanceSession
	if err := h.DB.Where("id = ?", sessionID).First(&session).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Session not found",
		})
	}

	// Check ownership
	if user.Role != models.RoleAdminDev && session.LecturerID != user.UserID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"error":   "You can only refresh your own sessions",
		})
	}

	// Generate new QR code and extend expiry
	newQRCode := generateQRToken()
	isActive := true
	session.QRCode = newQRCode
	session.ExpiresAt = time.Now().Add(5 * time.Minute)
	session.IsActive = &isActive

	h.DB.Save(&session)

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"session_id": session.ID,
			"qr_code":    newQRCode,
			"expires_at": session.ExpiresAt,
		},
		"message": "QR code refreshed. New code valid for 5 minutes.",
	})
}

// DeactivateSession deactivates an attendance session
// POST /api/attendance/session/:id/deactivate
func (h *AttendanceHandler) DeactivateSession(c *fiber.Ctx) error {
	user := c.Locals("user").(middleware.UserContext)
	sessionID := c.Params("id")

	var session models.AttendanceSession
	if err := h.DB.Where("id = ?", sessionID).First(&session).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Session not found",
		})
	}

	// Check ownership
	if user.Role != models.RoleAdminDev && session.LecturerID != user.UserID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"error":   "You can only deactivate your own sessions",
		})
	}

	isActive := false
	session.IsActive = &isActive
	h.DB.Save(&session)

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Session deactivated successfully",
	})
}

// Helper: Generate secure QR token
func generateQRToken() string {
	bytes := make([]byte, 16)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

// Helper: Calculate Haversine distance between two coordinates
func haversineDistance(lat1, lon1, lat2, lon2 float64) float64 {
	const earthRadius = 6371 // km

	dLat := degreesToRadians(lat2 - lat1)
	dLon := degreesToRadians(lon2 - lon1)

	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(degreesToRadians(lat1))*math.Cos(degreesToRadians(lat2))*
			math.Sin(dLon/2)*math.Sin(dLon/2)

	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return earthRadius * c
}

func degreesToRadians(degrees float64) float64 {
	return degrees * math.Pi / 180
}
