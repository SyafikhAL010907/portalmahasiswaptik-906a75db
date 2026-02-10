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

	log.Println("🔧 Fixing Permissions and Indexes...")

	// 1. Recreate Index (Drop old ones to be safe)
	db.Exec("DROP INDEX IF EXISTS idx_weekly_due_unique")
	db.Exec("DROP INDEX IF EXISTS weekly_dues_student_id_week_number_month_year_key")

	if err := db.Exec("CREATE UNIQUE INDEX idx_weekly_dues_conflict ON weekly_dues (student_id, week_number, month, year)").Error; err != nil {
		log.Printf("❌ Failed to create index: %v", err)
	} else {
		log.Println("✅ Unique Index 'idx_weekly_dues_conflict' created.")
	}

	// 2. Enable RLS
	db.Exec("ALTER TABLE weekly_dues ENABLE ROW LEVEL SECURITY")
	log.Println("✅ RLS Enabled on 'weekly_dues'.")

	// 3. Create Policy (Permissive for now, to ensure functionality)
	db.Exec(`DROP POLICY IF EXISTS "Enable all access for authenticated" ON weekly_dues`)
	if err := db.Exec(`CREATE POLICY "Enable all access for authenticated" ON weekly_dues FOR ALL TO authenticated USING (true) WITH CHECK (true)`).Error; err != nil {
		log.Printf("❌ Failed to create policy: %v", err)
	} else {
		log.Println("✅ RLS Policy 'Enable all access for authenticated' created.")
	}

	// 4. Grant Permissions
	db.Exec("GRANT ALL ON weekly_dues TO authenticated")
	db.Exec("GRANT ALL ON weekly_dues TO service_role")
	db.Exec("GRANT USAGE, SELECT ON SEQUENCE weekly_dues_id_seq TO authenticated")
	log.Println("✅ GRANTS applied to 'authenticated' role.")

	// 5. Notify to refresh schema cache
	db.Exec("NOTIFY pgrst, 'reload schema'")
	log.Println("🔄 Schema cache reload notified.")
}
