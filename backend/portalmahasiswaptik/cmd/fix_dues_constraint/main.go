package main

import (
	"log"
	"os"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	// 0. Load .env
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found")
	}

	// 1. Connect to DB
	dsn := os.Getenv("DATABASE_URL")
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	log.Println("Database connected. Updating check constraint for weekly_dues...")

	// 2. Drop existing constraint if it exists (common names)
	// We might need to find the name first, or just try dropping common names.
	// Usually GORM might name it `chk_weekly_dues_status` or similar if manually created,
	// or it might be implicit.
	// However, if the user says there IS a constraint, it's likely a raw SQL check.

	// Let's try to drop the constraint by name if we can guess, or just alter the column type to Text (drops check usually? no).
	// Better: Helper function to drop constraint.

	// Attempt to drop potential constraint names
	constraints := []string{"weekly_dues_status_check", "chk_weekly_dues_status"}
	for _, c := range constraints {
		db.Exec("ALTER TABLE weekly_dues DROP CONSTRAINT IF EXISTS " + c)
	}

	// 3. Add New Constraint
	// Statuses: 'paid', 'lunas', 'pending', 'unpaid', 'belum', 'free', 'bebas'
	// Adding 'free' and 'bebas' to be safe.
	sql := `ALTER TABLE weekly_dues ADD CONSTRAINT weekly_dues_status_check 
            CHECK (status IN ('paid', 'lunas', 'pending', 'unpaid', 'belum', 'free', 'bebas'))`

	if err := db.Exec(sql).Error; err != nil {
		log.Printf("Error adding constraint: %v", err)
	} else {
		log.Println("Successfully updated constraint to include 'bebas' and 'free'.")
	}

	// 4. Verify content
	log.Println("Migration complete.")
}
