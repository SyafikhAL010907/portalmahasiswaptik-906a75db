import { Navbar } from '@/components/landing/Navbar';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { StatsSection } from '@/components/landing/StatsSection';
import { Footer } from '@/components/landing/Footer';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAttendanceStats } from '@/hooks/useAttendanceStats';

export interface LandingStats {
  total_students: number;
  total_classes: number;
  total_subjects: number;
  total_cash_lifetime: number;
  class_breakdown: { name: string; count: number }[];
}

export default function Landing() {
  const [stats, setStats] = useState<LandingStats | null>(null);
  const [aggregatedBalance, setAggregatedBalance] = useState<number>(0);
  const { user } = useAuth();
  const { percentage, isLoading: isLoadingAttendance, semesterName } = useAttendanceStats(user?.id);

  useEffect(() => {
    // 🥷 NINJA CONFIG: Bypass RLS untuk Public Landing Page
    const ninjaUrl = "https://owqjsqvpmsctztpgensg.supabase.co";
    const ninjaKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93cWpzcXZwbXNjdHp0cGdlbnNnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDI0NTkwNCwiZXhwIjoyMDg1ODIxOTA0fQ.S9TInNnZHCsjuuYrpcXB5xpM4Lsr3MIE1YsFPdhq2Hg";

    const fetchStats = async () => {
      console.log('🔍 [DEBUG] Fetching landing stats...');
      try {
        // 1. Fetch Classes (Standard)
        const { data: classesData, error: classError } = await supabase
          .from('classes')
          .select('id, name')
          .order('name');

        if (classError) console.error('❌ [DEBUG] Fetch Error (Classes):', classError);

        // 2. Fetch Profiles with Role Filtering (Ninja Bypass)
        // Kita butuh role untuk filter Mahasiswa & Admin Kelas
        let allProfiles = [];
        const response = await fetch(`${ninjaUrl}/rest/v1/profiles?select=class_id,role`, {
          headers: { 'apikey': ninjaKey, 'Authorization': `Bearer ${ninjaKey}` }
        });

        if (response.ok) {
          allProfiles = await response.json();
        } else {
          console.error('❌ [DEBUG] Fetch Error (Profiles - Ninja):', response.statusText);
        }

        // FILTER: Hanya Mahasiswa (mahasiswa) & Admin Kelas (admin_kelas)
        const validStudentProfiles = allProfiles.filter((p: any) =>
          ['mahasiswa', 'admin_kelas'].includes(p.role)
        );

        // 3. Fetch Subjects count (Semester 2 Only)
        const { count: subjectsCount, error: subjectsError } = await supabase
          .from('subjects')
          .select('*', { count: 'exact', head: true })
          .eq('semester', 2);

        if (subjectsError) console.error('❌ [DEBUG] Fetch Error (Subjects):', subjectsError);

        // 4. Fetch Cash (RPC)
        const { data: rpcData, error: rpcError } = await (supabase as any).rpc('get_landing_stats');
        if (rpcError) console.error('❌ [DEBUG] Fetch Error (RPC-Cash):', rpcError);

        const totalStudents = validStudentProfiles.length;
        const totalClasses = classesData?.length || 0;

        // Dynamic Breakdown Calculation dengan Filter Role
        const breakdown = (classesData || []).map(cls => ({
          name: cls.name,
          count: validStudentProfiles.filter((p: any) => p.class_id === cls.id).length
        }));

        const finalStats: LandingStats = {
          total_students: totalStudents,
          total_classes: totalClasses,
          total_subjects: subjectsCount || 0,
          total_cash_lifetime: rpcData?.total_cash_lifetime || 0,
          class_breakdown: breakdown
        };

        console.log('📊 Real-time Stats Aggregated:', finalStats);
        setStats(finalStats);
        setAggregatedBalance(finalStats.total_cash_lifetime);

      } catch (err) {
        console.error('❌ [DEBUG] Unexpected runtime error in fetchStats:', err);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 bg-gradient-to-b from-white via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-950 dark:to-black text-foreground transition-colors duration-500 relative overflow-hidden">
      {/* Dynamic Background Glows for Bottom Section Sync */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none transition-opacity duration-1000">
        {/* Dark Mode Glows */}
        <div className="absolute top-[10%] right-[-5%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] hidden dark:block"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-purple-600/20 rounded-full blur-[140px] hidden dark:block"></div>
        <div className="absolute bottom-[-5%] left-[-5%] w-[35%] h-[35%] bg-blue-600/20 rounded-full blur-[120px] hidden dark:block"></div>

        {/* Light Mode Glows (Pastel) */}
        <div className="absolute top-[10%] right-[-5%] w-[40%] h-[40%] bg-indigo-200/30 rounded-full blur-[100px] dark:hidden"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-blue-100/40 rounded-full blur-[120px] dark:hidden"></div>
        <div className="absolute bottom-[-5%] left-[-5%] w-[35%] h-[35%] bg-purple-100/30 rounded-full blur-[100px] dark:hidden"></div>
      </div>

      <Navbar />
      <HeroSection stats={stats} />
      <FeaturesSection />
      <StatsSection
        stats={stats}
        attendancePercentage={percentage}
        semesterName={semesterName}
        aggregatedBalance={aggregatedBalance}
      />
      <Footer />
    </div>
  );
}
