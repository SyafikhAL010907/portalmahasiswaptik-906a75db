package main

import (
	"log"

	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/config"
	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/models"
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

	log.Println("🔄 Applying Unique Index Migration...")

	// Force migrate WeeklyDue to add the new index
	if err := db.AutoMigrate(&models.WeeklyDue{}); err != nil {
		log.Fatalf("❌ AutoMigrate failed: %v", err)
	}

	log.Println("✅ Unique Index added! 'upsert' should work now.")
}
