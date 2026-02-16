package main

import (
	"log"

	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/config"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	db, err := config.InitDatabase()
	if err != nil {
		log.Fatalf("❌ Failed to connect: %v", err)
	}

	query := `INSERT INTO global_configs (key, value) VALUES ('billing_selected_month', '0') ON CONFLICT (key) DO NOTHING;`
	if err := db.Exec(query).Error; err != nil {
		log.Fatalf("❌ Failed to seed: %v", err)
	}

	log.Println("✅ SQL Seed executed successfully!")
}
