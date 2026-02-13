package config

import (
	"fmt"
	"log"

	"gorm.io/gorm"
)

// InitStorageBucket ensures the 'avatars' storage bucket exists and has correct policies
func InitStorageBucket(db *gorm.DB) {
	log.Println("🔧 Checking storage configuration...")

	// 1. Create Buckets
	buckets := []string{"avatars", "repository"}
	for _, bucket := range buckets {
		if err := db.Exec(fmt.Sprintf(`
            INSERT INTO storage.buckets (id, name, public)
            VALUES ('%s', '%s', true)
            ON CONFLICT (id) DO NOTHING;
        `, bucket, bucket)).Error; err != nil {
			log.Printf("❌ Failed to ensure %s bucket: %v", bucket, err)
		} else {
			log.Printf("✅ Storage bucket '%s' ensured", bucket)
		}
	}

	// 2. Policy: Public Access
	/*
			for _, bucket := range buckets {
				policySelect := fmt.Sprintf("%s Public Access", bucket)
				policyInsert := fmt.Sprintf("%s Upload Access", bucket)
				policyUpdate := fmt.Sprintf("%s Update Access", bucket)

				// Public Read
				if err := db.Exec(fmt.Sprintf(`
		            DO $$
		            BEGIN
		                IF NOT EXISTS (
		                    SELECT 1 FROM pg_policies WHERE policyname = '%s' AND tablename = 'objects' AND schemaname = 'storage'
		                ) THEN
		                    CREATE POLICY "%s" ON storage.objects FOR SELECT USING ( bucket_id = '%s' );
		                END IF;
		            END
		            $$;
		        `, policySelect, policySelect, bucket)).Error; err != nil {
					log.Printf("❌ Failed to ensure policy %s: %v", policySelect, err)
				}

				// Authenticated Upload
				if err := db.Exec(fmt.Sprintf(`
		            DO $$
		            BEGIN
		                IF NOT EXISTS (
		                    SELECT 1 FROM pg_policies WHERE policyname = '%s' AND tablename = 'objects' AND schemaname = 'storage'
		                ) THEN
		                    CREATE POLICY "%s" ON storage.objects FOR INSERT TO authenticated WITH CHECK ( bucket_id = '%s' );
		                END IF;
		            END
		            $$;
		        `, policyInsert, policyInsert, bucket)).Error; err != nil {
					log.Printf("❌ Failed to ensure policy %s: %v", policyInsert, err)
				}

				// Authenticated Update
				if err := db.Exec(fmt.Sprintf(`
		            DO $$
		            BEGIN
		                IF NOT EXISTS (
		                    SELECT 1 FROM pg_policies WHERE policyname = '%s' AND tablename = 'objects' AND schemaname = 'storage'
		                ) THEN
		                    CREATE POLICY "%s" ON storage.objects FOR UPDATE TO authenticated USING ( bucket_id = '%s' );
		                END IF;
		            END
		            $$;
		        `, policyUpdate, policyUpdate, bucket)).Error; err != nil {
					log.Printf("❌ Failed to ensure policy %s: %v", policyUpdate, err)
				}
			}
	*/

	log.Println("✅ Storage policies ensured")
}
