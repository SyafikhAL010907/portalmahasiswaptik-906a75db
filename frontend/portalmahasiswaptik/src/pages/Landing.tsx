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
    const fetchStats = async () => {
      console.log('🔍 [DEBUG] Fetching landing stats via RPC...');
      try {
        const { data, error } = await (supabase as any).rpc('get_landing_stats');

        if (error) {
          console.error('❌ [DEBUG] FAILED to fetch landing stats:', error);
          return;
        }

        if (data) {
          console.log('✅ [DEBUG] Landing stats fetched successfully:', data);
          setStats(data as unknown as LandingStats);

          // The RPC now calculates the accurate net balance (1.035.000)
          if (data.total_cash_lifetime !== undefined) {
            console.log('💰 [DEBUG] Aggregated Balance delivered from RPC:', data.total_cash_lifetime);
            setAggregatedBalance(data.total_cash_lifetime);
          }
        }
      } catch (err) {
        console.error('❌ [DEBUG] Unexpected error in fetchStats:', err);
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
