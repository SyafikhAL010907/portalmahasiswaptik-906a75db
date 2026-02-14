package main

import (
	"log"

	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/config"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env
	if err := godotenv.Load("../../.env"); err != nil {
		log.Println("Warning: .env file not found, relying on system env")
	}

	// Connect to DB
	db, err := config.InitDatabase()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	log.Println("Connected to Database. Executing migration...")

	// SQL for global_configs
	migrationSQL := `
	-- Create global_configs table for system-wide settings
	CREATE TABLE IF NOT EXISTS global_configs (
		key VARCHAR(255) PRIMARY KEY,
		value TEXT NOT NULL,
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
	);

	-- Insert default billing range if not exists
	INSERT INTO global_configs (key, value) VALUES
	('billing_start_month', '1'),
	('billing_end_month', '6')
	ON CONFLICT (key) DO NOTHING;
	`

	if err := db.Exec(migrationSQL).Error; err != nil {
		log.Fatalf("Migration failed: %v", err)
	}

	log.Println("✅ Migration executed successfully: global_configs table created/ensured.")
}
