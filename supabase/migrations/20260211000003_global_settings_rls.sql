-- ==========================================
-- SCRIPT: Global Settings RLS Policy
-- DESCRIPTION: Mengatur akses READ (Semua User) dan UPDATE (Hanya Admin)
-- TABLE: global_settings
-- ==========================================

-- 1. Pastikan RLS Aktif pada tabel global_settings
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

-- 2. Hapus Policy Lama (Jika ada, untuk menghindari duplikasi/konflik)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.global_settings;
DROP POLICY IF EXISTS "Enable update for admins only" ON public.global_settings;

-- 3. Policy SELECT (READ)
-- Aturan: Semua user yang sudah login (authenticated) BOLEH membaca.
-- Alasan: Semua user butuh tahu bulan aktif untuk sinkronisasi tampilan dashboard mereka.
CREATE POLICY "Enable read access for all users"
ON public.global_settings
FOR SELECT
TO authenticated
USING (true);

-- 4. Policy UPDATE (WRITE)
-- Aturan: Hanya user dengan role 'admin_dev' atau 'admin_kelas' yang boleh update.
-- Validasi: Mengecek tabel user_roles berdasarkan auth.uid() user yang sedang login.
CREATE POLICY "Enable update for admins only"
ON public.global_settings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND (user_roles.role = 'admin_dev' OR user_roles.role = 'admin_kelas')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND (user_roles.role = 'admin_dev' OR user_roles.role = 'admin_kelas')
  )
);

-- Note: Jika ingin menggunakan fungsi helper is_admin, query bisa disederhanakan, 
-- tapi direct select ke user_roles lebih aman dan eksplisit dalam script ini.
