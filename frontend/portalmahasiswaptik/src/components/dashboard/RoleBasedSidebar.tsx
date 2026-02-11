import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
  Users,
  BarChart3,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth, AppRole } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';

interface MenuItem {
  icon: React.ElementType;
  label: string;
  path?: string;
  roles?: AppRole[];
  children?: { icon: React.ElementType; label: string; path: string; roles?: AppRole[] }[];
}

const getMenuItems = (): MenuItem[] => [
  { icon: Home, label: 'Dashboard', path: '/dashboard' },

  // Admin Dev Only
  {
    icon: Shield,
    label: 'Admin',
    roles: ['admin_dev'],
    children: [
      { icon: Users, label: 'Manajemen User', path: '/dashboard/users', roles: ['admin_dev'] },
    ],
  },

  // 🔄 Update: Menu Generator QR yang tadinya di luar, sekarang gue hapus dari sini karena dipindah ke Absensi

  // Academic
  {
    icon: GraduationCap,
    label: 'Akademik',
    children: [
      { icon: Calendar, label: 'Jadwal Kuliah', path: '/dashboard/schedule' },
      { icon: BookOpen, label: 'Repository Materi', path: '/dashboard/repository' },
      { icon: Calculator, label: 'Simulator IPK', path: '/dashboard/ipk-simulator' },
    ],
  },

  // Attendance - 🚀 SEKARANG JADI SATU DI SINI
  {
    icon: MapPin,
    label: 'Absensi',
    children: [
      // 🔑 Generator QR sekarang masuk sini (Khusus Dosen & AdminDev)
      { icon: QrCode, label: 'Generator QR', path: '/dashboard/qr-generator', roles: ['admin_dosen', 'admin_dev'] },
      // Scan QR (Khusus Mahasiswa & AdminDev)
      { icon: QrCode, label: 'Scan QR', path: '/dashboard/scan-qr', roles: ['mahasiswa', 'admin_dev'] },
      // 🔑 Riwayat Kehadiran (Dosen 'admin_dosen' Dibuang dari daftar roles agar tidak muncul)
      { icon: History, label: 'Riwayat Kehadiran', path: '/dashboard/attendance-history', roles: ['mahasiswa', 'admin_dev', 'admin_kelas'] },
    ],
  },

  // Finance
  {
    icon: Wallet,
    label: 'Keuangan',
    roles: ['admin_dev', 'admin_kelas', 'mahasiswa'],
    children: [
      { icon: BarChart3, label: 'Dashboard Kas', path: '/dashboard/finance' },
      { icon: CreditCard, label: 'Bayar Iuran', path: '/dashboard/payment' },
    ],
  },

  // Information
  {
    icon: Megaphone,
    label: 'Informasi',
    children: [
      { icon: Megaphone, label: 'Pengumuman', path: '/dashboard/announcements' },
      { icon: Award, label: 'Info Lomba', path: '/dashboard/competitions' },
      { icon: Trophy, label: 'Leaderboard Angkatan', path: '/dashboard/leaderboard' },
    ],
  },

  // Settings
  {
    icon: Settings,
    label: 'Pengaturan',
    children: [
      { icon: User, label: 'Profil User', path: '/dashboard/profile' },
      { icon: Lock, label: 'Ganti Password', path: '/dashboard/change-password' },
    ],
  },
];

// ... (Sisa kode roleLabels, roleColors, dan komponen RoleBasedSidebar tetep utuh tanpa perubahan)

const roleLabels: Record<AppRole, string> = {
  admin_dev: 'AdminDev',
  admin_kelas: 'Admin Kelas',
  admin_dosen: 'Dosen',
  mahasiswa: 'Mahasiswa',
};

const roleColors: Record<AppRole, string> = {
  admin_dev: 'bg-destructive text-destructive-foreground',
  admin_kelas: 'bg-primary text-primary-foreground',
  admin_dosen: 'bg-warning text-warning-foreground',
  mahasiswa: 'bg-success text-success-foreground',
};

// ... imports ...

// ... getMenuItems and other constants ...

