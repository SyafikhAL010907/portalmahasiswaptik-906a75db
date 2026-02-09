package repository

import (
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type RepositoryHandler struct {
	DB *gorm.DB
}

func NewRepositoryHandler(db *gorm.DB) *RepositoryHandler {
	return &RepositoryHandler{DB: db}
}

// Mock Data
type Semester struct {
	ID       int      `json:"id"`
	Name     string   `json:"name"`
	Gradient string   `json:"gradient"`
	Courses  []string `json:"courses"`
}

var mockSemesters = []Semester{
	{ID: 1, Name: "Semester 1", Gradient: "from-primary/20 to-primary/5", Courses: []string{"Pengantar Teknologi Informasi", "Algoritma & Pemrograman", "Matematika Dasar", "Bahasa Inggris I", "Pendidikan Pancasila", "Fisika Dasar"}},
	{ID: 2, Name: "Semester 2", Gradient: "from-success/20 to-success/5", Courses: []string{"Struktur Data", "Pemrograman Lanjut", "Kalkulus", "Bahasa Inggris II", "Statistika", "Sistem Digital"}},
	{ID: 3, Name: "Semester 3", Gradient: "from-warning/20 to-warning/5", Courses: []string{"Basis Data", "Pemrograman Web", "Sistem Operasi", "Jaringan Komputer", "Interaksi Manusia Komputer", "Matematika Diskrit"}},
	{ID: 4, Name: "Semester 4", Gradient: "from-destructive/20 to-destructive/5", Courses: []string{"Rekayasa Perangkat Lunak", "Pemrograman Mobile", "Keamanan Informasi", "Cloud Computing", "Data Mining", "Kecerdasan Buatan"}},
	{ID: 5, Name: "Semester 5", Gradient: "from-accent/40 to-accent/10", Courses: []string{"Machine Learning", "Big Data", "Pemrograman IoT", "Manajemen Proyek TI", "Etika Profesi", "Kapita Selekta"}},
	{ID: 6, Name: "Semester 6", Gradient: "from-primary/30 to-success/10", Courses: []string{"Deep Learning", "Blockchain", "DevOps", "Cyber Security", "Metodologi Penelitian", "Kerja Praktek"}},
	{ID: 7, Name: "Semester 7", Gradient: "from-success/30 to-warning/10", Courses: []string{"Skripsi", "Seminar", "Magang Industri", "Pengembangan Karir", "Kewirausahaan Digital", "Proyek Akhir"}},
}

type File struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
	Type string `json:"type"`
	Size string `json:"size"`
}

// GetSemesters returns list of semesters
// GET /api/repository/semesters
func (h *RepositoryHandler) GetSemesters(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"success": true,
		"data":    mockSemesters,
	})
}

// GetFiles returns files for a specific course
// GET /api/repository/files?course=...
func (h *RepositoryHandler) GetFiles(c *fiber.Ctx) error {
	courseName := c.Query("course")
	if courseName == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "course parameter required"})
	}

	mockFiles := []File{
		{ID: 1, Name: "Modul " + courseName + " - Pertemuan 1.pdf", Type: "document", Size: "2.4 MB"},
		{ID: 2, Name: "Slide Presentasi Minggu 1.pptx", Type: "document", Size: "5.1 MB"},
		{ID: 3, Name: "Video Pembelajaran - Intro.mp4", Type: "video", Size: "124 MB"},
		{ID: 4, Name: "Latihan Soal Bab 1.pdf", Type: "document", Size: "890 KB"},
		{ID: 5, Name: "Tutorial Praktikum.mp4", Type: "video", Size: "89 MB"},
		{ID: 6, Name: "Rangkuman Materi.pdf", Type: "document", Size: "1.2 MB"},
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    mockFiles,
	})
}
