package main

import (
	"fmt"
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

	// 1. Check Indexes
	log.Println("🔍 Checking Indexes on 'weekly_dues'...")
	rows, err := db.Raw("SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'weekly_dues'").Rows()
	if err != nil {
		log.Fatalf("Error querying indexes: %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var name, def string
		rows.Scan(&name, &def)
		fmt.Printf(" - Index: %s\n   Def: %s\n", name, def)
	}

	// 2. Check RLS Policies
	log.Println("\n🔍 Checking RLS Policies on 'weekly_dues'...")
	rows2, err := db.Raw("SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'weekly_dues'").Rows()
	if err != nil {
		log.Fatalf("Error querying policies: %v", err)
	}
	defer rows2.Close()

	count := 0
	for rows2.Next() {
		count++
		var name, cmd, qual, withCheck string
		rows2.Scan(&name, &cmd, &qual, &withCheck)
		fmt.Printf(" - Policy: %s (CMD: %s)\n   Using: %s\n   WithCheck: %s\n", name, cmd, qual, withCheck)
	}

	if count == 0 {
		log.Println("⚠️  NO RLS POLICIES FOUND! (If RLS is enabled, no one can access)")
	}

	// 3. Check if RLS is enabled
	var rlsEnabled bool
	db.Raw("SELECT relrowsecurity FROM pg_class WHERE relname = 'weekly_dues'").Scan(&rlsEnabled)
	fmt.Printf("\n🔒 RLS Enabled on 'weekly_dues': %v\n", rlsEnabled)
}
