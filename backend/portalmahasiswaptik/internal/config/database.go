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
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
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
	var count int64
	db.Model(&models.GlobalConfig{}).Where("key = ?", "billing_start_month").Count(&count)
	if count == 0 {
		db.Create(&models.GlobalConfig{Key: "billing_start_month", Value: "1"})
	}

	db.Model(&models.GlobalConfig{}).Where("key = ?", "billing_end_month").Count(&count)
	if count == 0 {
		db.Create(&models.GlobalConfig{Key: "billing_end_month", Value: "6"})
	}

	return nil
}
