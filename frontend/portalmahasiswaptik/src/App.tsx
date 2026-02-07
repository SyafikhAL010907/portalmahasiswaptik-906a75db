import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
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
import Transparency from "./pages/Transparency";
import Announcements from "./pages/Announcements";
import Competitions from "./pages/Competitions";
import Leaderboard from "./pages/Leaderboard";
import UserManagement from "./pages/admin/UserManagement";
import { DashboardLayout } from "./components/dashboard/DashboardLayout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
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
                <Route path="finance-report" element={<Transparency />} />
                <Route path="announcements" element={<Announcements />} />
                <Route path="competitions" element={<Competitions />} />
                <Route path="leaderboard" element={<Leaderboard />} />
                <Route path="users" element={<UserManagement />} />
              </Route>
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
