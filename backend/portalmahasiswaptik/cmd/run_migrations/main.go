package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	_ = godotenv.Load()
	_ = godotenv.Load("../.env")
	_ = godotenv.Load("../../.env")

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL is missing")
	}

	// Direct connection fix
	if strings.Contains(dbURL, ":6543") {
		dbURL = strings.Replace(dbURL, ":6543", ":5432", 1)
		dbURL = strings.Replace(dbURL, "pgbouncer=true", "pgbouncer=false", 1)
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	migrationDir := "../../supabase/migrations"
	files, err := os.ReadDir(migrationDir)
	if err != nil {
		// Try alternative path
		migrationDir = "supabase/migrations"
		files, err = os.ReadDir(migrationDir)
		if err != nil {
			log.Fatal("Could not find migrations directory")
		}
	}

	var sqlFiles []string
	for _, f := range files {
		if !f.IsDir() && strings.HasSuffix(f.Name(), ".sql") {
			sqlFiles = append(sqlFiles, f.Name())
		}
	}
	sort.Strings(sqlFiles)

	fmt.Printf("🔍 Found %d migration files. Starting execution...\n", len(sqlFiles))

	for _, fileName := range sqlFiles {
		fmt.Printf("🚀 Executing: %s\n", fileName)
		content, err := os.ReadFile(filepath.Join(migrationDir, fileName))
		if err != nil {
			log.Printf("❌ Failed to read %s: %v", fileName, err)
			continue
		}

		_, err = db.ExecContext(context.Background(), string(content))
		if err != nil {
			log.Printf("❌ Error in %s: %v", fileName, err)
		} else {
			fmt.Printf("✅ Success: %s\n", fileName)
		}
	}

	fmt.Println("🎉 All migrations finished.")
}
