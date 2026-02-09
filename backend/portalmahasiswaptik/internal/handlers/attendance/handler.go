package attendance

import (
	"crypto/rand"
	"encoding/hex"
	"time"

	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/middleware"
	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/models"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AttendanceHandler struct {
	DB *gorm.DB
}

func NewAttendanceHandler(db *gorm.DB) *AttendanceHandler {
	return &AttendanceHandler{DB: db}
}

// === KONFIGURASI LOKASI KAMPUS (UNJ Rawamangun) ===
// Koordinat ini jadi patokan utama Anti-Titip Absen
const (
	CampusLatitude  = -6.190697
	CampusLongitude = 106.877777
	MaxDistanceKm   = 0.15 // Radius 150 meter
)

// Helper: Rumus Haversine untuk hitung jarak GPS (UNUSED FOR NOW)
// func haversineDistance(lat1, lon1, lat2, lon2 float64) float64 {
// 	const earthRadius = 6371 // km
// 	dLat := (lat2 - lat1) * (math.Pi / 180)
// 	dLon := (lon2 - lon1) * (math.Pi / 180)
// 	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
// 		math.Cos(lat1*(math.Pi/180))*math.Cos(lat2*(math.Pi/180))*
// 			math.Sin(dLon/2)*math.Sin(dLon/2)
// 	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
// 	return earthRadius * c
// }

func generateQRToken() string {
	bytes := make([]byte, 16)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

// ================= HANDLERS =================

// CreateSession: Dosen membuat sesi QR Code baru
// POST /api/attendance/session
func (h *AttendanceHandler) CreateSession(c *fiber.Ctx) error {
	user := c.Locals("user").(middleware.UserContext)

	// Proteksi: Hanya Dosen/AdminDev yang bisa buka absen
	if user.Role != models.RoleAdminDev && user.Role != models.RoleAdminDosen {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Akses ditolak: Hanya dosen yang bisa membuat sesi"})
	}

	type CreateSessionRequest struct {
		ClassID   uuid.UUID `json:"class_id"`
		MeetingID uuid.UUID `json:"meeting_id"`
	}

	var req CreateSessionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Format request salah"})
	}

	// Matikan sesi aktif sebelumnya milik dosen ini biar tidak double
	h.DB.Model(&models.AttendanceSession{}).
		Where("lecturer_id = ? AND is_active = ?", user.UserID, true).
		Update("is_active", false)

	// Buat Sesi Baru dengan durasi 5 menit
	qrToken := "PTIK-" + generateQRToken()
	isActive := true
	session := models.AttendanceSession{
		ID:         uuid.New(),
		ClassID:    req.ClassID,
		LecturerID: user.UserID,
		MeetingID:  req.MeetingID,
		QRCode:     qrToken,
		IsActive:   &isActive,
		ExpiresAt:  time.Now().Add(5 * time.Minute),
	}

	if err := h.DB.Create(&session).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal database saat membuat sesi"})
	}

	// Preload data lengkap (Matkul & Kelas) untuk respon UI
	h.DB.Preload("Meeting.Subject").Preload("Class").First(&session, session.ID)

	return c.JSON(fiber.Map{
		"success": true,
		"data":    session,
	})
}

// ScanQR: Mahasiswa melakukan scan QR Code
// POST /api/attendance/scan
func (h *AttendanceHandler) ScanQR(c *fiber.Ctx) error {
	user := c.Locals("user").(middleware.UserContext)

	type ScanRequest struct {
		QRCode    string  `json:"qr_code"`
		Latitude  float64 `json:"latitude"`
		Longitude float64 `json:"longitude"`
	}

	var req ScanRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Request tidak valid"})
	}

	// 1. Cari Sesi yang Valid & Belum Expired
	var session models.AttendanceSession
	err := h.DB.Preload("Meeting.Subject").
		Where("qr_code = ? AND is_active = ? AND expires_at > ?", req.QRCode, true, time.Now()).
		First(&session).Error

	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "QR Code expired atau tidak ditemukan"})
	}

	// 2. Validasi Kelas: Mahasiswa harus berada di kelas yang benar
	var profile models.Profile
	h.DB.Where("user_id = ?", user.UserID).First(&profile)
	if profile.ClassID == nil || *profile.ClassID != session.ClassID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Anda tidak terdaftar di kelas sesi ini!"})
	}

	// 3. Pengecekan Duplikat: Gak boleh absen dua kali
	var existing models.AttendanceRecord
	if err := h.DB.Where("session_id = ? AND student_id = ?", session.ID, user.UserID).First(&existing).Error; err == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Anda sudah tercatat hadir"})
	}

	// 4. VALIDASI JARAK: Anti Titip Absen (DISABLED FOR TESTING)
	// if req.Latitude == 0 || req.Longitude == 0 {
	// 	return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "GPS wajib diaktifkan untuk absensi!"})
	// }

	// dist := haversineDistance(CampusLatitude, CampusLongitude, req.Latitude, req.Longitude)
	// if dist > MaxDistanceKm {
	// 	return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
	// 		"error":    "Terdeteksi di luar kampus! Absensi ditolak.",
	// 		"distance": math.Round(dist * 1000), // Dalam meter
	// 	})
	// }

	// 5. Simpan Record Kehadiran
	record := models.AttendanceRecord{
		ID:        uuid.New(),
		SessionID: session.ID,
		StudentID: user.UserID,
		Status:    "present",
		ScannedAt: time.Now(),
	}

	if err := h.DB.Create(&record).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal menyimpan absensi"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Absensi berhasil dicatat!",
		"subject": session.Meeting.Subject.Name,
	})
}

// GetStudentHistory: Mengambil riwayat lengkap untuk ditampilkan dalam folder
// GET /api/attendance/history
func (h *AttendanceHandler) GetStudentHistory(c *fiber.Ctx) error {
	user := c.Locals("user").(middleware.UserContext)

	var records []models.AttendanceRecord

	// Preload Berjenjang: Record -> Session -> Meeting -> Subject (Dapetin Semester & Nama Matkul)
	// Preload Session -> Class (Dapetin Nama Kelas)
	err := h.DB.Preload("Session.Meeting.Subject").
		Preload("Session.Class").
		Where("student_id = ?", user.UserID).
		Order("scanned_at DESC").
		Find(&records).Error

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal memuat riwayat"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    records,
	})
}
