package repository

import (
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/storage"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type RepositoryHandler struct {
	DB              *gorm.DB
	SupabaseStorage *storage.SupabaseStorage
}

func NewRepositoryHandler(db *gorm.DB, supabaseStorage *storage.SupabaseStorage) *RepositoryHandler {
	return &RepositoryHandler{
		DB:              db,
		SupabaseStorage: supabaseStorage,
	}
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
	{ID: 5, Name: "Semester 5", Gradient: "from-accent/40 to-accent/10", Courses: []string{"Machine Learning", "Big Data", "Pemrograman IoT", "Manajemen Proyek TI", "Etika Profesi", "Kapita Slekta"}},
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

// UploadToDrive handles file uploads to Supabase Storage (Repository Bucket)
// POST /api/repository/upload-drive
func (h *RepositoryHandler) UploadToDrive(c *fiber.Ctx) error {
	if h.SupabaseStorage == nil {
		return c.Status(500).JSON(fiber.Map{"error": "Supabase Storage service not initialized"})
	}

	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "file is required"})
	}

	fileContent, err := file.Open()
	if err != nil {
		fmt.Printf("❌ Error: Failed to open file: %v\n", err)
		return c.Status(500).JSON(fiber.Map{"error": "failed to open file"})
	}
	defer fileContent.Close()

	// 1. Validasi Magic Bytes (MIME Sniffing) - Defense in Depth
	// Read first 512 bytes to detect content type
	buffer := make([]byte, 512)
	_, err = fileContent.Read(buffer)
	if err != nil && err != fmt.Errorf("EOF") {
		return c.Status(500).JSON(fiber.Map{"error": "failed to read file for validation"})
	}
	// Reset file pointer after reading
	if seeker, ok := fileContent.(io.Seeker); ok {
		seeker.Seek(0, io.SeekStart)
	}

	detectedType := http.DetectContentType(buffer)
	// Kita izinkan MIME type standar untuk dokumen/gambar
	allowedTypes := []string{
		"application/pdf",
		"image/jpeg",
		"image/png",
		"image/gif",
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",       // Excel
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document", // Word
		"text/plain; charset=utf-8",
	}

	isAllowed := false
	for _, t := range allowedTypes {
		if detectedType == t {
			isAllowed = true
			break
		}
	}

	// Logging detected type for audit
	fmt.Printf("🔍 Detected MIME Type: %s | Original Ext: %s\n", detectedType, file.Filename)

	if !isAllowed && detectedType != "application/octet-stream" { // octet-stream is generic, handle with care
		return c.Status(400).JSON(fiber.Map{
			"error": "Tipe file tidak diizinkan untuk alasan keamanan.",
		})
	}

	// 2. Randomize Filename (Anti Path Traversal / Collision)
	ext := ""
	if idx := strings.LastIndex(file.Filename, "."); idx != -1 {
		ext = file.Filename[idx:]
	}
	randomName := fmt.Sprintf("%s%s", uuid.New().String(), ext)

	fmt.Printf("📤 Uploading: %s -> %s\n", file.Filename, randomName)

	publicURL, err := h.SupabaseStorage.UploadFile(randomName, detectedType, fileContent)
	if err != nil {
		fmt.Printf("❌ Error: Upload to Supabase Storage failed: %v\n", err)
		return c.Status(500).JSON(fiber.Map{"error": "Gagal mengunggah file ke storage."})
	}

	return c.JSON(fiber.Map{
		"success":      true,
		"file_name":    file.Filename,
		"webViewLink":  publicURL,
		"storage_type": "supabase_storage",
	})
}
