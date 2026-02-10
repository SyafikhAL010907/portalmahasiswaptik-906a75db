package main

import (
	"fmt"
	"log"

	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/config"
	"github.com/joho/godotenv"
	"gorm.io/gorm"
)

func main() {
	if err := godotenv.Load(); err != nil {
		_ = godotenv.Load("../../.env")
	}

	db, err := config.InitDatabase()
	if err != nil {
		log.Fatalf("❌ Failed to connect: %v", err)
	}

	log.Println("🕵️  STARTING CONSTRAINT AUDIT & CLEANUP...")

	// 1. Audit BEFORE
	log.Println("\n--- Constraints BEFORE Cleanup ---")
	printConstraints(db)

	// 2. Drop Blacklisted Constraints (Known troublemakers)
	// 'unique_weekly_payment' is the one reported by user
	// We also drop the one we made earlier just to re-create it fresh and clean
	targets := []string{
		"unique_weekly_payment",
		"weekly_dues_student_id_week_number_year_key",
		"weekly_dues_student_id_week_number_key",
		"weekly_dues_student_id_week_month_year_key", // Drop to recreate
	}

	log.Println("\n🧹 Cleaning up constraints...")
	for _, name := range targets {
		q := fmt.Sprintf("ALTER TABLE weekly_dues DROP CONSTRAINT IF EXISTS %s", name)
		if err := db.Exec(q).Error; err != nil {
			log.Printf("⚠️  Failed to drop '%s': %v", name, err)
		} else {
			log.Printf("✅ Dropped constraint: %s", name)
		}
	}

	// Also drop any indexes that might be lingering
	db.Exec("DROP INDEX IF EXISTS idx_weekly_dues_conflict")
	db.Exec("DROP INDEX IF EXISTS idx_weekly_due_unique")

	// 3. Add the ONE TRUE CONSTRAINT
	log.Println("\n🔨 Creating the SINGLE correct unique constraint...")
	createQ := `
		ALTER TABLE weekly_dues 
		ADD CONSTRAINT weekly_dues_student_id_week_month_year_key 
		UNIQUE (student_id, week_number, month, year)
	`
	if err := db.Exec(createQ).Error; err != nil {
		log.Fatalf("❌ FATAL: Could not create unique constraint: %v", err)
	}
	log.Println("✅ SUCCESS: Constraint 'weekly_dues_student_id_week_month_year_key' created.")

	// 4. Audit AFTER
	log.Println("\n--- Constraints AFTER Cleanup (Should only see PK + FKs + Our New Key) ---")
	printConstraints(db)

	// 5. Reload Schema
	db.Exec("NOTIFY pgrst, 'reload schema'")
	log.Println("\n🔄 Schema reload notified.")
}

func printConstraints(db *gorm.DB) {
	rows, err := db.Raw(`
		SELECT conname, pg_get_constraintdef(oid) 
		FROM pg_constraint 
		WHERE conrelid = 'weekly_dues'::regclass
	`).Rows()
	if err != nil {
		log.Printf("Error querying constraints: %v", err)
		return
	}
	defer rows.Close()

	count := 0
	for rows.Next() {
		var name, def string
		rows.Scan(&name, &def)
		fmt.Printf(" [Found] %s: %s\n", name, def)
		count++
	}
	if count == 0 {
		fmt.Println(" (No constraints found)")
	}
}
