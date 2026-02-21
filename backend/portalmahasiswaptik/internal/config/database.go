package config

import (
	"fmt"
	"log"
	"os"

	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// InitDatabase initializes the PostgreSQL connection via GORM
func InitDatabase() (*gorm.DB, error) {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		return nil, fmt.Errorf("DATABASE_URL environment variable is required")
	}

	// Configure GORM logger
	gormLogger := logger.Default.LogMode(logger.Info)
	if os.Getenv("APP_ENV") == "production" {
		gormLogger = logger.Default.LogMode(logger.Error)
	}

	// Open database connection
	db, err := gorm.Open(postgres.New(postgres.Config{
		DSN:                  dsn,
		PreferSimpleProtocol: true, // Force simple protocol for PgBouncer compatibility
	}), &gorm.Config{
		Logger:                 gormLogger,
		SkipDefaultTransaction: true,  // Improve performance
		PrepareStmt:            false, // Required for PgBouncer / Session stability
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Get underlying SQL DB for connection pool configuration
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get underlying DB: %w", err)
	}

	// Configure connection pool
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)

	// Test connection
	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	log.Println("✅ Database connected successfully")

	// Auto-migrate models (optional - tables already exist in Supabase)
	// Uncomment if you want GORM to sync schema
	if err := autoMigrate(db); err != nil {
		log.Printf("Warning: Auto-migration failed: %v", err)
	}

	return db, nil
}

// autoMigrate runs GORM auto-migration for all models
func autoMigrate(db *gorm.DB) error {
	// Force create table if not exists (Safety Check)
	db.Exec(`CREATE TABLE IF NOT EXISTS global_configs (
		key VARCHAR(255) PRIMARY KEY,
		value TEXT NOT NULL,
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	)`)

	// ENSURE updated_at column exists (in case table was created without it previously)
	db.Exec(`ALTER TABLE global_configs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`)

	// USER REQUESTED: Force add billing_selected_month column (even if we use key-value store, we follow owner's lead)
	db.Exec(`ALTER TABLE global_configs ADD COLUMN IF NOT EXISTS billing_selected_month INT DEFAULT 0`)

	err := db.AutoMigrate(
		&models.GlobalConfig{}, // Moved to TOP for priority
		&models.Class{},
		&models.Profile{},
		&models.UserRole{},
		&models.Subject{},
		&models.Meeting{},
		&models.AttendanceSession{},
		&models.AttendanceRecord{},
		&models.Transaction{},
		&models.WeeklyDue{},
		&models.Announcement{},
		&models.Material{},
	)

	if err != nil {
		return err
	}

	// Seed default global configs
	// Use Raw SQL for seeding to avoid any GORM model issues durante startup
	db.Exec(`INSERT INTO global_configs (key, value) VALUES ('billing_start_month', '1') ON CONFLICT (key) DO NOTHING`)
	db.Exec(`INSERT INTO global_configs (key, value) VALUES ('billing_end_month', '6') ON CONFLICT (key) DO NOTHING`)
	db.Exec(`INSERT INTO global_configs (key, value) VALUES ('billing_selected_month', '0') ON CONFLICT (key) DO NOTHING`)

	// ✅ USER REQUESTED: Database Cascading Delete (Enforce Integrity)
	// 1. subjects -> semesters
	db.Exec(`
		DO $$ 
		BEGIN 
			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_subjects_semesters') THEN
				ALTER TABLE subjects 
				ADD CONSTRAINT fk_subjects_semesters 
				FOREIGN KEY (semester) REFERENCES semesters(id) 
				ON DELETE CASCADE;
			END IF;
		END $$;
	`)

	// 2. materials -> subjects
	db.Exec(`
		DO $$ 
		BEGIN 
			-- Drop existing fkey to ensure it's updated to CASCADE
			IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'materials_subject_id_fkey') THEN
				ALTER TABLE materials DROP CONSTRAINT materials_subject_id_fkey;
			END IF;
			
			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_materials_subjects') THEN
				ALTER TABLE materials 
				ADD CONSTRAINT fk_materials_subjects 
				FOREIGN KEY (subject_id) REFERENCES subjects(id) 
				ON DELETE CASCADE;
			END IF;
		END $$;
	`)

	println("✅ Manual SQL Seed Completed")
	println("✅ autoMigrate completed")
	return nil
}
