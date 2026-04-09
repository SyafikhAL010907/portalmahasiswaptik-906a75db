import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAttendanceStats } from '@/hooks/useAttendanceStats';
import { useToast } from "@/components/ui/use-toast";

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

export function useDashboard() {
  const currentHour = new Date().getHours();
  const { user, profile, roles, refreshProfile } = useAuth();
  const { toast } = useToast();
  const greeting = currentHour < 12 ? 'Selamat Pagi' : currentHour < 17 ? 'Selamat Siang' : 'Selamat Malam';

  // --- STATE ---
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(true);
  const [balance, setBalance] = useState<number>(0);
  const [isLoadingSaldo, setIsLoadingSaldo] = useState(true);
  const [isQrOpen, setIsQrOpen] = useState(false);
  
  // Widget States
  const [weather, setWeather] = useState<{ temp: number, condition: string, location: string } | null>(null);
  const [classRank, setClassRank] = useState<number | null>(null);
  const [topClass, setTopClass] = useState<{ name: string, total: number } | null>(null);
  const [isLoadingRank, setIsLoadingRank] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [dashboardCompetitions, setDashboardCompetitions] = useState<any[]>([]);
  const [dashboardAnnouncements, setDashboardAnnouncements] = useState<any[]>([]);

  const { percentage: attendancePercentage, isLoading: isLoadingAttendance, semesterName } = useAttendanceStats(user?.id);

  // Derived constants for backward compatibility
  const userName = profile?.full_name;
  const userNim = profile?.nim;
  const userClass = profile?.user_class;
  const userRole = roles.includes('admin_dev') ? 'AdminDev'
    : roles.includes('admin_kelas') ? 'Admin Kelas'
      : roles.includes('admin_dosen') ? 'Dosen'
        : 'Mahasiswa';

  const qrData = `${profile?.full_name} - ${profile?.nim} - ${profile?.user_class || userRole}`;

  // --- INITIAL LOAD ---
  useEffect(() => {
    fetchDashboardData();
    fetchWeather();
    fetchClassRank();

    const channel = supabase
      .channel('public:class_achievements_rank')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'class_achievements' }, () => {
        fetchClassRank();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  useEffect(() => {
    if (profile?.class_id) {
      fetchLifetimeClassBalance();
    }
  }, [profile?.class_id]);

  useEffect(() => {
    if (!profile?.class_id) return;

    const userClassId = profile.class_id;

    const transactionsChannel = supabase
      .channel('dashboard_transactions_realtime')
      .on('postgres_changes', {
        event: '*', 
        schema: 'public',
        table: 'transactions',
        filter: `class_id=eq.${userClassId}`
      }, () => {
        fetchLifetimeClassBalance();
        toast({
          title: "💰 Data Keuangan Diperbarui",
          description: "Saldo telah disinkronkan secara real-time",
          duration: 2000,
        });
      })
      .subscribe();

    const duesChannel = supabase
      .channel('dashboard_dues_realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'weekly_dues'
      }, () => {
        fetchLifetimeClassBalance();
        toast({
          title: "💸 Iuran Diperbarui",
          description: "Status pembayaran telah diupdate",
          duration: 2000,
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(transactionsChannel);
      supabase.removeChannel(duesChannel);
    };
  }, [profile?.class_id]);

  const fetchClassRank = async () => {
    try {
      setIsLoadingRank(true);
      const { data, error } = await supabase
        .from('class_achievements')
        .select(`classes ( name )`);

      if (error) throw error;

      const stats: Record<string, number> = {};
      data?.forEach((row: any) => {
        const cName = row.classes?.name;
        if (cName) stats[cName] = (stats[cName] || 0) + 1;
      });

      const { data: allClasses } = await supabase.from('classes').select('name');
      allClasses?.forEach(c => {
        if (!stats[c.name]) stats[c.name] = 0;
      });

      const sorted = Object.entries(stats).sort(([, a], [, b]) => b - a);
      if (sorted.length > 0) {
        setTopClass({ name: sorted[0][0], total: sorted[0][1] });
      }
    } catch (err) {
      console.error("Rank error:", err);
    } finally {
      setIsLoadingRank(false);
    }
  };

  const fetchWeather = () => {
    if (!navigator.geolocation) {
      fetchWeatherByCoords(-6.1947, 106.8794, "Kampus UNJ");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        fetchWeatherByCoords(position.coords.latitude, position.coords.longitude, "Lokasi Anda");
      },
      () => {
        fetchWeatherByCoords(-6.1947, 106.8794, "Kampus UNJ");
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
        else if (code >= 45 && code <= 48) condition = "Berkabut";
        else if (code >= 51 && code <= 82) condition = "Hujan";
        else if (code >= 95) condition = "Badai";

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

  const fetchDashboardData = async () => {
    try {
      const { data: comps } = await supabase
        .from('competitions')
        .select('*')
        .order('badge', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(2);

      const { data: anns } = await supabase
        .from('announcements')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5);

      if (comps) setDashboardCompetitions(comps);

      if (anns) {
        const priorityOrder = { 'urgent': 3, 'important': 2, 'normal': 1 };
        const sortedAnns = anns.sort((a, b) => {
          const pA = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
          const pB = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
          return pB - pA;
        });
        setDashboardAnnouncements(sortedAnns.slice(0, 2));
      }

      if (profile) {
        calculateRank(profile.user_class || '');
        await fetchTodaySchedule(profile.class_id || '', roles.includes('admin_dosen') ? profile.user_id : undefined);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setIsLoadingSchedule(false);
    }
  };

  const calculateRank = async (myClassName: string) => {
    if (!myClassName) return;
    try {
      const { data } = await supabase
        .from('class_achievements')
        .select(`classes ( name )`);

      const stats: Record<string, number> = {};
      data?.forEach((row: any) => {
        const cName = row.classes?.name;
        if (cName) stats[cName] = (stats[cName] || 0) + 1;
      });

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

    const enrichedSchedules = schedulesData?.map(s => ({
      ...s,
      profiles: s.lecturer_id ? profilesMap[s.lecturer_id] : undefined
    })) || [];

    setSchedules(enrichedSchedules);
    setIsLoadingSchedule(false);
  };

  const fetchLifetimeClassBalance = async () => {
    setIsLoadingSaldo(true);
    try {
      const userClassId = profile?.class_id;
      if (!userClassId) {
        setBalance(0);
        setIsLoadingSaldo(false);
        return;
      }

      const { data: students, error: studentError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('class_id', userClassId);

      if (studentError) throw studentError;

      const studentIds = students?.map(s => s.user_id) || [];
      if (studentIds.length === 0) {
        setBalance(0);
        setIsLoadingSaldo(false);
        return;
      }

      const { data: duesData, error: duesError } = await supabase
        .from('weekly_dues')
        .select('amount')
        .eq('status', 'paid')
        .in('student_id', studentIds);

      if (duesError) throw duesError;

      const duesIncome = duesData?.reduce((sum, d) => sum + d.amount, 0) || 0;

      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('amount, type')
        .eq('class_id', userClassId);

      if (txError) throw txError;

      const manualIncome = txData?.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) || 0;
      const totalExpense = txData?.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) || 0;

      const lifetimeBalance = (duesIncome + manualIncome) - totalExpense;
      setBalance(lifetimeBalance);
    } catch (err) {
      console.error("Gagal hitung saldo lifetime:", err);
      setBalance(0);
    } finally {
      setIsLoadingSaldo(false);
    }
  };

  const getScheduleStatus = (start: string, end: string) => {
    const now = new Date();
    const curr = now.getHours() * 60 + now.getMinutes();
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const startM = sh * 60 + sm;
    const endM = eh * 60 + em;

    if (curr > endM) return 'finished';
    if (curr >= startM) return 'ongoing';
    return 'next';
  };

  return {
    state: {
      greeting, user, profile, roles, schedules, isLoadingSchedule, balance, isLoadingSaldo,
      isQrOpen, weather, classRank, topClass, isLoadingRank, isUploading,
      attendancePercentage, isLoadingAttendance, semesterName, dashboardCompetitions,
      dashboardAnnouncements, userName, userNim, userClass, userRole, qrData,
      getRoleDisplay: () => userRole
    },
    actions: {
      setIsQrOpen, fetchDashboardData, fetchWeather, fetchClassRank, refreshProfile,
      getScheduleStatus, fetchLifetimeClassBalance
    }
  };
}
