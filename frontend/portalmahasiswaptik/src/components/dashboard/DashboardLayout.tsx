import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { RoleBasedSidebar } from './RoleBasedSidebar';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DashboardLayout() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();

  // Close sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  const getPageTitle = (pathname: string) => {
    if (pathname === '/dashboard') return 'Dashboard';
    if (pathname.includes('/attendance-history')) return 'Riwayat Kehadiran';
    if (pathname.includes('/finance')) return 'Dashboard Kas';
    if (pathname.includes('/payment')) return 'Bayar Iuran';
    if (pathname.includes('/competitions')) return 'Info Lomba';
    if (pathname.includes('/announcements')) return 'Pengumuman';
    if (pathname.includes('/schedule')) return 'Jadwal Kuliah';
    if (pathname.includes('/repository')) return 'Repository Materi';
    if (pathname.includes('/ipk-simulator')) return 'Simulator IPK';
    if (pathname.includes('/profile')) return 'Profil User';
    if (pathname.includes('/change-password')) return 'Ganti Password';
    if (pathname.includes('/users')) return 'Manajemen User';
    if (pathname.includes('/scan-qr')) return 'Scan QR';
    if (pathname.includes('/qr-generator')) return 'Generator QR';
    if (pathname.includes('/leaderboard')) return 'Leaderboard';
    return 'Portal Mahasiswa';
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background flex flex-col md:flex-row">
        {/* Mobile Top Bar */}
        <header className="md:hidden sticky top-0 z-40 w-full bg-background/80 backdrop-blur-md border-b border-border px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className="text-foreground shrink-0"
            >
              {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
            <h1 className="font-bold text-lg tracking-tight truncate">
              {getPageTitle(location.pathname)}
            </h1>
          </div>
          <div className="flex items-center shrink-0 ml-2">
            <img
              src="https://ft.unj.ac.id/ptik/wp-content/uploads/2021/07/LOGO-BEMP-PTIK-150x150.png"
              alt="Logo"
              className="w-8 h-8 object-contain"
            />
          </div>
        </header>

        <RoleBasedSidebar mobileOpen={isMobileOpen} setMobileOpen={setIsMobileOpen} />

        <main className={cn(
          "flex-1 transition-all duration-300",
          "md:ml-72",
          "p-4 md:p-8 pt-6 md:pt-8"
        )}>
          {/* Desktop Title Header (Hidden on Mobile) */}
          <div className="hidden md:block mb-8">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
              <span className="w-2 h-8 bg-primary rounded-full" />
              {getPageTitle(location.pathname)}
            </h1>
          </div>

          <Outlet />
        </main>
      </div>
    </ProtectedRoute>
  );
}
