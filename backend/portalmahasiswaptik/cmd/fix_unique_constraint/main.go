package main

import (
	"log"

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

	log.Println("🔧 Fixing Unique Constraint...")

	// 1. Drop potential old constraints/indexes
	drops := []string{
		"ALTER TABLE weekly_dues DROP CONSTRAINT IF EXISTS weekly_dues_student_id_week_number_month_year_key",
		"DROP INDEX IF EXISTS idx_weekly_dues_conflict",
		"DROP INDEX IF EXISTS idx_weekly_due_unique",
		"DROP INDEX IF EXISTS weekly_dues_student_id_week_number_key", // Old one?
	}

	for _, q := range drops {
		db.Exec(q)
	}
	log.Println("✅ Old constraints formatted/dropped.")

	// 2. Add Proper Unique Constraint
	// We use ADD CONSTRAINT so it has a definitive name and type
	query := `
		ALTER TABLE weekly_dues 
		ADD CONSTRAINT weekly_dues_student_id_week_number_month_year_key 
		UNIQUE (student_id, week_number, month, year)
	`
	if err := db.Exec(query).Error; err != nil {
		log.Printf("❌ Failed to add constraint: %v", err)
	} else {
		log.Println("✅ Unique Constraint Added: (student_id, week_number, month, year)")
	}

	// 3. Notify Schema Reload
	db.Exec("NOTIFY pgrst, 'reload schema'")
	log.Println("🔄 Schema reload notified.")
}
