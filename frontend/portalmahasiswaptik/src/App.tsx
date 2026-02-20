import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import SplashScreen from "@/components/ui/SplashScreen";
import { GlobalChat } from "./components/dashboard/GlobalChat";
import { ErrorBoundary } from "react-error-boundary";
import { GlobalErrorFallback } from "@/components/ui/GlobalErrorFallback";
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';

// Lazy Load Pages & Components
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Schedule = lazy(() => import("./pages/Schedule"));
const Finance = lazy(() => import("./pages/Finance"));
const IPKSimulator = lazy(() => import("./pages/IPKSimulator"));
const Repository = lazy(() => import("./pages/Repository"));
const ScanQR = lazy(() => import("./pages/ScanQR"));
const QRGenerator = lazy(() => import("./pages/QRGenerator"));
const AttendanceHistory = lazy(() => import("./pages/AttendanceHistory"));
const Payment = lazy(() => import("./pages/Payment"));
const Announcements = lazy(() => import("./pages/Announcements"));
const Competitions = lazy(() => import("./pages/Competitions"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const Profile = lazy(() => import("./pages/Profile"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));
const Features = lazy(() => import("./pages/Features"));
const About = lazy(() => import("./pages/About"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Lazy load named export DashboardLayout
// Lazy load named export DashboardLayout
const DashboardLayout = lazy(() => import("./components/dashboard/DashboardLayout"));

const queryClient = new QueryClient();

const ProtectedGlobalChat = () => {
  const { session, isLoading } = useAuth();
  const location = useLocation();

  const isDashboardRoute = location.pathname.startsWith('/dashboard');

  if (isLoading || !session || !isDashboardRoute) {
    return null;
  }

  return <GlobalChat />;
};

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
  </div>
);

const App = () => {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      console.log('🌍 Global Radar: Monitoring All Pages...'); // 🌍 Global Monitoring Log

      if (r) {
        registrationRef.current = r;

        // Force check immediately on startup if in standalone/desktop mode
        if (window.matchMedia('(display-mode: standalone)').matches) {
          console.log('🖥️ Standalone Mode Detected: Forcing Initial Update Check...');
          r.update();
        }

        setInterval(() => {
          console.log('🌍 Global Radar Check: Pulsing...');
          r.update();
        }, 15000);
      }
    },
    onRegisterError(error) {
      console.error('❌ PWA Radar Error:', error);
    }
  });

  // 📡 FOCUS RADAR: Trigger update check every time the window gets focus
  useEffect(() => {
    const handleCheck = () => {
      if (registrationRef.current && document.visibilityState === 'visible') {
        console.log('🌍 Global Radar: Window Focus/Visibility Detected. Checking updates...');
        registrationRef.current.update();
      }
    };

    window.addEventListener('focus', handleCheck);
    document.addEventListener('visibilitychange', handleCheck);

    return () => {
      window.removeEventListener('focus', handleCheck);
      document.removeEventListener('visibilitychange', handleCheck);
    };
  }, []);

  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Optimization: Ensure timer matches animation + buffer
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Aggressive Logging for Mobile Debug
  useEffect(() => {
    console.log('🔄 PWA Status:', { needRefresh, offlineReady });
  }, [needRefresh, offlineReady]);

  useEffect(() => {
    if (needRefresh) {
      toast.info(
        <div className="flex flex-col gap-3 w-full">
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-sm text-foreground">Pembaruan Sistem Tersedia!</span>
            <span className="text-xs text-muted-foreground">Klik tombol di bawah untuk menerapkan versi terbaru.</span>
          </div>
          <button
            onClick={() => {
              // Signal that this is a user-initiated reload
              (window as any)._pwaUpdating = true;

              // 🧪 REDUNDANT SKIP_WAITING: Ensure instant transition
              if (registrationRef.current?.waiting) {
                registrationRef.current.waiting.postMessage({ type: 'SKIP_WAITING' });
              }

              updateServiceWorker(true);
            }}
            className="w-full bg-primary text-primary-foreground font-bold py-2.5 px-4 rounded-xl active:scale-95 transition-all shadow-md text-sm"
          >
            UPDATE SEKARANG
          </button>
        </div>,
        {
          duration: Infinity, // Tetap muncul sampai diklik
        }
      );
    }
  }, [needRefresh, updateServiceWorker]);

  // Refresh page once new service worker is active ONLY if triggered by user
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const handleControllerChange = () => {
        // Log for transparency
        console.log('📡 Service Worker Controller Changed');
        if ((window as any)._pwaUpdating) {
          console.log('🔄 User-Initiated Update Detected: Reloading Application...');
          window.location.reload();
        } else {
          console.log('ℹ️ Background Update: Waiting for user interaction.');
        }
      };
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
      return () => {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      };
    }
  }, []);

  return (
    <ErrorBoundary FallbackComponent={GlobalErrorFallback} onReset={() => window.location.reload()}>
      <QueryClientProvider client={queryClient}>
        {/* Render Toasters at the ROOT Level to ensure they are on top of everything */}
        <Toaster />
        <Sonner />

        <ThemeProvider>
          <BrowserRouter>
            <AuthProvider>
              <TooltipProvider>
                <AnimatePresence mode="wait">
                  {showSplash && (
                    <SplashScreen key="splash" finishLoading={() => setShowSplash(false)} />
                  )}
                </AnimatePresence>

                {!showSplash && (
                  <motion.div
                    key="app"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    // Fixed ambiguous Tailwind class warning by using specific duration utility or escaping
                    className="min-h-screen will-change-opacity"
                  >
                    <ProtectedGlobalChat />
                    <Suspense fallback={<LoadingSpinner />}>
                      <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/dashboard" element={<DashboardLayout />}>
                          <Route index element={<Dashboard />} />
                          <Route path="schedule" element={<Schedule />} />
                          <Route path="finance" element={<Finance />} />
                          <Route path="ipk-simulator" element={<IPKSimulator />} />
                          <Route path="repository" element={<Repository />} />
                          <Route path="scan-qr" element={<ScanQR />} />
                          <Route path="qr-generator" element={<QRGenerator />} />
                          <Route path="attendance-history" element={<AttendanceHistory />} />
                          <Route path="payment" element={<Payment />} />
                          <Route path="announcements" element={<Announcements />} />
                          <Route path="competitions" element={<Competitions />} />
                          <Route path="leaderboard" element={<Leaderboard />} />
                          <Route path="users" element={<UserManagement />} />
                          <Route path="profile" element={<Profile />} />
                          <Route path="change-password" element={<ChangePassword />} />
                        </Route>
                        <Route path="/features" element={<Features />} />
                        <Route path="/about" element={<About />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </motion.div>
                )}
              </TooltipProvider>
            </AuthProvider>
          </BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
