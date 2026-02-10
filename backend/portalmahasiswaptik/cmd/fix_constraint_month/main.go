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

	log.Println("🔧 Fixing Key Constraint (Including Month)...")

	// 1. Drop the offending constraint detected in the user's error message
	log.Println("👉 Dropping old 'weekly_dues_student_id_week_number_year_key'...")
	if err := db.Exec("ALTER TABLE weekly_dues DROP CONSTRAINT IF EXISTS weekly_dues_student_id_week_number_year_key").Error; err != nil {
		log.Printf("⚠️  Could not drop old constraint (might not exist): %v", err)
	} else {
		log.Println("✅ Old constraint dropped.")
	}

	// 2. Drop any other potential conflicts
	db.Exec("ALTER TABLE weekly_dues DROP CONSTRAINT IF EXISTS weekly_dues_student_id_week_number_month_year_key")
	db.Exec("DROP INDEX IF EXISTS idx_weekly_dues_conflict")
	db.Exec("DROP INDEX IF EXISTS idx_weekly_due_unique")

	// 3. Create the CORRECT Constraint
	log.Println("👉 Creating new constraint 'weekly_dues_student_id_week_month_year_key'...")
	// Note: Using 'week_number' as per database column, not 'week_index'
	query := `
		ALTER TABLE weekly_dues 
		ADD CONSTRAINT weekly_dues_student_id_week_month_year_key 
		UNIQUE (student_id, week_number, month, year)
	`
	if err := db.Exec(query).Error; err != nil {
		log.Fatalf("❌ Failed to add new constraint: %v", err)
	} else {
		log.Println("✅ NEW Unique Constraint Added: (student_id, week_number, month, year)")
	}

	// 4. Reload Schema
	db.Exec("NOTIFY pgrst, 'reload schema'")
	log.Println("🔄 Schema reload notified.")
}
