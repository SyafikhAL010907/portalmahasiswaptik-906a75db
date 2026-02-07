import { 
  Wallet, 
  Users, 
  Calendar, 
  CheckCircle2, 
  Sun,
  Cloud,
  ArrowRight 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatCard } from '@/components/dashboard/StatCard';
import { ScheduleCard } from '@/components/dashboard/ScheduleCard';
import { AnnouncementCard } from '@/components/dashboard/AnnouncementCard';
import { DigitalIDCard } from '@/components/dashboard/DigitalIDCard';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react'; // Tambah ini
import { supabase } from '@/integrations/supabase/client'; // Tambah ini (sesuaikan path)

// Mock data (TETAP SAMA, TIDAK DIUBAH)
const todaySchedule = [
  {
    subject: 'Pemrograman Web Lanjut',
    time: '08:00 - 10:30',
    room: 'Lab Komputer 3',
    lecturer: 'Dr. Bambang Susilo, M.Kom',
    isActive: true,
  },
  {
    subject: 'Basis Data',
    time: '13:00 - 15:30',
    room: 'Ruang 405',
    lecturer: 'Prof. Sri Wahyuni, M.Sc',
    isNext: true,
  },
  {
    subject: 'Jaringan Komputer',
    time: '16:00 - 18:00',
    room: 'Lab Jarkom',
    lecturer: 'Agus Setiawan, M.T',
  },
];

const announcements = [
  {
    title: 'Pengumpulan Tugas Akhir Web',
    date: '15 Jan 2025',
    excerpt: 'Deadline pengumpulan tugas akhir mata kuliah Pemrograman Web diperpanjang hingga hari Jumat.',
    isNew: true,
    priority: 'important' as const,
  },
  {
    title: 'Iuran Kas Minggu ke-3 Januari',
    date: '14 Jan 2025',
    excerpt: 'Harap segera melunasi iuran kas mingguan. Batas pembayaran hari Sabtu.',
    isNew: true,
    priority: 'normal' as const,
  },
  {
    title: 'Info Lomba UI/UX Nasional',
    date: '12 Jan 2025',
    excerpt: 'Lomba desain UI/UX tingkat nasional dengan total hadiah 50 juta rupiah.',
    priority: 'normal' as const,
  },
];

export default function Dashboard() {
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Selamat Pagi' : currentHour < 17 ? 'Selamat Siang' : 'Selamat Malam';

  // --- LOGIC BARU: AMBIL DATA USER DARI SUPABASE ---
  const [namaUser, setNamaUser] = useState("Loading...");
  const [roleUser, setRoleUser] = useState("Mahasiswa");
  const [kelasUser, setKelasUser] = useState("");

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Ambil Nama dari tabel profiles
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name') // Kalau lu udah nambah kolom class_name, tambahin di sini: 'full_name, class_name'
          .eq('user_id', user.id)
          .single();
        
        if (profileData) {
          setNamaUser(profileData.full_name);
          // setKelasUser(profileData.class_name || ""); // Un-comment kalau kolom udah ada
        }

        // Ambil Role dari tabel user_roles
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (roleData) {
          let displayRole = "Mahasiswa";
          if (roleData.role === "admin_dev") displayRole = "Super Admin";
          if (roleData.role === "admin_kelas") displayRole = "Admin Kelas";
          if (roleData.role === "admin_dosen") displayRole = "Dosen";
          setRoleUser(displayRole);
        }
      }
    };

    fetchUserData();
  }, []);
  // --- END LOGIC BARU ---

  return (
    <div className="space-y-8 pt-12 md:pt-0">
      {/* Greeting Section (YANG DIUBAH CUMA INI) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {greeting}, <span className="text-primary">{namaUser}</span>! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            {roleUser} {kelasUser} • {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        
        {/* Weather Widget (TETAP SAMA) */}
        <div className="flex items-center gap-3 glass-card rounded-2xl px-4 py-3">
          <Sun className="w-6 h-6 text-warning" />
          <div>
            <div className="text-sm font-medium text-foreground">28°C</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Cloud className="w-3 h-3" />
              Berawan
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid (TETAP SAMA - TIDAK DIUBAH) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Wallet}
          label="Saldo Kas"
          value="Rp 250.000"
          trend={{ value: '15%', positive: true }}
          iconBg="bg-success/10 text-success"
        />
        <StatCard
          icon={Calendar}
          label="Jadwal Hari Ini"
          value="3 Matkul"
          iconBg="bg-primary/10 text-primary"
        />
        <StatCard
          icon={CheckCircle2}
          label="Kehadiran"
          value="95%"
          trend={{ value: '2%', positive: true }}
          iconBg="bg-accent text-accent-foreground"
        />
        <StatCard
          icon={Users}
          label="Ranking Kelas"
          value="#2"
          iconBg="bg-warning/20 text-warning-foreground"
        />
      </div>

      {/* Main Content Grid (TETAP SAMA - TIDAK DIUBAH) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Schedule Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">Jadwal Hari Ini</h2>
            <Link to="/dashboard/schedule">
              <Button variant="ghost" size="sm" className="gap-1">
                Lihat Semua
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {todaySchedule.map((schedule, index) => (
              <ScheduleCard key={index} {...schedule} />
            ))}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Digital ID */}
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">Kartu Digital</h2>
            <DigitalIDCard
              name={namaUser !== "Loading..." ? namaUser : "Maulana Syafikh Alkhudri"} // Update biar nama di KTP juga dinamis kalau mau
              nim="1512625004"
              className="PTIK B 2025"
            />
          </div>

          {/* Quick Actions (TETAP SAMA) */}
          <div className="glass-card rounded-2xl p-5">
            <h3 className="font-semibold text-foreground mb-4">Aksi Cepat</h3>
            <div className="grid grid-cols-2 gap-3">
              <Link to="/dashboard/scan-qr">
                <Button variant="secondary" className="w-full h-auto flex-col py-4 gap-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs">Scan Absen</span>
                </Button>
              </Link>
              <Link to="/dashboard/payment">
                <Button variant="secondary" className="w-full h-auto flex-col py-4 gap-2">
                  <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-success" />
                  </div>
                  <span className="text-xs">Bayar Kas</span>
                </Button>
              </Link>
              <Link to="/dashboard/repository">
                <Button variant="secondary" className="w-full h-auto flex-col py-4 gap-2">
                  <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-warning-foreground" />
                  </div>
                  <span className="text-xs">Materi</span>
                </Button>
              </Link>
              <Link to="/dashboard/ipk-simulator">
                <Button variant="secondary" className="w-full h-auto flex-col py-4 gap-2">
                  <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                    <Users className="w-5 h-5 text-accent-foreground" />
                  </div>
                  <span className="text-xs">IPK Sim</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Announcements Section (TETAP SAMA) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Pengumuman Terbaru</h2>
          <Link to="/dashboard/announcements">
            <Button variant="ghost" size="sm" className="gap-1">
              Lihat Semua
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {announcements.map((announcement, index) => (
            <AnnouncementCard key={index} {...announcement} />
          ))}
        </div>
      </div>
    </div>
  );
}