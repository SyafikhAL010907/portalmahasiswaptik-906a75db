import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Schedule from "./pages/Schedule";
import Finance from "./pages/Finance";
import IPKSimulator from "./pages/IPKSimulator";
import Repository from "./pages/Repository";
import ScanQR from "./pages/ScanQR";
import QRGenerator from "./pages/QRGenerator";
import AttendanceHistory from "./pages/AttendanceHistory";
import Payment from "./pages/Payment";
import Announcements from "./pages/Announcements";
import Competitions from "./pages/Competitions";
import Leaderboard from "./pages/Leaderboard";
import UserManagement from "./pages/admin/UserManagement";
import Profile from "./pages/Profile";
import ChangePassword from "./pages/ChangePassword";
import { DashboardLayout } from "./components/dashboard/DashboardLayout";
import { GlobalChat } from "./components/dashboard/GlobalChat";
import Features from "./pages/Features";
import About from "./pages/About";
import NotFound from "./pages/NotFound";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import SplashScreen from "@/components/ui/SplashScreen";

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

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Optimization: Ensure timer matches animation + buffer
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
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
                  className="min-h-screen will-change-opacity"
                >
                  <ProtectedGlobalChat />
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
                </motion.div>
              )}
            </TooltipProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
