package main

import (
	"log"

	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/config"
	"github.com/joho/godotenv"
)

func main() {
	// 1. Load env variables
	// Try default first (CWD)
	if err := godotenv.Load(); err != nil {
		log.Println("⚠️  .env not found in CWD, trying parent directories...")
		// Try going up (in case running from submenu)
		_ = godotenv.Load("../../.env")
	}

	// 2. Initialize DB using the EXACT SAME function as the server
	db, err := config.InitDatabase()
	if err != nil {
		log.Fatalf("❌ Failed to connect to database using factory config: %v", err)
	}
	log.Println("✅ Connected to Database via GORM!")

	// 3. Truncate
	log.Println("🗑️  Truncating tables...")

	// Transaction for safety
	tx := db.Begin()

	if err := tx.Exec("TRUNCATE TABLE weekly_dues RESTART IDENTITY CASCADE").Error; err != nil {
		tx.Rollback()
		log.Fatalf("❌ Failed to truncate weekly_dues: %v", err)
	}

	if err := tx.Exec("TRUNCATE TABLE transactions RESTART IDENTITY CASCADE").Error; err != nil {
		tx.Rollback()
		log.Fatalf("❌ Failed to truncate transactions: %v", err)
	}

	if err := tx.Commit().Error; err != nil {
		log.Fatalf("❌ Failed to commit transaction: %v", err)
	}

	log.Println("🎉 SUCCESS: Financial Data has been RESET to 0!")
}
