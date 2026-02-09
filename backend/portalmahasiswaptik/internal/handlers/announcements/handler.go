package announcements

import (
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type AnnouncementsHandler struct {
	DB *gorm.DB
}

func NewAnnouncementsHandler(db *gorm.DB) *AnnouncementsHandler {
	return &AnnouncementsHandler{DB: db}
}

// Mock Data (Moved from Frontend)
type Announcement struct {
	ID       int    `json:"id"`
	Title    string `json:"title"`
	Content  string `json:"content"`
	Date     string `json:"date"`
	Category string `json:"category"`
	IsPinned bool   `json:"isPinned"`
	IsNew    bool   `json:"isNew"`
	Type     string `json:"type"`
}

var mockAnnouncements = []Announcement{
	{
		ID:       1,
		Title:    "Jadwal UAS Semester Ganjil 2024/2025",
		Content:  "Ujian Akhir Semester akan dilaksanakan pada tanggal 15-27 Januari 2025. Mahasiswa diharapkan mempersiapkan diri dengan baik. Jadwal lengkap dapat dilihat di SIAKAD.",
		Date:     "20 Jan 2025",
		Category: "Akademik",
		IsPinned: true,
		IsNew:    true,
		Type:     "warning",
	},
	{
		ID:       2,
		Title:    "Pembayaran SPP Semester Genap",
		Content:  "Batas akhir pembayaran SPP semester genap adalah 31 Januari 2025. Mahasiswa yang belum melakukan pembayaran tidak dapat mengakses KRS online.",
		Date:     "18 Jan 2025",
		Category: "Keuangan",
		IsPinned: true,
		IsNew:    true,
		Type:     "alert",
	},
	{
		ID:       3,
		Title:    "Workshop AI & Machine Learning",
		Content:  "Himpunan PTIK mengadakan workshop AI & Machine Learning pada Sabtu, 25 Januari 2025 di Lab Komputer Gedung D. Pendaftaran melalui link di grup angkatan.",
		Date:     "15 Jan 2025",
		Category: "Event",
		IsPinned: false,
		IsNew:    true,
		Type:     "info",
	},
	{
		ID:       4,
		Title:    "Pendaftaran KKN Semester Genap",
		Content:  "Pendaftaran KKN untuk semester genap telah dibuka. Mahasiswa semester 6 ke atas dapat mendaftar melalui portal KKN UNJ.",
		Date:     "10 Jan 2025",
		Category: "Akademik",
		IsPinned: false,
		IsNew:    false,
		Type:     "info",
	},
	{
		ID:       5,
		Title:    "Maintenance Server SIAKAD",
		Content:  "Server SIAKAD akan mengalami maintenance pada Minggu, 12 Januari 2025 pukul 00.00-06.00 WIB. Harap simpan pekerjaan sebelum waktu tersebut.",
		Date:     "08 Jan 2025",
		Category: "Sistem",
		IsPinned: false,
		IsNew:    false,
		Type:     "warning",
	},
	{
		ID:       6,
		Title:    "Lomba Hackathon Nasional 2025",
		Content:  "Pendaftaran Hackathon Nasional telah dibuka! Hadiah total 50 juta rupiah. Daftar sekarang di halaman Info Lomba.",
		Date:     "05 Jan 2025",
		Category: "Lomba",
		IsPinned: false,
		IsNew:    false,
		Type:     "info",
	},
}

// GetAnnouncements returns all announcements
// GET /api/announcements
func (h *AnnouncementsHandler) GetAnnouncements(c *fiber.Ctx) error {
	// In the future, this will fetch from DB using h.DB
	// For now, return mock data
	return c.JSON(fiber.Map{
		"success": true,
		"data":    mockAnnouncements,
	})
}
