import { Navbar } from '@/components/landing/Navbar';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { StatsSection } from '@/components/landing/StatsSection';
import { Footer } from '@/components/landing/Footer';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LandingStats {
  total_students: number;
  total_classes: number;
  total_subjects: number;
  total_cash_lifetime: number;
  class_breakdown: { name: string; count: number }[];
}

export default function Landing() {
  const [stats, setStats] = useState<LandingStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      console.log('Fetching landing stats...');
      const { data, error } = await (supabase as any).rpc('get_landing_stats');

      if (error) {
        console.error('FAILED to fetch landing stats:', error);
        return;
      }

      if (!data) {
        console.warn('Landing stats returned empty data');
        return;
      }

      console.log('Landing stats fetched successfully:', data);
      setStats(data as unknown as LandingStats);
    };
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection stats={stats} />
      <FeaturesSection />
      <StatsSection stats={stats} />
      <Footer />
    </div>
  );
}
