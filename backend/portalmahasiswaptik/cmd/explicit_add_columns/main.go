package main

import (
	"log"
	"time"

	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/config"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		_ = godotenv.Load("../../.env")
	}

	db, err := config.InitDatabase()
	if err != nil {
		log.Fatalf("❌ Failed to connect: %v", err)
	}

	log.Println("🔨 EXPLICITLY Adding Columns & Fixing Schema...")

	// 1. Explicitly ADD COLUMNS (idempotent)
	queries := []string{
		"ALTER TABLE weekly_dues ADD COLUMN IF NOT EXISTS month INTEGER DEFAULT extract(month from CURRENT_DATE);",
		"ALTER TABLE weekly_dues ADD COLUMN IF NOT EXISTS year INTEGER DEFAULT extract(year from CURRENT_DATE);",
		"COMMENT ON COLUMN weekly_dues.month IS 'Month of the due';",
		"COMMENT ON COLUMN weekly_dues.year IS 'Year of the due';",
	}

	for _, q := range queries {
		if err := db.Exec(q).Error; err != nil {
			log.Printf("❌ Query Failed: %s\nError: %v", q, err)
		} else {
			log.Printf("✅ Query Success: %s", q)
		}
	}

	// 2. Refresh Schema Cache
	log.Println("🔄 Reloading Schema Cache...")
	db.Exec("NOTIFY pgrst, 'reload schema'")

	// Wait a bit
	time.Sleep(2 * time.Second)

	// 3. Verify Columns by inserting a dummy row then deleting it
	log.Println("🧪 Verifying by inserting dummy data...")
	err = db.Exec(`
		INSERT INTO weekly_dues (student_id, week_number, month, year, amount, status)
		VALUES ('00000000-0000-0000-0000-000000000000', 99, 1, 2099, 0, 'test_probe')
		ON CONFLICT (student_id, week_number, month, year) DO NOTHING
	`).Error

	if err != nil {
		log.Printf("❌ INSERT PROBE FAILED (Columns might still be missing from view?): %v", err)
	} else {
		log.Println("✅ INSERT PROBE SUCCESS! Columns are definitely usable.")
		// Cleanup
		db.Exec("DELETE FROM weekly_dues WHERE status = 'test_probe'")
	}

	log.Println("🎉 Database Fix Complete.")
}
