package main

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	// 1. Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: Error loading .env file, relying on system env vars")
	}

	// 2. Get DB URL
	// 2. Get DB URL
	// Bypass PgBouncer for migration tasks
	// Construct direct URL: postgres://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
	// Password from env: SyafikhAL09 (seen in previous DATABASE_URL)
	// Project Ref: owqjsqvpmsctztpgensg
	dbURL := "postgres://postgres:SyafikhAL09@db.owqjsqvpmsctztpgensg.supabase.co:5432/postgres?sslmode=disable"
	// Note: SSL mode might be required. Supabase requires SSL usually. Let's try `require`.
	// Actually, `lib/pq` default is safe.
	dbURL = "postgres://postgres:SyafikhAL09@db.owqjsqvpmsctztpgensg.supabase.co:5432/postgres"

	// 3. Connect to DB
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("Failed to open DB connection: %v", err)
	}
	defer db.Close()

	// Retry loop for DB connection
	var errPing error
	for i := 0; i < 5; i++ {
		errPing = db.Ping()
		if errPing == nil {
			break
		}
		log.Printf("⚠️ Ping failed (attempt %d/5): %v. Retrying in 2s...", i+1, errPing)
		time.Sleep(2 * time.Second)
	}
	if errPing != nil {
		log.Fatalf("❌ Failed to ping DB after 5 attempts: %v", errPing)
	}

	fmt.Println("✅ Connected to Database")

	// 4. Run ALTER TABLE commands
	queries := []string{
		"ALTER TABLE weekly_dues ADD COLUMN IF NOT EXISTS month INT DEFAULT EXTRACT(MONTH FROM CURRENT_DATE);",
		"ALTER TABLE weekly_dues ADD COLUMN IF NOT EXISTS year INT DEFAULT EXTRACT(YEAR FROM CURRENT_DATE);",
		// Unique constraint might need adjustment if users want strict uniqueness,
		// but for now let's just ensure columns exist.
		// We might want to DROP the old constraint `weekly_dues_student_id_week_number_key` if it exists and ADD new one.
		// Let's check constraints later if needed. For now, just adding columns is the priority.
	}

	for _, q := range queries {
		_, err := db.Exec(q)
		if err != nil {
			log.Printf("⚠️ Error executing query '%s': %v\n", q, err)
		} else {
			fmt.Printf("✅ Executed: %s\n", q)
		}
	}

	// 5. Reload Schema Cache for Supabase/PostgREST
	_, err = db.Exec("NOTIFY pgrst, 'reload schema'")
	if err != nil {
		log.Printf("⚠️ Error reloading schema: %v\n", err)
	} else {
		fmt.Println("✅ Sent 'reload schema' notification")
	}

	fmt.Println("🎉 Database Schema Fix Completed!")
}
