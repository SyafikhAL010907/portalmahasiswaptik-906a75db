# 🏗️ Arsitektur Proyek: Portal Mahasiswa PTIK 2025 (The Ultimate Mega-Structure)

Selamat datang di peta arsitektur paling komprehensif untuk **Portal Mahasiswa PTIK 2025**. Dokumen ini dirancang sebagai master-reference yang mencakup setiap folder, sub-folder, dan file utama yang membangun ekosistem portal kita.

---

## 📂 Exhaustive Project Directory Tree

### 📂 Root Project Level
Pusat konfigurasi dan integraa si antar layanan.

```plaintext
WebAngkatan2025/
├── .vscode/                    <= Konfigurasi IDE (Snippets & Settings)
├── backend/                    <= [CORE BACKEND] Golang Fiber Server
├── frontend/                   <= [CORE FRONTEND] React/Vite/Tailwind
├── scripts/                    <= [UTILS] sync-drive.cjs (Sinkronisasi Cloud)
├── supabase/                   <= [INFRA] Konfigurasi Database & Migrasi SQL
│   ├── config.toml             <= Konfigurasi Local Supabase
│   ├── functions/              <= Edge Functions (Serverless)
│   └── migrations/             <= Kumpulan file .sql untuk skema table
├── .gitignore                  <= Daftar file yang diabaikan Git
├── README.md                   <= Dokumentasi awal proyek
├── package.json                <= Root Dependencies & Workspace Config
└── bun.lockb / package-lock    <= Lockfile untuk konsistensi library
```

### 💎 FrontEnd Deep-Dive (`frontend/portalmahasiswaptik/`)
Dashboard Interaktif dengan arsitektur berbasis Component & Context.

```plaintext
src/
├── App.tsx                     <= [ROUTING HUB] Master Route & Role Guard
├── main.tsx                    <= Entry point React & Provider Setup
├── index.css / App.css         <= Global Styles & Tailwind Directives
├── pages/                      <= [VIEW LAYER] Seluruh Halaman Utama
│   ├── Dashboard.tsx           <= Ringkasan Data (Saldo, Absen, IPK)
│   ├── Finance.tsx             <= Manajemen Kas & Matrix Iuran
│   ├── Payment.tsx             <= Portal Pembayaran & Monitoring
│   ├── AttendanceHistory.tsx   <= Log Riwayat Presensi
│   ├── QRGenerator.tsx         <= Pembuat Token Absen (Lecturer)
│   ├── ScanQR.tsx              <= Entry Absensi (Student)
│   ├── Repository.tsx          <= Library Materi & Tugas
│   ├── Schedule.tsx            <= Penjadwalan Kuliah
│   ├── IPKSimulator.tsx        <= Simulasi Indeks Prestasi
│   ├── Leaderboard.tsx         <= Ranking Partisipasi Mhs
│   ├── Announcements.tsx       <= Portal Berita & Blast Info
│   ├── Competitions.tsx        <= Informasi Lomba Eksternal
│   ├── Profile.tsx             <= Pengaturan Identitas & Avatar
│   ├── ChangePassword.tsx      <= Autentikasi KeamananAkun
│   ├── Login.tsx               <= Gerbang Masuk (Auth UI)
│   ├── Landing.tsx             <= Wajah Depan Premium
│   ├── Features.tsx            <= Showcase Fitur Portal
│   ├── About.tsx               <= Info Pengembang & Visi
│   └── admin/                  <= Folder khusus modul AdminDev
├── components/
│   ├── ui/                     <= [SHADCN] 50+ Komponen Atom (Button, Card, Table, dll)
│   ├── dashboard/              <= Sidebar.tsx, RoleBasedSidebar.tsx, Navbar.tsx
│   ├── auth/                   <= LoginForm, RegisterForm, ProtectedRoute
│   ├── FloatingHub/            <= Widget Shortcut Quick-Access (AI, Chat, IDE)
│   └── game/                   <= Modul Gamifikasi (CoinDisplay, dll)
├── contexts/                   <= [STATE] AuthContext.tsx, ThemeContext.tsx
├── hooks/                      <= [LOGIC] useAttendanceStats.ts, usePaymentMonitor.ts
├── lib/                        <= [CORE LIB] navigationConfig.ts, utils.ts, client.ts
├── integrations/supabase/      <= Koneksi API & Definisi Type Database
└── types/                      <= Definisi Interface TypeScript Global
```

### ⚙️ BackEnd Deep-Dive (`backend/portalmahasiswaptik/`)
High-performance server dengan logika bisnis yang sangat granular.

```plaintext
internal/
├── handlers/                   <= [THE BRAIN] Logic Per Modul
│   ├── finance/                <= Modul Keuangan Granular
│   │   ├── summary.go          <= Logic Dashboard & Chart Financial
│   │   ├── transaction.go      <= CRUD Transaksi Kas
│   │   ├── dues.go             <= Matrix Iuran Mingguan
│   │   ├── balance.go          <= Validasi Saldo Real-time
│   │   └── finance_export.go   <= Engine Laporan Excel (xlsx)
│   ├── attendance/             <= Modul Absensi & Geolocation
│   │   ├── attendance.go       <= Logic Token & Haversine Distance
│   │   └── attendance_export.go<= Engine Rekap Kehadiran
│   ├── academic/               <= Modul Dokumen & Jadwal
│   ├── admin/                  <= User Control & Role Security
│   ├── announcements/          <= Info Broadcast Logic
│   ├── user.go                 <= User Profile & Auth Bridge
│   └── config_handler.go       <= Global System Configuration
├── models/                     <= Definisi Struct GORM & Skema DB
├── middleware/                 <= Guard auth.go (JWT & RBAC Validation)
└── server.go                   <= Konfigurasi Fiber & Middleware global

cmd/ (Daftar Entry-Points & DB Utilities)
├── server/                     <= Main Server Application
├── migrate/                    <= Auto-migrasi skema database
├── reset_finance/              <= Reset data keuangan (Dev Only)
├── seed_config/                <= Inisialisasi data awal (Seeding)
├── inspect_db / diag/          <= Tools diagnosa database
└── [20+ Folder Utils Lainnya]  <= Berbagai tools otomatisasi skema & RLS
```

