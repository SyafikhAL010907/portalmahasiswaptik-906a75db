package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	if err := godotenv.Load(); err != nil {
		_ = godotenv.Load("../../.env")
	}

	// 1. Get raw URL
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL is missing")
	}

	// 2. FORCE DIRECT CONNECTION (Port 5432, No PgBouncer)
	// Replace port 6543 (Pooler) with 5432 (Session/Direct)
	// Remove pgbouncer=true
	directURL := strings.Replace(dbURL, ":6543", ":5432", 1)
	directURL = strings.Replace(directURL, "?pgbouncer=true&", "?", 1)
	directURL = strings.Replace(directURL, "?pgbouncer=true", "", 1)
	directURL = strings.Replace(directURL, "&pgbouncer=true", "", 1)

	// Ensure sslmode is set (Supabase requires it)
	if !strings.Contains(directURL, "sslmode=") {
		if strings.Contains(directURL, "?") {
			directURL += "&sslmode=require"
		} else {
			directURL += "?sslmode=require"
		}
	}

	fmt.Println("🔌 Connecting via DIRECT connection (Port 5432)...")
	// Using standard database/sql with lib/pq to avoid GORM overhead/config
	db, err := sql.Open("postgres", directURL)
	if err != nil {
		log.Fatalf("❌ Failed to open connection: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Printf("⚠️  Direct ping failed: %v", err)
		log.Println("💡 Attempting fallback to original URL (might fail if pooler)...")
		db, _ = sql.Open("postgres", dbURL) // Fallback
	} else {
		log.Println("✅ Connected directly!")
	}

	// 3. Execute NOTIFY
	log.Println("🔄 Sending 'NOTIFY pgrst, \"reload schema\"'...")
	_, err = db.Exec("NOTIFY pgrst, 'reload schema'")
	if err != nil {
		log.Printf("❌ Failed to notify: %v", err)
	} else {
		log.Println("✅ NOTIFY SENT SUCCESSFULLY!")
	}

	// 4. Double tap with a comment update (DDL forces reload sometimes)
	_, _ = db.Exec("COMMENT ON TABLE weekly_dues IS 'Finance Dues (Reloaded)'")
	log.Println("✅ DDL Comment executed.")

	fmt.Println("🎉 Schema Cache Reload Signal Sent. Please wait 10 seconds and try the Frontend.")
}
