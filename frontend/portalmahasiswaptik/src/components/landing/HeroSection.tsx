import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LandingStats } from '@/pages/Landing';
import { cn } from '@/lib/utils';

export function HeroSection({
  stats,
  attendancePercentage,
  isLoadingAttendance,
  isLoggedIn
}: {
  stats: LandingStats | null,
  attendancePercentage?: number,
  isLoadingAttendance?: boolean,
  isLoggedIn?: boolean
}) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-transparent pt-16">
      {/* Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-success/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge - Modified by Vasya AI (Clean Version) */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8 animate-fade-in hover:bg-primary/20 transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Portal Angkatan PTIK 2025</span>
          </Link>

          {/* Main Heading */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Satu Portal untuk{' '}
            <span className="text-gradient bg-gradient-to-r from-primary via-success to-primary">
              Semua Kebutuhan
            </span>{' '}
            Mahasiswa
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Kelola jadwal kuliah, absensi, kas angkatan, dan materi pembelajaran dalam satu platform yang terintegrasi dengan tampilan yang menenangkan.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <Link to="/login">
              <Button variant="hero" size="xl" className="group">
                Mulai Sekarang
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/features">
              <Button variant="glass" size="xl">
                Lihat Fitur
              </Button>
            </Link>
          </div>

          {/* Stats Preview */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            {[
              { label: 'Mahasiswa', value: stats ? `${stats.total_students}+` : '120+' },
              { label: 'Kelas', value: stats ? stats.total_classes.toString() : '3' },
              { label: 'Materi Semester 2', value: stats ? `${stats.total_subjects}` : '40+' },
              { label: 'Semester', value: '2' },
            ].map((stat, index) => (
              <div
                key={stat.label}
                className="glass-card rounded-2xl p-4 hover:scale-105 transition-transform duration-300"
                style={{ animationDelay: `${0.5 + index * 0.1}s` }}
              >
                <div className="text-2xl md:text-3xl font-bold text-gradient bg-gradient-to-r from-primary to-success">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Wave removed for seamless transition */}
    </section>
  );
}
