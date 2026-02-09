package config

import (
	"log"

	"gorm.io/gorm"
)

// InitStorageBucket ensures the 'avatars' storage bucket exists and has correct policies
func InitStorageBucket(db *gorm.DB) {
	log.Println("🔧 Checking storage configuration...")

	// 1. Create Bucket
	if err := db.Exec(`
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('avatars', 'avatars', true)
        ON CONFLICT (id) DO NOTHING;
    `).Error; err != nil {
		log.Printf("❌ Failed to ensure avatars bucket: %v", err)
	} else {
		log.Println("✅ Storage bucket 'avatars' ensured")
	}

	// 2. Policy: Public Access
	// Drop existing first to avoid duplicate errors if names clash,
	// or just use ON CONFLICT DO NOTHING if policies supported it easily (Postgres policies don't support ON CONFLICT directly like insert)
	// A simple way is to try creating, ignore error if exists.

	// Better: Check if policy exists, if not create. But raw Exec is easier.
	// We will wrap in DO block to handle existence check

	// Policy: Public Read
	db.Exec(`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies WHERE policyname = 'Avatar Public Access' AND tablename = 'objects' AND schemaname = 'storage'
            ) THEN
                CREATE POLICY "Avatar Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'avatars' );
            END IF;
        END
        $$;
    `)

	// Policy: Authenticated Upload
	db.Exec(`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies WHERE policyname = 'Avatar Upload Access' AND tablename = 'objects' AND schemaname = 'storage'
            ) THEN
                CREATE POLICY "Avatar Upload Access" ON storage.objects FOR INSERT TO authenticated WITH CHECK ( bucket_id = 'avatars' );
            END IF;
        END
        $$;
    `)

	// Policy: Authenticated Update
	db.Exec(`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies WHERE policyname = 'Avatar Update Access' AND tablename = 'objects' AND schemaname = 'storage'
            ) THEN
                CREATE POLICY "Avatar Update Access" ON storage.objects FOR UPDATE TO authenticated USING ( bucket_id = 'avatars' );
            END IF;
        END
        $$;
    `)

	log.Println("✅ Storage policies ensured")
}