// Extracted SidebarContent component
const SidebarContent = ({
  profile,
  primaryRole,
  menuItems,
  expandedItems,
  toggleExpand,
  isMobileOpen,
  setIsMobileOpen,
  isActive,
  isParentActive,
  hasAccess,
  handleLogout,
  roleLabels
}: any) => (
  <>
    {/* Logo Section */}
    <div className="p-4 border-b border-sidebar-border">
      <Link
        to="/dashboard"
        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
      >
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

    {/* User Info */}
    <div className="p-4 border-b border-sidebar-border">
      <div className="flex items-center gap-3">
        <div className="relative w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
          {profile?.avatar_url ? (
            <img
              src={`${profile.avatar_url}?t=${new Date().getTime()}`}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-5 h-5 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">
            {profile?.full_name || 'User'}
          </p>
          <p className="text-xs text-muted-foreground">
            {primaryRole === 'admin_dosen'
              ? profile?.nim
              : (profile?.user_class ? `Kelas ${profile.user_class}` : profile?.nim)
            }
          </p>
        </div>
      </div>
      {primaryRole && (
        <Badge variant="secondary" className="mt-2">
          {roleLabels[primaryRole]}
        </Badge>
      )}
    </div>

    {/* Menu Section */}
    <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
      {menuItems.map((item: any) => {
        if (!hasAccess(item.roles)) return null;

        const accessibleChildren = item.children?.filter((child: any) => hasAccess(child.roles));

        if (item.children && (!accessibleChildren || accessibleChildren.length === 0)) {
          return null;
        }

        return (
          <div key={item.label}>
            {item.path ? (
              <Link
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300",
                  isActive(item.path)
                    ? "bg-blue-100/90 text-slate-950 font-black shadow-sm border-r-4 border-blue-600 dark:bg-blue-100 dark:text-slate-950"
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
                    isParentActive(accessibleChildren)
                      ? "bg-blue-50/80 text-slate-950 font-black dark:bg-blue-50/20 dark:text-slate-100"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={cn("w-5 h-5", isParentActive(accessibleChildren) ? "text-blue-500" : "text-muted-foreground")} />
                    {item.label}
                  </div>
                  {expandedItems.includes(item.label) ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                {expandedItems.includes(item.label) && accessibleChildren && (
                  <div className="ml-4 mt-1 space-y-1 animate-fade-in border-l border-border/30 pl-2">
                    {accessibleChildren.map((child: any) => (
                      <Link
                        key={child.path}
                        to={child.path}
                        onClick={() => setIsMobileOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all duration-300",
                          isActive(child.path)
                            ? "bg-blue-200 text-slate-950 font-black shadow-sm border-r-4 border-blue-600 dark:bg-blue-200 dark:text-slate-950"
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
        );
      })}
    </nav>

    {/* Bottom Section */}
    <div className="p-4 border-t border-sidebar-border space-y-3">
      <div className="flex items-center justify-between px-4">
        <span className="text-sm text-muted-foreground">Dark Mode</span>
        <ThemeToggle />
      </div>
      <Button
        variant="ghost"
        className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={handleLogout}
      >
        <LogOut className="w-5 h-5" />
        Log Out
      </Button>
    </div>
  </>
);

export function RoleBasedSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, roles, signOut } = useAuth();
  const [expandedItems, setExpandedItems] = useState<string[]>(['Akademik', 'Keuangan', 'Absensi']);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const menuItems = getMenuItems();

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

  const hasAccess = (itemRoles?: AppRole[]) => {
    if (!itemRoles || itemRoles.length === 0) return true;
    return itemRoles.some(role => roles.includes(role));
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const primaryRole = roles[0];

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
        <SidebarContent
          profile={profile}
          primaryRole={primaryRole}
          menuItems={menuItems}
          expandedItems={expandedItems}
          toggleExpand={toggleExpand}
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
          isActive={isActive}
          isParentActive={isParentActive}
          hasAccess={hasAccess}
          handleLogout={handleLogout}
          roleLabels={roleLabels}
        />
      </aside>
    </>
  );
}