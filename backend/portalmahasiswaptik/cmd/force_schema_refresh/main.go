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

	log.Println("🔨 Forcing Schema Refresh via DDL...")

	// 1. Add Dummy Column
	log.Println("👉 Adding temporary column '_trigger_refresh'...")
	if err := db.Exec("ALTER TABLE weekly_dues ADD COLUMN IF NOT EXISTS _trigger_refresh text").Error; err != nil {
		log.Printf("❌ Failed to add column: %v", err)
	} else {
		log.Println("✅ Temporary column added.")
	}

	// 2. Notify (Just in case)
	db.Exec("NOTIFY pgrst, 'reload schema'")

	// 3. Drop Dummy Column
	log.Println("👉 Dropping temporary column...")
	if err := db.Exec("ALTER TABLE weekly_dues DROP COLUMN IF EXISTS _trigger_refresh").Error; err != nil {
		log.Printf("❌ Failed to drop column: %v", err)
	} else {
		log.Println("✅ Temporary column dropped.")
	}

	// 4. Notify Again
	db.Exec("NOTIFY pgrst, 'reload schema'")

	log.Println("🎉 Schema Refresh Operations Complete. Try Frontend.")
}
