import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  GraduationCap,
  Calendar,
  BookOpen,
  Calculator,
  MapPin,
  QrCode,
  History,
  Wallet,
  CreditCard,
  FileText,
  Megaphone,
  Trophy,
  Award,
  Settings,
  User,
  Lock,
  LogOut,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';

interface MenuItem {
  icon: React.ElementType;
  label: string;
  path?: string;
  children?: { icon: React.ElementType; label: string; path: string }[];
}

const menuItems: MenuItem[] = [
  { icon: Home, label: 'Dashboard', path: '/dashboard' },
  {
    icon: GraduationCap,
    label: 'Akademik',
    children: [
      { icon: Calendar, label: 'Jadwal Kuliah', path: '/dashboard/schedule' },
      { icon: BookOpen, label: 'Repository Materi', path: '/dashboard/repository' },
      { icon: Calculator, label: 'Simulator IPK', path: '/dashboard/ipk-simulator' },
    ],
  },
  {
    icon: MapPin,
    label: 'Absensi',
    children: [
      { icon: QrCode, label: 'Scan QR', path: '/dashboard/scan-qr' },
      { icon: History, label: 'Riwayat Kehadiran', path: '/dashboard/attendance-history' },
    ],
  },
  {
    icon: Wallet,
    label: 'Keuangan',
    children: [
      { icon: CreditCard, label: 'Dashboard Kas', path: '/dashboard/finance' },
      { icon: FileText, label: 'Bayar Iuran', path: '/dashboard/payment' },
    ],
  },
  {
    icon: Megaphone,
    label: 'Informasi',
    children: [
      { icon: Megaphone, label: 'Pengumuman', path: '/dashboard/announcements' },
      { icon: Award, label: 'Info Lomba', path: '/dashboard/competitions' },
      { icon: Trophy, label: 'Leaderboard Angkatan', path: '/dashboard/leaderboard' },
    ],
  },
  {
    icon: Settings,
    label: 'Pengaturan',
    children: [
      { icon: User, label: 'Profil User', path: '/dashboard/profile' },
      { icon: Lock, label: 'Ganti Password', path: '/dashboard/change-password' },
    ],
  },
];

export function Sidebar() {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>(['Akademik', 'Keuangan']);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleExpand = (label: string) => {
    setExpandedItems(prev =>
      prev.includes(label)
        ? prev.filter(item => item !== label)
        : [...prev, label]
    );
  };

  const isActive = (path?: string) => path && location.pathname === path;
  const isParentActive = (children?: MenuItem['children']) =>
    children?.some(child => location.pathname === child.path);

  const SidebarContent = () => (
    <>
      {/* Logo Section - FIX LOGO UNJ */}
      <div className="p-4 border-b border-sidebar-border relative z-20">
        <Link
          to="/dashboard"
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          {/* Logo Container: White Background for proper contrast */}
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-soft overflow-hidden p-0.5 border border-gray-100">
            <img
              src="https://ft.unj.ac.id/ptik/wp-content/uploads/2021/07/LOGO-BEMP-PTIK-150x150.png"
              alt="Logo BEMP PTIK"
              className="w-full h-full object-contain"
            />
          </div>

          <div>
            <div className="font-bold text-sidebar-foreground">PTIK 2025</div>
            <div className="text-xs text-muted-foreground">Portal Angkatan</div>
          </div>
        </Link>
      </div>

      {/* Menu Section */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <div key={item.label}>
            {item.path ? (
              <Link
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300",
                  isActive(item.path)
                    ? "bg-blue-50 text-blue-700 dark:bg-gradient-to-r dark:from-blue-600/20 dark:to-purple-600/20 dark:text-blue-400 shadow-sm border-r-2 border-blue-500/50"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:translate-x-1"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive(item.path) ? "text-blue-500" : "text-muted-foreground")} />
                {item.label}
              </Link>
            ) : (
              <>
                <button
                  onClick={() => toggleExpand(item.label)}
                  className={cn(
                    "w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300",
                    isParentActive(item.children)
                      ? "bg-blue-50/50 text-blue-700 dark:bg-blue-600/10 dark:text-blue-400"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={cn("w-5 h-5", isParentActive(item.children) ? "text-blue-500" : "text-muted-foreground")} />
                    {item.label}
                  </div>
                  {expandedItems.includes(item.label) ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                {expandedItems.includes(item.label) && item.children && (
                  <div className="ml-4 mt-1 space-y-1 animate-fade-in border-l border-border/30 pl-2">
                    {item.children.map((child) => (
                      <Link
                        key={child.path}
                        to={child.path}
                        onClick={() => setIsMobileOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all duration-300",
                          isActive(child.path)
                            ? "bg-blue-50 text-blue-700 dark:bg-gradient-to-r dark:from-blue-600/20 dark:to-purple-600/20 dark:text-blue-400 shadow-sm border-r-2 border-blue-500/50"
                            : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground hover:translate-x-1"
                        )}
                      >
                        <child.icon className={cn("w-4 h-4", isActive(child.path) ? "text-blue-500" : "text-muted-foreground")} />
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-sidebar-border space-y-3">
        <div className="flex items-center justify-between px-4">
          <span className="text-sm text-muted-foreground">Dark Mode</span>
          <ThemeToggle />
        </div>
        <Link to="/">
          <Button variant="ghost" className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10">
            <LogOut className="w-5 h-5" />
            Log Out
          </Button>
        </Link>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      <Button
        variant="glass"
        size="icon"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed top-4 left-4 z-50 md:hidden"
      >
        {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-full w-72 floating-sidebar flex flex-col z-50 transition-transform duration-300",
        "md:translate-x-0",
        isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <SidebarContent />
      </aside>
    </>
  );
}