import React, { useState, useEffect, useCallback, startTransition } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { RoleBasedSidebar } from './RoleBasedSidebar';
import { TopNavbar } from './TopNavbar';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type NavigationMode,
  NAVIGATION_MODE_SIDEBAR,
  NAVIGATION_MODE_NAVBAR,
} from '@/lib/navigationConfig';

const STORAGE_KEY = 'navigation_mode';

import { motion, AnimatePresence } from 'framer-motion';

// ... imports remain the same

// Memoize Outlet to prevent re-renders when sidebar toggles
const MemoizedOutlet = React.memo(() => <Outlet />);

export default function DashboardLayout() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();

  // Initialize navigation mode from localStorage, default to sidebar
  const [navigationMode, setNavigationMode] = useState<NavigationMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored === NAVIGATION_MODE_NAVBAR || stored === NAVIGATION_MODE_SIDEBAR)
      ? stored as NavigationMode
      : NAVIGATION_MODE_SIDEBAR;
  });

  // Persist navigation mode to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, navigationMode);
  }, [navigationMode]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  const handleModeChange = useCallback((mode: NavigationMode) => {
    startTransition(() => {
      setNavigationMode(mode);
    });
  }, []);

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
      <div className="min-h-screen bg-background flex flex-col md:flex-row transition-all duration-300 ease-out overflow-x-hidden">

        <AnimatePresence mode="popLayout">
          {navigationMode === NAVIGATION_MODE_NAVBAR && (
            <motion.div
              key="navbar-desktop"
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="fixed top-0 left-0 right-0 z-50 w-full"
            >
              <TopNavbar onModeChange={handleModeChange} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Header - Always show in Sidebar Mode (Mobile) */}
        {navigationMode === NAVIGATION_MODE_SIDEBAR && (
          <header className="md:hidden sticky top-0 z-40 w-full bg-background/80 backdrop-blur-md border-b border-border px-4 h-16 flex items-center justify-between transition-all duration-300 ease-in-out">
            <div className="flex items-center gap-3 overflow-hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileOpen(!isMobileOpen)}
                className="text-foreground shrink-0 touch-none active:scale-95 transition-transform"
                style={{ touchAction: 'manipulation' }}
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
        )}

        {/* Sidebar - Conditionally Rendered with AnimatePresence */}
        <AnimatePresence mode="popLayout">
          {navigationMode === NAVIGATION_MODE_SIDEBAR && (
            <motion.div
              key="sidebar"
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ duration: 0.3, ease: "circOut" }}
              className="z-[49]"
            >
              <RoleBasedSidebar
                mobileOpen={isMobileOpen}
                setMobileOpen={setIsMobileOpen}
                navigationMode={navigationMode}
                onModeChange={handleModeChange}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <main
          className={cn(
            "flex-1 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] will-change-transform transform-gpu",
            // CRITICAL AGGRESSIVE MARGIN FIX
            navigationMode === NAVIGATION_MODE_SIDEBAR
              ? "md:ml-72 ml-0 pt-6 md:pt-8" // Sidebar mode: margin left for desktop only
              : "ml-0 md:ml-0 pt-20 md:pt-28", // Navbar mode: FORCE no margin, extra padding top
            // Side padding
            "px-4 md:px-10 pb-8"
          )}
        >
          {/* Content Wrapper - FORCE CENTERING */}
          <div
            className={cn(
              "transition-all duration-300 ease-out",
              navigationMode === NAVIGATION_MODE_NAVBAR
                ? "w-full max-w-[1400px] mx-auto" // Navbar: force center with specific max-width
                : "w-full" // Sidebar: full width
            )}
          >
            {/* Desktop Title Header (Sidebar Mode Only) */}
            {navigationMode === NAVIGATION_MODE_SIDEBAR && (
              <div className="hidden md:block mb-8">
                <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                  <span className="w-2 h-8 bg-primary rounded-full" />
                  {getPageTitle(location.pathname)}
                </h1>
              </div>
            )}

            {/* Page Title for Navbar Mode (Desktop) */}
            {navigationMode === NAVIGATION_MODE_NAVBAR && (
              <div className="hidden md:block mb-8">
                <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                  <span className="w-2 h-8 bg-primary rounded-full" />
                  {getPageTitle(location.pathname)}
                </h1>
              </div>
            )}

            <MemoizedOutlet />
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}