---

## 🌊 Alur Aplikasi & Fitur Frontend (The Ultimate Journey)

Dokumen ini mendetailkan setiap transisi halaman dan interaksi fitur yang tersedia di sisi pengguna secara kronologis.

### 🏁 1. The Entrance (Landing & Login)
-   **Halaman Landing (`Landing.tsx`)**: 
    - Titik awal (Index) aplikasi. Menampilkan hero section premium dengan statistik real-time (Total Mahasiswa, Saldo Kas, Persentase Absensi).
    - Navigasi menuju fitur showcase, info pengembang, dan tombol **"Masuk ke Portal"**.
-   **Halaman Login (`Login.tsx`)**:
    - User memasukkan **NIM/NIP** dan **Password**.
    - Terdapat bypass bantuan via WhatsApp Support jika user lupa akses.
    - **Proses**: Sistem memvalidasi kredensial via Supabase Auth. Jika berhasil, sistem menarik data `profile` (termasuk Role & Class) dan mengarahkan user ke `/dashboard`.

### 🖥️ 2. The Command Center (Dashboard & Sidebar)
Setelah login, user disambut oleh **Dashboard** yang terintegrasi dengan **RoleBasedSidebar**.

-   **Dashboard Hub (`Dashboard.tsx`)**:
    - Menampilkan *Dynamic Welcome Card* yang menyebut nama user.
    - Quick Stats: Sisa Koin (Gamifikasi), Status Kehadiran Terakhir, dan Shortcut Menu.
-   **Sidebar Interaction**:
    - **Theme Switcher**: Tombol di bagian bawah sidebar untuk beralih antara **Dark Mode** (OLED Black) dan **Light Mode** (Clean White) secara instan.
    - **Role-Based Menus**:
        - `Akademik`: Akses jadwal kuliah, repository materi kuliah, dan simulator IPK untuk prediksi kelulusan.
        - `Absensi`: Dosen membuat QR Token, Mahasiswa melakukan Scan QR dengan verifikasi radius GPS (150m).
        - `Keuangan`: Visualisasi arus kas angkatan dan portal pembayaran iuran mingguan.
        - `Informasi`: Hub pengumuman blast, info lomba eksternal, dan leaderboard keaktifan.
        - `Settings`: Personalisasi profil, avatar, dan fitur ganti password keamanan.

### 🛸 3. The Specialized Tools (Floating Hub)
Fitur *Floating* (Melayang) di pojok kanan sebagai *power-tools* tambahan:

-   **🤖 AI Asisten PTIK (`AIView.tsx`)**:
    - **Engine**: Menggunakan Google Gemini 1.5 Flash.
    - **Fungsi**: Teman diskusi tugas, debugging kode, dan tanya jawab materi PTIK (Bahasa santai "Bro").
    - **Fitur**: Copy-to-IDE (Transfer kode langsung ke editor), Markdown support.
-   **💬 Global Chat (`GlobalChat.tsx`)**:
    - Ruang kolaborasi real-time untuk seluruh mahasiswa angkatan 2025.
    - Mendukung pesan instan, emoji, dan sinkronisasi aktivitas.
-   **💻 Monster Coding IDE (`IDEView.tsx`)**:
    - **Virtual Lab**: Integrasi OneCompiler Engine (20+ bahasa pemrograman).
    - **Snippet Vault**: Brankas simpan/restore kode ke database Supabase agar kodingan aman lintas perangkat.

---

## ⚙️ Penjelasan Logika Sistem (Backend Integration)

### 📊 1. Alur Sinkronisasi Keuangan
-   Backend (`finance/summary.go`) menggabungkan data dari `transactions` (manual) dan `weekly_dues` (otomatis) untuk menghasilkan saldo akurat secara real-time.
-   Terdapat validasi level database (RLS) agar user hanya bisa melihat data keuangan yang diizinkan sesuai perannya.

### 📍 2. Alur Presensi Precision (Anti-Titip Absen)
-   Sistem di `attendance.go` menggunakan rumus **Haversine** untuk membandingkan koordinat GPS Mahasiswa dengan koordinat Kampus UNJ. Jika jarak > 150 meter dari titik pusat, presensi ditolak otomatis.

### 🔐 3. Alur Keamanan RBAC & JWT
-   Setiap request API ke backend Golang divalidasi oleh `middleware/auth.go`.
-   Token JWT yang berisi klaim Role memastikan user tidak bisa mengakses API yang bukan haknya (contoh: Mahasiswa dilarang keras akses handler `admin/`).

---

## 💡 Arsitektur Insight (Presentasi Juri)

> "Portal ini mengadopsi **Architectural Integrity** dan **One-Stop Service**. Kami tidak hanya membangun aplikasi CRUD, tapi menciptakan ekosistem digital yang memiliki keamanan berlapis (DB RLS + Backend RBAC) dan fitur pendukung produktivitas (AI & IDE) untuk mahasiswa PTIK 2025."

---

*Tertanda,*
**Senior Fullstack Architect @ Portal Mahasiswa Team**

