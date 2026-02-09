package academic

import (
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type AcademicHandler struct {
	DB *gorm.DB
}

func NewAcademicHandler(db *gorm.DB) *AcademicHandler {
	return &AcademicHandler{DB: db}
}

// --- SCHEDULE MOCK DATA ---
type ScheduleItem struct {
	Subject  string `json:"subject"`
	Time     string `json:"time"`
	Room     string `json:"room"`
	Lecturer string `json:"lecturer"`
	IsActive bool   `json:"isActive"`
	IsNext   bool   `json:"isNext"`
}

var mockScheduleData = map[string][]ScheduleItem{
	"Senin": {
		{Subject: "Pemrograman Web Lanjut", Time: "08:00 - 10:30", Room: "Lab Komputer 3", Lecturer: "Dr. Bambang Susilo, M.Kom"},
		{Subject: "Algoritma & Struktur Data", Time: "13:00 - 15:30", Room: "Ruang 301", Lecturer: "Prof. Dewi Anggraini, Ph.D"},
	},
	"Selasa": {
		{Subject: "Basis Data", Time: "08:00 - 10:30", Room: "Ruang 405", Lecturer: "Prof. Sri Wahyuni, M.Sc"},
		{Subject: "Sistem Operasi", Time: "13:00 - 15:30", Room: "Lab Komputer 2", Lecturer: "Agus Pratama, M.T"},
	},
	"Rabu": {
		{Subject: "Pemrograman Web Lanjut", Time: "08:00 - 10:30", Room: "Lab Komputer 3", Lecturer: "Dr. Bambang Susilo, M.Kom", IsActive: true},
		{Subject: "Basis Data", Time: "13:00 - 15:30", Room: "Ruang 405", Lecturer: "Prof. Sri Wahyuni, M.Sc", IsNext: true},
		{Subject: "Jaringan Komputer", Time: "16:00 - 18:00", Room: "Lab Jarkom", Lecturer: "Agus Setiawan, M.T"},
	},
	"Kamis": {
		{Subject: "Kecerdasan Buatan", Time: "08:00 - 10:30", Room: "Ruang 502", Lecturer: "Dr. Rini Wulandari, M.Kom"},
		{Subject: "Mobile Development", Time: "13:00 - 15:30", Room: "Lab Komputer 1", Lecturer: "Budi Santoso, M.T"},
	},
	"Jumat": {
		{Subject: "Keamanan Sistem", Time: "08:00 - 10:30", Room: "Lab Jarkom", Lecturer: "Andi Wijaya, M.Cs"},
		{Subject: "Manajemen Proyek TI", Time: "13:00 - 15:30", Room: "Ruang 403", Lecturer: "Dr. Siti Rahayu, MBA"},
	},
}

// GetSchedule returns schedule for the week
// GET /api/academic/schedule
func (h *AcademicHandler) GetSchedule(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"success": true,
		"data":    mockScheduleData,
	})
}

// --- IPK SIMULATOR MOCK DATA ---
type IPKSubject struct {
	Name string `json:"name"`
	SKS  int    `json:"sks"`
}

var mockIPKSubjects = []IPKSubject{
	{Name: "Pemrograman Web Lanjut", SKS: 3},
	{Name: "Basis Data", SKS: 3},
	{Name: "Jaringan Komputer", SKS: 3},
	{Name: "Kecerdasan Buatan", SKS: 3},
	{Name: "Mobile Development", SKS: 3},
	{Name: "Keamanan Sistem", SKS: 3},
}

// GetIPKSubjects returns subjects for IPK simulation
// GET /api/academic/ipk/subjects
func (h *AcademicHandler) GetIPKSubjects(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"success": true,
		"data":    mockIPKSubjects,
	})
}
