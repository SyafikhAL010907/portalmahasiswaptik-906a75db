package main

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found")
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL not set")
	}

	// Connect to database
	db, err := gorm.Open(postgres.Open(dbURL), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	fmt.Println("🔄 Starting migration: Make transactions.class_id nullable...")

	// Execute raw SQL to alter the column
	result := db.Exec(`
		ALTER TABLE transactions 
		ALTER COLUMN class_id DROP NOT NULL;
	`)

	if result.Error != nil {
		log.Fatalf("❌ Migration failed: %v", result.Error)
	}

	fmt.Println("✅ Migration completed successfully!")
	fmt.Printf("   - Column 'class_id' in 'transactions' table is now NULLABLE\n")
	fmt.Printf("   - Rows affected: %d\n", result.RowsAffected)
	fmt.Printf("   - Timestamp: %s\n", time.Now().Format(time.RFC3339))
}
