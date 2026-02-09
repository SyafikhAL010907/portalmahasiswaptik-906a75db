import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from "@/components/ui/use-toast";
import {
  Loader2,
  Wallet,
  BookOpen,
  Clock,
  Trophy,
  ChevronRight,
  QrCode,
  FileText,
  Users,
  Bell,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  MapPin,
  User,
  CheckCircle2,
  Sun,
  Cloud,
  ArrowRight,
  ImagePlus,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/dashboard/StatCard';
import { AnnouncementCard } from '@/components/dashboard/AnnouncementCard';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from '@/contexts/AuthContext';

// Interfaces
interface ScheduleItem {
  id: string;
  subject_id: string;
  start_time: string;
  end_time: string;
  room: string;
  lecturer_id?: string;
  subjects?: { name: string };
  profiles?: { full_name: string };
}

export default function Dashboard() {
  const currentHour = new Date().getHours();
  const { user, profile, roles, refreshProfile } = useAuth();
  const greeting = currentHour < 12 ? 'Selamat Pagi' : currentHour < 17 ? 'Selamat Siang' : 'Selamat Malam';

  // --- STATE ---
  const [userName, setUserName] = useState('');
  const [userNim, setUserNim] = useState('');
  const [userClass, setUserClass] = useState(''); // e.g., "A"
  const [userRole, setUserRole] = useState("Mahasiswa");

  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(true);

  const [balance, setBalance] = useState<number>(0);
  const [isLoadingSaldo, setIsLoadingSaldo] = useState(true);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Widget States
  const [weather, setWeather] = useState<{ temp: number, condition: string, location: string } | null>(null);
  const [classRank, setClassRank] = useState<number | null>(null);
  const [topClass, setTopClass] = useState<{ name: string, total: number } | null>(null);
  const [isLoadingRank, setIsLoadingRank] = useState(true);

  // --- INITIAL LOAD ---
  useEffect(() => {
    fetchDashboardData();
    fetchRealtimeBalance();
    fetchWeather();
    fetchClassRank();

    // Realtime Rank Subscription
    const channel = supabase
      .channel('public:class_achievements_rank')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'class_achievements' }, () => {
        fetchClassRank();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ... (rest of imports/setup)

  const fetchClassRank = async () => {
    try {
      setIsLoadingRank(true);
      // Get all achievements to calculate rank
      const { data, error } = await supabase
        .from('class_achievements')
        .select(`classes ( name )`);

      if (error) throw error;

      // Group by class name
      const stats: Record<string, number> = {};
      data?.forEach((row: any) => {
        const cName = row.classes?.name;
        if (cName) {
          stats[cName] = (stats[cName] || 0) + 1;
        }
      });

      // Refined Logic using classes table
      const { data: allClasses } = await supabase.from('classes').select('name');
      allClasses?.forEach(c => {
        if (!stats[c.name]) stats[c.name] = 0;
      });

      // Sort desc
      const sorted = Object.entries(stats).sort(([, a], [, b]) => b - a);

      // Set Top Class
      if (sorted.length > 0) {
        setTopClass({ name: sorted[0][0], total: sorted[0][1] });
      }

      // Find current user styling in separate calculateRank if needed
      // But fetchDashboardData triggers calculateRank separately for user specific rank.
      // We'll keep calculateRank for "My Rank" if we wanted to show it, but User wants "Top Class".

    } catch (err) {
      console.error("Rank error:", err);
    } finally {
      setIsLoadingRank(false);
    }
  };

  // ...

  const getClassColor = (name: string) => {
    if (name?.includes('A')) return 'bg-primary/10 text-primary border-primary/20';
    if (name?.includes('B')) return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    if (name?.includes('C')) return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
    return 'bg-secondary text-secondary-foreground';
  };



  const getRoleDisplay = () => {
    if (userRole === "Super Admin") return "AdminDev";
    if (userRole === "Admin Kelas") return "Admin Kelas";
    if (userRole === "Dosen") return "Dosen";
    return "Mahasiswa";
  };

  const qrData = `${userName} - ${userNim} - ${userClass || getRoleDisplay()}`;

  const fetchWeather = () => {
    if (!navigator.geolocation) {
      fetchWeatherByCoords(-6.1947, 106.8794, "Kampus UNJ"); // Fallback
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        fetchWeatherByCoords(position.coords.latitude, position.coords.longitude, "Lokasi Anda");
      },
      (error) => {
        console.error("Geolocation error:", error);
        fetchWeatherByCoords(-6.1947, 106.8794, "Kampus UNJ"); // Fallback
      }
    );
  };

  const fetchWeatherByCoords = async (lat: number, lon: number, locationName: string) => {
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`);
      const data = await res.json();

      if (data.current) {
        const code = data.current.weather_code;
        let condition = "Cerah";
        if (code >= 1 && code <= 3) condition = "Berawan";
        if (code >= 45 && code <= 48) condition = "Berkabut";
        if (code >= 51 && code <= 82) condition = "Hujan";
        if (code >= 95) condition = "Badai";

        setWeather({
          temp: Math.round(data.current.temperature_2m),
          condition,
          location: locationName
        });
      }
    } catch (err) {
      console.error("Weather fetch error:", err);
    }
  };



  // ...
  const [dashboardCompetitions, setDashboardCompetitions] = useState<any[]>([]);
  const [dashboardAnnouncements, setDashboardAnnouncements] = useState<any[]>([]);

  // ...

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 0. Fetch Top Competitions & Announcements
      const { data: comps } = await supabase
        .from('competitions')
        .select('*')
        .order('badge', { ascending: false }) // Hot/New first (assuming alphabetical H > N > null, might need refinement if specific order needed, but this is a good start)
        .order('created_at', { ascending: false })
        .limit(2);

      const { data: anns } = await supabase
        .from('announcements')
        .select('*')
        .order('priority', { ascending: false }) // urgent > normal (u > n)? no, normal > important > urgent. alphabetical: u > n > i. 
        // We need specific order. Postgres sort by array index or case? 
        // For now let's just fetch latest and sort in JS, or assume 'urgent' > 'important' > 'normal'.
        // 'urgent' (u), 'important' (i), 'normal' (n). 
        // descending: u, n, i. This is wrong. 
        // Let's fetch more and filter/sort in JS for safety or use multiple sorts.
        // Actually, let's just order by is_new desc, then created_at desc for now as per "pinned" request (is_new?). 
        // User said: "utmakan pengumuman yang di sematkan atau di pin". We don't have 'is_pinned'. We have 'priority' and 'is_new'.
        // Let's assume 'priority' != 'normal' is pinned.
        .order('priority', { ascending: false }) // u > n > i
        .order('created_at', { ascending: false })
        .limit(5);

      if (comps) setDashboardCompetitions(comps);

      if (anns) {
        // Custom sort for announcements: Urgent > Important > Normal
        const priorityOrder = { 'urgent': 3, 'important': 2, 'normal': 1 };
        const sortedAnns = anns.sort((a, b) => {
          const pA = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
          const pB = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
          return pB - pA;
        });
        setDashboardAnnouncements(sortedAnns.slice(0, 2));
      }

      if (user) {
        // 1. Get Profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, nim, class_id, avatar_url')
          .eq('user_id', user.id)
          .single();

        let currentClassId = '';
        let className = ''; // Local var

        if (profile) {
          setUserName(profile.full_name);
          setUserNim(profile.nim);
          setAvatarUrl(profile.avatar_url);
          currentClassId = profile.class_id || '';

          // 2. Get Class Name if class_id exists
          if (profile.class_id) {
            const { data: classData } = await supabase
              .from('classes')
              .select('name')
              .eq('id', profile.class_id)
              .single();
            if (classData) {
              setUserClass(classData.name);
              className = classData.name;
            }
          }
        }

        // Trigger Rank Calculation with confirmed class name
        calculateRank(className);

        // 3. Get Role
        const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle();
        let isLecturer = false;

        if (roleData) {
          const roles: Record<string, string> = { admin_dev: "Super Admin", admin_kelas: "Admin Kelas", admin_dosen: "Dosen" };
          const roleName = roles[roleData.role] || "Mahasiswa";
          setUserRole(roleName);
          isLecturer = roleData.role === 'admin_dosen';

          if (roleName === "Dosen") {
            setUserClass('');
          }
        }

        // 4. Fetch Schedules
        await fetchTodaySchedule(currentClassId, isLecturer ? user.id : undefined);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setIsLoadingSchedule(false);
    }
  };

  // Separate function for calculating rank to be called when data is ready
  const calculateRank = async (myClassName: string) => {
    if (!myClassName) return; // Super Admin or Dosen might not have class
    try {
      const { data } = await supabase
        .from('class_achievements')
        .select(`classes ( name )`);

      const stats: Record<string, number> = {};
      data?.forEach((row: any) => {
        const cName = row.classes?.name;
        if (cName) stats[cName] = (stats[cName] || 0) + 1;
      });

      const sorted = Object.entries(stats).sort(([, a], [, b]) => b - a);
      const myIndex = sorted.findIndex(([name]) => name === myClassName);

      // If my class has 0 achievements, it might not be in the list?
      // If logic is "Standard Ranking", if not in list, it's last?
      // Or "0". 
      // If userClass has 0, index is -1.
      // But we want to rank 1, 2, 3...
      // If stats are empty, everyone is 0. 
      // Let's assume there are 3 classes A, B, C.
      // Only classes with >0 are in `stats` map from query?
      // No, `class_achievements` only has records.
      // So I should pre-fill A, B, C with 0?
      // I can fetch all classes first.

      // Refined Logic using classes table
      const { data: allClasses } = await supabase.from('classes').select('name');
      allClasses?.forEach(c => {
        if (!stats[c.name]) stats[c.name] = 0;
      });

      const finalSorted = Object.entries(stats).sort(([, a], [, b]) => b - a);
      const finalIndex = finalSorted.findIndex(([name]) => name === myClassName);

      if (finalIndex !== -1) {
        setClassRank(finalIndex + 1);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingRank(false);
    }
  };

  const fetchTodaySchedule = async (classId: string, lecturerId?: string) => {
    // If no class assigned AND not a lecturer, do not show any schedule
    if (!classId && !lecturerId) {
      setSchedules([]);
      setIsLoadingSchedule(false);
      return;
    }

    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const today = days[new Date().getDay()];

    let query = supabase
      .from('schedules')
      .select(`
        id,
        subject_id,
        start_time,
        end_time,
        room,
        lecturer_id,
        subjects ( name ),
        classes ( name )
      `)
      .eq('day', today)
      .order('start_time');

    if (lecturerId) {
      query = query.eq('lecturer_id', lecturerId);
    } else if (classId) {
      query = query.eq('class_id', classId);
    }

    const { data: schedulesData, error } = await query;

    if (error) {
      console.error("Schedule fetch error:", error);
      setIsLoadingSchedule(false);
      return;
    }

    // 2. Fetch Lecturers Manually
    const lecturerIds = [...new Set(schedulesData?.map(s => s.lecturer_id).filter(Boolean) as string[])];
    let profilesMap: Record<string, { full_name: string }> = {};

    if (lecturerIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', lecturerIds);

      if (profiles) {
        profiles.forEach(p => {
          profilesMap[p.user_id] = { full_name: p.full_name };
        });
      }
    }

    // 3. Merge
    const enrichedSchedules = schedulesData?.map(s => ({
      ...s,
      profiles: s.lecturer_id ? profilesMap[s.lecturer_id] : undefined
    })) || [];

    setSchedules(enrichedSchedules);
    setIsLoadingSchedule(false);
  };

  const handleUploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      setIsUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${userNim}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('user_id', user.id);

        if (updateError) throw updateError;

        setAvatarUrl(`${publicUrl}?t=${new Date().getTime()}`);
        await refreshProfile(); // Refresh sidebar
        toast({
          title: "Berhasil",
          description: "Foto profil berhasil diperbarui",
        });
      }

    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast({
        variant: "destructive",
        title: "Gagal Upload",
        description: error.message || "Terjadi kesalahan saat mengupload foto",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    try {
      setIsUploading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Update profile to remove avatar_url
        const { error } = await supabase
          .from('profiles')
          .update({ avatar_url: null })
          .eq('user_id', user.id);

        if (error) throw error;

        setAvatarUrl(null);
        await refreshProfile(); // Refresh sidebar

        toast({
          title: "Foto dihapus",
          description: "Foto profil berhasil dihapus",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Gagal menghapus",
        description: error.message,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const fetchRealtimeBalance = async () => {
    setIsLoadingSaldo(true);
    try {
      // A. Hitung Iuran Lunas (weekly_dues)
      const { count } = await supabase
        .from('weekly_dues')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'paid');
      const duesIncome = (count || 0) * 5000;

      // B. Hitung Transaksi Manual (transactions)
      const { data: tx } = await supabase.from('transactions').select('amount, type');
      const manualIncome = tx?.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) || 0;
      const totalExpense = tx?.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) || 0;

      // C. Final Balance
      setBalance((duesIncome + manualIncome) - totalExpense);
    } catch (err) {
      console.error("Gagal hitung saldo:", err);
    } finally {
      setIsLoadingSaldo(false);
    }
  };

  // Helper for status
  const getScheduleStatus = (start: string, end: string) => {
    const now = new Date();
    const curr = now.getHours() * 60 + now.getMinutes();
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const startM = sh * 60 + sm;
    const endM = eh * 60 + em;

    if (curr > endM) return 'finished';
    if (curr >= startM) return 'ongoing';
    return 'upcoming';
  };

  const formatRupiah = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);



  return (
    <div className="space-y-6 pt-12 md:pt-0 pb-24 animate-in fade-in duration-500">

      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {greeting}, <span className="text-primary">{userName || '...'}</span>! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            {userRole} {userClass ? `Kelas ${userClass}` : ''} • {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="flex items-center gap-3 glass-card rounded-2xl px-4 py-3 w-full md:w-auto mt-2 md:mt-0">
          {weather?.condition === 'Hujan' || weather?.condition === 'Badai' ? (
            <Cloud className="w-6 h-6 text-gray-400" />
          ) : weather?.condition === 'Berawan' || weather?.condition === 'Berkabut' ? (
            <Cloud className="w-6 h-6 text-gray-400" />
          ) : (
            <Sun className="w-6 h-6 text-warning" />
          )}
          <div>
            <div className="text-sm font-medium text-foreground">{weather ? `${weather.temp}°C` : '...'}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              {weather ? weather.condition : 'Memuat...'}
            </div>
            {weather && <div className="text-[10px] text-muted-foreground/60">{weather.location}</div>}
          </div>
        </div>
      </div>

      {/* 2. Stats Grid */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${userRole === 'Dosen' ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-4`}>
        {userRole !== 'Dosen' && (
          <StatCard
            icon={Wallet}
            label="Saldo Kas"
            value={isLoadingSaldo ? "..." : formatRupiah(balance)}
            trend={{ value: 'Realtime', positive: true }}
            iconBg="bg-success/10 text-success"
          />
        )}
        <StatCard
          icon={Calendar}
          label="Jadwal Hari Ini"
          value={`${schedules.length} Matkul`}
          iconBg="bg-primary/10 text-primary"
        />
        <StatCard icon={CheckCircle2} label="Kehadiran" value="95%" trend={{ value: '2%', positive: true }} iconBg="bg-accent text-accent-foreground" />
        {/* Top Class Wrapper Card */}
        <div className="glass-card p-6 rounded-2xl relative overflow-hidden flex flex-col items-center justify-center text-center space-y-2 border border-white/5 bg-card/30">
          {isLoadingRank ? (
            <Skeleton className="h-10 w-20" />
          ) : topClass ? (
            <>
              {/* Trophy Badge */}
              <div className="absolute top-0 right-0 p-2 bg-yellow-500/20 rounded-bl-xl border-l border-b border-yellow-500/20 backdrop-blur-sm">
                <Trophy className="w-5 h-5 text-yellow-500" />
              </div>

              {/* Class Avatar */}
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold mb-1 border", getClassColor(topClass.name))}>
                {topClass.name}
              </div>

              {/* Info */}
              <div>
                <p className="text-muted-foreground text-sm font-medium">Kelas {topClass.name}</p>
                <div className="text-2xl font-bold text-foreground leading-none mt-1">
                  {topClass.total}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Total Prestasi</p>
              </div>
            </>
          ) : (
            <div className="text-xs text-muted-foreground">Belum ada data</div>
          )}
        </div>
      </div>

      {/* 3. Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT COLUMN (Schedule & Announcements) - Order 2 on mobile, Order 1 on Desktop */}
        <div className="lg:col-span-2 space-y-6 order-2 lg:order-1">

          {/* Today's Schedule */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Jadwal Hari Ini
              </h2>
              <Link to="/dashboard/schedule">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
                  Lihat Semua <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>

            <div className="space-y-4">
              {isLoadingSchedule ? (
                // Skeletons
                Array(2).fill(0).map((_, i) => (
                  <div key={i} className="p-4 rounded-xl border border-border/50 bg-secondary/20">
                    <Skeleton className="h-6 w-1/2 mb-2" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                ))
              ) : schedules.length > 0 ? (
                schedules.map((schedule) => {
                  const status = getScheduleStatus(schedule.start_time, schedule.end_time);
                  const isFinished = status === 'finished';
                  const isOngoing = status === 'ongoing';

                  return (
                    <div
                      key={schedule.id}
                      className={`relative p-5 rounded-xl border transition-all duration-300 ${isOngoing
                        ? 'bg-primary/5 border-primary/20 shadow-sm'
                        : isFinished
                          ? 'bg-secondary/10 border-border/50 opacity-60 grayscale'
                          : 'bg-card/30 border-border/50 hover:bg-card/50'
                        }`}
                    >
                      {isOngoing && (
                        <span className="absolute top-3 right-3 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 rounded-full animate-pulse">
                          Sedang Berlangsung
                        </span>
                      )}
                      {isFinished && (
                        <span className="absolute top-3 right-3 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted rounded-full">
                          Selesai
                        </span>
                      )}

                      <h3 className="font-bold text-foreground text-lg mb-1">{schedule.subjects?.name}</h3>

                      <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm text-muted-foreground mt-3">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{schedule.room}</span>
                        </div>
                        <div className="flex items-center gap-2 col-span-2">
                          <User className="w-3.5 h-3.5" />
                          <span>{schedule.profiles?.full_name || 'Dosen Belum Ditentukan'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground bg-secondary/10 rounded-xl border border-dashed border-border">
                  <p>Tidak ada jadwal kuliah hari ini</p>
                </div>
              )}
            </div>
          </div>

          {/* Announcements & Competitions */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">Info Terbaru</h2>
              <div className="flex gap-2">
                <Link to="/dashboard/competitions">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs">Lomba <ChevronRight className="w-3 h-3" /></Button>
                </Link>
                <Link to="/dashboard/announcements">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs">Pengumuman <ChevronRight className="w-3 h-3" /></Button>
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Top Row: Competitions */}
              {dashboardCompetitions.map((comp) => (
                <Link key={`comp-${comp.id}`} to="/dashboard/competitions">
                  <AnnouncementCard
                    title={comp.title}
                    date={new Date(comp.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    excerpt={comp.description || 'Tidak ada deskripsi'}
                    isNew={['Hot', 'New'].includes(comp.badge)}
                    priority={comp.badge === 'Hot' ? 'important' : 'normal'}
                    icon={Trophy}
                  />
                </Link>
              ))}

              {/* Bottom Row: Announcements */}
              {dashboardAnnouncements.map((ann) => (
                <Link key={`ann-${ann.id}`} to="/dashboard/announcements">
                  <AnnouncementCard
                    title={ann.title}
                    date={new Date(ann.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    excerpt={ann.content || ann.excerpt || 'Tidak ada konten'}
                    isNew={ann.is_new}
                    priority={ann.priority}
                  // Default icon (Megaphone) is used
                  />
                </Link>
              ))}

              {dashboardCompetitions.length === 0 && dashboardAnnouncements.length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground bg-secondary/10 rounded-xl border border-dashed border-border">
                  <p>Belum ada info terbaru</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN (Digital Card & Quick Actions) - Order 1 on mobile, Order 2 on Desktop */}
        <div className="space-y-6 order-1 lg:order-2">

          {/* Digital Card */}
          <div className="glass-card rounded-2xl p-6 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-500 w-full">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-lg font-bold">Kartu Digital</h2>
                  <p className="text-xs text-muted-foreground">PTIK 2025 Membership</p>
                </div>
                <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/10" onClick={() => setIsQrOpen(true)}>
                  <QrCode className="w-6 h-6" />
                </Button>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 shadow-xl relative overflow-hidden">
                {/* Card Content */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16" />

                <div className="relative z-10 flex flex-col h-[180px] justify-between">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 flex items-center justify-center">
                        <img src="/Logo UNJ.jpg" alt="Logo UNJ" className="w-full h-full object-contain mix-blend-screen" />
                      </div>
                      <span className="text-xs text-white/60">Universitas Negeri Jakarta</span>
                    </div>
                    {/* Profile Picture / Actions */}
                    <div className="relative w-10 h-10 rounded-full flex items-center justify-center">
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleUploadAvatar}
                        disabled={isUploading}
                      />

                      {isUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20 rounded-full">
                          <Loader2 className="w-5 h-5 text-white animate-spin" />
                        </div>
                      )}

                      {avatarUrl ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <div className="w-full h-full relative cursor-pointer group hover:scale-105 transition-transform">
                              <Avatar className="w-full h-full border border-white/20">
                                <AvatarImage src={avatarUrl} className="object-cover" />
                                <AvatarFallback className="bg-transparent"></AvatarFallback>
                              </Avatar>
                            </div>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                              <ImagePlus className="mr-2 h-4 w-4" />
                              <span>Ubah Foto</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleDeleteAvatar} className="text-red-600 focus:text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Hapus Foto</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <div
                          className="w-full h-full bg-white/5 flex items-center justify-center rounded-full border border-white/10 text-emerald-400 hover:bg-white/10 transition-colors cursor-pointer"
                          onClick={() => !isUploading && fileInputRef.current?.click()}
                        >
                          <User className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-white font-bold text-lg tracking-wide mb-0.5">{userName || 'Loading...'}</p>
                    <p className="text-white/60 text-xs font-mono">{userNim || '...'}</p>
                  </div>

                  <div className="flex justify-between items-end">
                    <div className="px-2 py-1 rounded bg-emerald-500/20 border border-emerald-500/30 text-[10px] text-emerald-400 font-medium uppercase">
                      {getRoleDisplay()}
                    </div>
                    <p className="text-[10px] text-white/40">{userClass ? `PTIK ${userClass}-2025` : 'PTIK 2025'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-4">Aksi Cepat</h2>
            <div className="grid grid-cols-2 gap-3">
              <Link to="/dashboard/scan-qr" className="block">
                <button className="w-full flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-secondary/5 border border-border/50 hover:bg-secondary/10 hover:border-primary/20 transition-all duration-300">
                  <div className="p-2 rounded-full bg-blue-500/10 text-blue-500">
                    <QrCode size={18} />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">Scan Absen</span>
                </button>
              </Link>
              <Link to="/dashboard/payment" className="block">
                <button className="w-full flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-secondary/5 border border-border/50 hover:bg-secondary/10 hover:border-primary/20 transition-all duration-300">
                  <div className="p-2 rounded-full bg-emerald-500/10 text-emerald-500">
                    <Wallet size={18} />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">Bayar Kas</span>
                </button>
              </Link>
              <Link to="/dashboard/repository" className="block">
                <button className="w-full flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-secondary/5 border border-border/50 hover:bg-secondary/10 hover:border-primary/20 transition-all duration-300">
                  <div className="p-2 rounded-full bg-amber-500/10 text-amber-500">
                    <FileText size={18} />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">Materi</span>
                </button>
              </Link>
              <Link to="/dashboard/ipk-simulator" className="block">
                <button className="w-full flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-secondary/5 border border-border/50 hover:bg-secondary/10 hover:border-primary/20 transition-all duration-300">
                  <div className="p-2 rounded-full bg-purple-500/10 text-purple-500">
                    <Users size={18} />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">IPK Sim</span>
                </button>
              </Link>
            </div>
          </div>

        </div>

      </div>

      <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader>
            <DialogTitle>QR Code Saya</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-6 gap-4">
            <div className="p-4 bg-white rounded-xl shadow-lg">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData)}`}
                alt="QR Code"
                className="w-48 h-48"
              />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-lg">{userName}</h3>
              <p className="text-sm text-muted-foreground">{userNim}</p>
              <p className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary inline-block">
                {userClass ? `Kelas ${userClass}` : getRoleDisplay()}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}