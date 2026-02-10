package main

import (
	"fmt"
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

	var columns []string
	db.Raw("SELECT column_name FROM information_schema.columns WHERE table_name = 'weekly_dues'").Scan(&columns)

	log.Println("🔍 Columns in 'weekly_dues':")
	foundMonth := false
	foundYear := false
	for _, col := range columns {
		fmt.Printf(" - %s\n", col)
		if col == "month" {
			foundMonth = true
		}
		if col == "year" {
			foundYear = true
		}
	}

	if foundMonth && foundYear {
		log.Println("✅ Columns 'month' and 'year' EXIST!")
	} else {
		log.Println("❌ Columns 'month' and/or 'year' are MISSING!")
		log.Println("💡 Running AutoMigrate now...")
		// Force migrate if missing
		if err := db.AutoMigrate(&models.WeeklyDue{}); err != nil {
			log.Printf("❌ AutoMigrate failed: %v", err)
		} else {
			log.Println("✅ AutoMigrate executed. Please restart schema cache.")
		}
	}
}
