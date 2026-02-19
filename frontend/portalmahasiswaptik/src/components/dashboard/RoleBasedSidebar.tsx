import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LogOut,
  ChevronDown,
  Menu,
  X,
  User,
  Columns,
  Sun,
  Moon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth, AppRole } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Badge } from '@/components/ui/badge';
import {
  getMenuItems,
  hasAccess,
  type MenuItem,
  type NavigationMode,
  NAVIGATION_MODE_SIDEBAR,
  NAVIGATION_MODE_NAVBAR,
} from '@/lib/navigationConfig';

const roleLabels: Record<AppRole, string> = {
  admin_dev: 'AdminDev',
  admin_kelas: 'Admin Kelas',
  admin_dosen: 'Dosen',
  mahasiswa: 'Mahasiswa',
};

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
  checkAccess,
  handleLogout,
  navigationMode,
  onModeChange,
}: {
  profile: any;
  primaryRole: AppRole | null;
  menuItems: MenuItem[];
  expandedItems: string[];
  toggleExpand: (label: string) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  isActive: (path: string) => boolean;
  isParentActive: (children?: MenuItem[]) => boolean;
  checkAccess: (roles?: AppRole[]) => boolean;
  handleLogout: (e?: React.MouseEvent) => void;
  navigationMode?: NavigationMode;
  onModeChange?: (mode: NavigationMode) => void;
}) => {
  const { theme, toggleTheme } = useTheme();
  return (
    <>
      {/* Logo Section */}
      <div className="p-4 border-b border-sidebar-border">
        <Link
          to="/dashboard"
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="bg-transparent flex items-center justify-center" style={{ isolation: 'isolate' }}>
            <img
              src="https://ft.unj.ac.id/ptik/wp-content/uploads/2021/07/LOGO-BEMP-PTIK-150x150.png"
              alt="Logo BEMP PTIK"
              className="w-10 h-10 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] dark:drop-shadow-[0_0_8px_rgba(147,197,253,0.3)]"
              style={{
                clipPath: 'circle(46%)',
                filter: 'contrast(1.2) brightness(1.1) drop-shadow(0 0 2px rgba(255,255,255,0.5))',
                mixBlendMode: 'plus-lighter'
              }}
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
          if (!checkAccess(item.roles)) return null;

          const accessibleChildren = item.children?.filter((child: any) => checkAccess(child.roles));

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
                    "relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-500 overflow-hidden group",
                    isActive(item.path)
                      ? "bg-blue-100/90 text-slate-950 font-black shadow-sm border-r-4 border-blue-600 dark:bg-blue-100 dark:text-slate-950"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:translate-x-1"
                  )}
                >
                  {/* Holographic Glow Background */}
                  {!isActive(item.path) && (
                    <span className={cn(
                      "absolute inset-0 -z-10 opacity-0 group-hover:opacity-100 transition-all duration-500 blur-2xl",
                      "bg-gradient-to-r from-blue-400/15 via-purple-400/15 to-emerald-400/15",
                      "dark:from-blue-500/25 dark:via-purple-500/25 dark:to-emerald-500/25",
                      "group-hover:scale-110"
                    )} />
                  )}
                  <item.icon className={cn("w-5 h-5 relative z-10", isActive(item.path) ? "text-blue-500" : "text-muted-foreground")} />
                  <span className="relative z-10">{item.label}</span>
                </Link>
              ) : (
                <>
                  <button
                    onClick={() => toggleExpand(item.label)}
                    className={cn(
                      "relative w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-500 overflow-hidden group",
                      isParentActive(accessibleChildren)
                        ? "bg-blue-100/80 text-slate-950 font-black dark:bg-blue-100 dark:text-slate-950"
                        : "text-sidebar-foreground hover:bg-sidebar-accent"
                    )}
                  >
                    {/* Holographic Glow Background */}
                    {!isParentActive(accessibleChildren) && (
                      <span className={cn(
                        "absolute inset-0 -z-10 opacity-0 group-hover:opacity-100 transition-all duration-500 blur-2xl",
                        "bg-gradient-to-r from-blue-400/15 via-purple-400/15 to-emerald-400/15",
                        "dark:from-blue-500/25 dark:via-purple-500/25 dark:to-emerald-500/25",
                        "group-hover:scale-110"
                      )} />
                    )}
                    <div className="flex items-center gap-3 relative z-10">
                      <item.icon className={cn("w-5 h-5", isParentActive(accessibleChildren) ? "text-blue-500" : "text-muted-foreground")} />
                      <span>{item.label}</span>
                    </div>
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 transition-transform duration-300 relative z-10",
                        expandedItems.includes(item.label) && "rotate-180"
                      )}
                    />
                  </button>
                  {expandedItems.includes(item.label) && accessibleChildren && (
                    <div className="ml-4 mt-1 space-y-1 animate-fade-in border-l border-border/30 pl-2">
                      {accessibleChildren.map((child: any) => (
                        <Link
                          key={child.path}
                          to={child.path}
                          onClick={() => setIsMobileOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all duration-500",
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
        {/* Layout Mode Switcher - Animated Pill */}
        <button
          onClick={() => {
            const newMode = navigationMode === NAVIGATION_MODE_SIDEBAR ? NAVIGATION_MODE_NAVBAR : NAVIGATION_MODE_SIDEBAR;
            onModeChange?.(newMode);
          }}
          className={cn(
            "relative w-full h-12 rounded-full transition-all duration-200 overflow-visible group",
            "bg-white/5 dark:bg-white/10 backdrop-blur-md",
            "cursor-pointer hover:scale-[1.02] active:scale-95",
            "hover:shadow-lg hover:shadow-blue-300/20 dark:hover:shadow-purple-500/30"
          )}
        >
          {/* Holographic Glow Background */}
          <span className={cn(
            "absolute inset-0 -z-10 opacity-0 group-hover:opacity-100 transition-all duration-500 blur-2xl rounded-full",
            "bg-gradient-to-r from-blue-400/15 via-purple-400/15 to-emerald-400/15",
            "dark:from-blue-500/25 dark:via-purple-500/25 dark:to-emerald-500/25"
          )} />

          {/* Centered Text - Always in the middle */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span
              className={cn(
                "text-sm text-slate-950 dark:text-white font-medium transition-opacity duration-300",
                "px-12" // Space for icons on both sides
              )}
              style={{
                opacity: 1
              }}
            >
              {navigationMode === NAVIGATION_MODE_SIDEBAR ? 'Switch To NavBar' : 'Switch To SideBar'}
            </span>
          </div>

          {/* Sliding Icon Thumb */}
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center",
              "bg-gradient-to-br from-blue-500 to-purple-500 dark:from-blue-600/40 dark:via-cyan-500/40 dark:to-emerald-500/40",
              "border border-white/0 dark:border-white/20",
              "shadow-lg dark:shadow-[0_0_15px_rgba(168,85,247,0.2)] transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
              "pointer-events-none"
            )}
            style={{
              left: navigationMode === NAVIGATION_MODE_SIDEBAR ? '4px' : 'calc(100% - 44px)'
            }}
          >
            <Columns className="w-5 h-5 text-white" />
          </div>
        </button>

        {/* Dark Mode Toggle - Animated Pill */}
        <button
          onClick={toggleTheme}
          className={cn(
            "relative w-full h-12 rounded-full transition-all duration-200 overflow-visible group",
            "bg-white/5 dark:bg-white/10 backdrop-blur-md",
            "cursor-pointer hover:scale-[1.02] active:scale-95",
            "hover:shadow-lg hover:shadow-emerald-300/20 dark:hover:shadow-blue-500/30"
          )}
        >
          {/* Holographic Glow Background */}
          <span className={cn(
            "absolute inset-0 -z-10 opacity-0 group-hover:opacity-100 transition-all duration-500 blur-2xl rounded-full",
            "bg-gradient-to-r from-emerald-400/15 via-blue-400/15 to-purple-400/15",
            "dark:from-emerald-500/25 dark:via-blue-500/25 dark:to-purple-500/25"
          )} />

          {/* Centered Text - Always in the middle */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span
              className={cn(
                "text-sm text-slate-950 dark:text-white font-medium transition-opacity duration-300",
                "px-12" // Space for icons on both sides
              )}
              style={{
                opacity: 1
              }}
            >
              {theme === 'dark' ? 'Switch To Light Mode' : 'Switch To Dark Mode'}
            </span>
          </div>

          {/* Sliding Icon Thumb */}
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center",
              "bg-gradient-to-br from-emerald-500 to-blue-500 dark:from-indigo-500/40 dark:via-purple-500/40 dark:to-blue-500/40",
              "border border-white/0 dark:border-white/20",
              "shadow-lg dark:shadow-[0_0_15px_rgba(168,85,247,0.2)] transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
              "pointer-events-none"
            )}
            style={{
              left: theme === 'dark' ? '4px' : 'calc(100% - 44px)'
            }}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-white" /> : <Moon className="w-5 h-5 text-white" />}
          </div>
        </button>

        {/* Logout Button */}
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
};

// Main Component
function RoleBasedSidebarComponent({
  mobileOpen: externalMobileOpen,
  setMobileOpen: setExternalMobileOpen,
  navigationMode = NAVIGATION_MODE_SIDEBAR,
  onModeChange,

}: {
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
  navigationMode?: NavigationMode;
  onModeChange?: (mode: NavigationMode) => void;
} = {}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, roles, signOut } = useAuth();
  const [expandedItems, setExpandedItems] = useState<string[]>(['Akademik', 'Keuangan', 'Absensi']);
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);

  const isMobileOpen = externalMobileOpen !== undefined ? externalMobileOpen : internalMobileOpen;
  const setIsMobileOpen = setExternalMobileOpen !== undefined ? setExternalMobileOpen : setInternalMobileOpen;

  const menuItems = getMenuItems();

  // Optimizing internal handlers with useCallback
  const toggleExpand = React.useCallback((label: string) => {
    setExpandedItems(prev =>
      prev.includes(label)
        ? prev.filter(item => item !== label)
        : [...prev, label]
    );
  }, []);

  const isActive = React.useCallback((path?: string) => path && location.pathname === path, [location.pathname]);

  const isParentActive = React.useCallback((children?: MenuItem['children']) =>
    children?.some(child => location.pathname === child.path), [location.pathname]);

  const checkAccess = React.useCallback((itemRoles?: AppRole[]) => hasAccess(itemRoles, roles), [roles]);

  const handleLogout = React.useCallback(async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    try {
      await signOut();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      window.location.href = '/login';
    }
  }, [signOut]);

  const primaryRole = roles[0];

  return (
    <>
      {/* Mobile Toggle Button - Only shown if not controlled externally */}
      {externalMobileOpen === undefined && (
        <Button
          variant="glass"
          size="icon"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="fixed top-4 left-4 z-50 md:hidden"
        >
          {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      )}

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-full w-72 floating-sidebar flex flex-col z-50 transition-transform duration-300 ease-out will-change-transform transform-gpu",
        navigationMode === NAVIGATION_MODE_NAVBAR ? "md:-translate-x-full" : "md:translate-x-0",
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
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
          checkAccess={checkAccess}
          handleLogout={handleLogout}
          navigationMode={navigationMode}
          onModeChange={onModeChange}
        />
      </aside>
    </>
  );
}

// Optimization: Prevent unnecessary re-renders with STRICT prop comparison
export const RoleBasedSidebar = React.memo(RoleBasedSidebarComponent, (prev, next) => {
  return (
    prev.mobileOpen === next.mobileOpen &&
    prev.navigationMode === next.navigationMode &&
    prev.onModeChange === next.onModeChange
  );
});