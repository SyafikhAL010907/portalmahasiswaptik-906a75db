import React, { useState, useEffect, useCallback, startTransition } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '@/components/Navigation/Platform/Sidebar';
import { Navbar } from '@/components/Navigation/Platform/Navbar';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';
import { useResponsive } from '@/hooks/useResponsive';
import {
  type NavigationMode,
  NAVIGATION_MODE_SIDEBAR,
  NAVIGATION_MODE_NAVBAR,
} from '@/lib/navigationConfig';

const STORAGE_KEY = 'navigation_mode';
const COLLAPSE_KEY = 'sidebar_collapsed';

// Memoize Outlet to prevent re-renders when sidebar toggles
const MemoizedOutlet = React.memo(() => <Outlet />);

export default function DashboardLayout() {
  const { isMobileView } = useResponsive();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();

  // Initialize navigation mode from localStorage, default to sidebar
  const [navigationMode, setNavigationMode] = useState<NavigationMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored === NAVIGATION_MODE_NAVBAR || stored === NAVIGATION_MODE_SIDEBAR)
      ? stored as NavigationMode
      : NAVIGATION_MODE_SIDEBAR;
  });

  // Sidebar collapse state
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem(COLLAPSE_KEY) === 'true';
  });

  // Persist navigation mode to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, navigationMode);
  }, [navigationMode]);

  // Persist collapse state
  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, String(isCollapsed));
  }, [isCollapsed]);

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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row transition-all duration-300 ease-out">
        {/* Navbar bridge (returns null on mobile) */}
        {navigationMode === NAVIGATION_MODE_NAVBAR && !isMobileView && (
          <Navbar onModeChange={handleModeChange} />
        )}

        {/* Mobile Theme Switch: Floating top-right, visible only on small screens or mobile view */}
        {isMobileView && (
          <div className="fixed top-6 right-6 z-50">
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-full shadow-lg border border-slate-200/50 dark:border-white/10 p-1">
              <ThemeToggle />
            </div>
          </div>
        )}

        {/* Sidebar bridge (handles desktop sidebar or mobile bottom nav) */}
        <Sidebar
          mobileOpen={isMobileOpen}
          setMobileOpen={setIsMobileOpen}
          navigationMode={navigationMode}
          onModeChange={handleModeChange}
          isCollapsed={isCollapsed}
          onCollapseToggle={() => setIsCollapsed(!isCollapsed)}
        />

        <main
          style={{
            marginLeft: (navigationMode === NAVIGATION_MODE_NAVBAR || isMobileView) ? '0' : undefined
          }}
          className={cn(
            "flex-1 transition-all duration-300 ease-out will-change-transform transform-gpu min-w-0",
            // SYNC MARGIN WITH useResponsive
            navigationMode === NAVIGATION_MODE_SIDEBAR && !isMobileView
              ? (isCollapsed ? "md:ml-20 ml-0 pt-6 md:pt-8 pb-32 md:pb-8" : "md:ml-72 ml-0 pt-6 md:pt-8 pb-32 md:pb-8") 
              : "ml-0 md:ml-0 pt-20 md:pt-32 pb-32 md:pb-8", // Navbar or Mobile: no margin
            // Side padding
            "px-4 md:px-5 lg:px-6"
          )}
        >
          {/* Content Wrapper - FORCE CENTERING */}
          <div
            className={cn(
              "transition-all duration-300 ease-out min-w-0",
              navigationMode === NAVIGATION_MODE_NAVBAR
                ? "w-full max-w-[1600px] mx-auto" // Navbar: force center with larger max-width
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

