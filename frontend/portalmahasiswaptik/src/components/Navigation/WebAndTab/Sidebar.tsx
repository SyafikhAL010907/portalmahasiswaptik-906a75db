import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LogOut,
    ChevronDown,
    Menu,
    X,
    User,
    Columns,
    Sun,
    Moon,
    ChevronLeft,
    ChevronRight,
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

// SidebarContent component extracted for internal use
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
    isCollapsed,
    onCollapseToggle,
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
    isCollapsed: boolean;
    onCollapseToggle: () => void;
}) => {
    const { theme, toggleTheme } = useTheme();
    return (
        <>
            <div className="p-4 border-b border-sidebar-border relative">
                <Link to="/dashboard" className={cn("flex items-center gap-3 hover:opacity-80 transition-opacity", isCollapsed && "justify-center")}>
                    <img
                        src="https://ft.unj.ac.id/ptik/wp-content/uploads/2021/07/LOGO-BEMP-PTIK-150x150.png"
                        alt="Logo BEMP PTIK"
                        className="w-10 h-10 object-contain shrink-0"
                    />
                    {!isCollapsed && (
                        <div>
                            <div className="font-bold text-sidebar-foreground">PTIK 2025</div>
                            <div className="text-xs text-muted-foreground">Portal Angkatan</div>
                        </div>
                    )}
                </Link>
                {/* Collapse Toggle Button */}
                <button 
                    onClick={onCollapseToggle}
                    className="hidden md:flex absolute -right-3 top-7 w-6 h-6 rounded-full bg-primary text-white items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all z-[100] border-2 border-slate-950"
                >
                    {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
            </div>

            <div className={cn("p-4 border-b border-sidebar-border", isCollapsed && "flex justify-center")}>
                <div className={cn("flex items-center gap-3", isCollapsed && "justify-center")}>
                    <div className="relative w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                        {profile?.avatar_url ? (
                            <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-5 h-5 text-primary" />
                        )}
                    </div>
                    {!isCollapsed && (
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <p className="font-bold text-sm text-sidebar-foreground truncate">{profile?.full_name || 'User'}</p>
                            <p className="text-[11px] text-muted-foreground leading-none mt-1">{profile?.user_class ? `Kelas ${profile.user_class}` : profile?.nim}</p>
                        </div>
                    )}
                </div>
                {!isCollapsed && primaryRole && <Badge variant="secondary" className="mt-2">{roleLabels[primaryRole]}</Badge>}
            </div>

            <nav className={cn("flex-1 p-4 space-y-1 overflow-y-auto", isCollapsed && "flex flex-col items-center px-2")}>
                {menuItems.map((item: any) => {
                    if (!checkAccess(item.roles)) return null;
                    const accessibleChildren = item.children?.filter((child: any) => checkAccess(child.roles));
                    if (item.children && (!accessibleChildren || accessibleChildren.length === 0)) return null;

                    return (
                        <div key={item.label} className={cn("w-full", isCollapsed && "flex justify-center")}>
                            {item.path ? (
                                <Link
                                    to={item.path}
                                    onClick={() => setIsMobileOpen(false)}
                                    className={cn(
                                        "relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-500 overflow-hidden group",
                                        isActive(item.path)
                                            ? "bg-blue-600/10 text-blue-600 font-extrabold border-r-4 border-blue-600 dark:bg-blue-100 dark:text-slate-950"
                                            : "text-sidebar-foreground hover:bg-sidebar-accent",
                                        isCollapsed && "px-0 justify-center w-12 h-12 rounded-full"
                                    )}
                                >
                                    <item.icon className={cn("w-5 h-5 shrink-0", isActive(item.path) ? "text-blue-500" : "text-muted-foreground")} />
                                    {!isCollapsed && <span>{item.label}</span>}
                                </Link>
                            ) : (
                                <>
                                    <button
                                        onClick={() => toggleExpand(item.label)}
                                        className={cn(
                                            "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-500 group",
                                            isParentActive(accessibleChildren) ? "bg-blue-600/10 text-blue-600 font-extrabold dark:bg-blue-100 dark:text-slate-950" : "text-sidebar-foreground hover:bg-sidebar-accent",
                                            isCollapsed && "px-0 justify-center w-12 h-12 rounded-full"
                                        )}
                                    >
                                        <div className={cn("flex items-center gap-3", isCollapsed && "justify-center")}>
                                            <item.icon className={cn("w-5 h-5 shrink-0", isParentActive(accessibleChildren) ? "text-blue-500" : "text-muted-foreground")} />
                                            {!isCollapsed && <span>{item.label}</span>}
                                        </div>
                                        {!isCollapsed && <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expandedItems.includes(item.label) && "rotate-180")} />}
                                    </button>
                                    {!isCollapsed && expandedItems.includes(item.label) && accessibleChildren && (
                                        <div className="ml-4 mt-1 space-y-1 border-l border-border/30 pl-2">
                                            {accessibleChildren.map((child: any) => (
                                                <Link
                                                    key={child.path}
                                                    to={child.path}
                                                    onClick={() => setIsMobileOpen(false)}
                                                    className={cn(
                                                        "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all duration-500",
                                                        isActive(child.path) ? "bg-blue-200 text-slate-950 font-black border-r-4 border-blue-600" : "text-muted-foreground hover:bg-sidebar-accent hover:translate-x-1"
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

            <div className={cn("p-4 border-t border-sidebar-border space-y-3", isCollapsed && "flex flex-col items-center px-2")}>
                <div className={cn("hidden md:block w-full", isCollapsed && "flex justify-center")}>
                    <button
                        onClick={() => onModeChange?.(navigationMode === NAVIGATION_MODE_SIDEBAR ? NAVIGATION_MODE_NAVBAR : NAVIGATION_MODE_SIDEBAR)}
                        className={cn(
                            "relative w-full h-12 rounded-full bg-slate-900/5 dark:bg-white/10 backdrop-blur-md cursor-pointer overflow-hidden group transition-all",
                            isCollapsed && "w-12"
                        )}
                    >
                        {!isCollapsed && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-sm font-medium leading-none text-slate-600 dark:text-slate-300">NavBar</span>
                            </div>
                        )}
                        <div className={cn(
                            "absolute top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-500 transition-all duration-700 shadow-md",
                            isCollapsed ? "left-1" : (navigationMode === NAVIGATION_MODE_SIDEBAR ? "left-1" : "left-[calc(100%-44px)]")
                        )}>
                            <Columns className="w-5 h-5 text-white" />
                        </div>
                    </button>
                </div>

                <div className={cn("w-full", isCollapsed && "flex justify-center")}>
                    <button onClick={toggleTheme} className={cn(
                        "relative w-full h-12 rounded-full bg-slate-900/5 dark:bg-white/10 backdrop-blur-md cursor-pointer overflow-hidden group transition-all",
                        isCollapsed && "w-12"
                    )}>
                        {!isCollapsed && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-sm font-medium leading-none text-slate-600 dark:text-slate-300">Theme</span>
                            </div>
                        )}
                        <div className={cn(
                            "absolute top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-emerald-500 to-blue-500 transition-all duration-700 shadow-md",
                            isCollapsed ? "left-1" : (theme === 'dark' ? "left-1" : "left-[calc(100%-44px)]")
                        )}>
                            {theme === 'dark' ? <Sun className="w-5 h-5 text-white" /> : <Moon className="w-5 h-5 text-white" />}
                        </div>
                    </button>
                </div>

                <Button variant="ghost" className={cn("w-full justify-start gap-3 text-destructive hover:bg-destructive/10", isCollapsed && "justify-center p-0 w-12 h-12 rounded-full")} onClick={handleLogout}>
                    <LogOut className="w-5 h-5" /> {!isCollapsed && "Log Out"}
                </Button>
            </div>
        </>
    );
};
export function Sidebar({
    mobileOpen,
    setMobileOpen,
    navigationMode = NAVIGATION_MODE_SIDEBAR,
    onModeChange,
    isCollapsed = false,
    onCollapseToggle,
}: {
    mobileOpen: boolean;
    setMobileOpen: (open: boolean) => void;
    navigationMode?: NavigationMode;
    onModeChange?: (mode: NavigationMode) => void;
    isCollapsed?: boolean;
    onCollapseToggle?: () => void;
}) {
    const location = useLocation();
    const { profile, roles, signOut } = useAuth();
    const [expandedItems, setExpandedItems] = useState<string[]>(['Akademik', 'Keuangan', 'Absensi']);

    const menuItems = getMenuItems();

    const toggleExpand = React.useCallback((label: string) => {
        setExpandedItems(prev => prev.includes(label) ? prev.filter(item => item !== label) : [...prev, label]);
    }, []);

    const isActive = React.useCallback((path?: string) => path && location.pathname === path, [location.pathname]);
    const isParentActive = React.useCallback((children?: MenuItem['children']) => children?.some(child => location.pathname === child.path), [location.pathname]);
    const checkAccess = React.useCallback((itemRoles?: AppRole[]) => hasAccess(itemRoles, roles), [roles]);

    const handleLogout = React.useCallback(async () => {
        try {
            await signOut();
            localStorage.clear();
            window.location.href = '/login';
        } catch (error) {
            console.error("Logout error:", error);
        }
    }, [signOut]);

    const primaryRole = roles[0];

    return (
        <>
            {mobileOpen && <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden" onClick={() => setMobileOpen(false)} />}
            <aside className={cn(
                "fixed top-0 left-0 h-[100dvh] floating-sidebar flex flex-col z-[49] transition-all duration-300 ease-out",
                isCollapsed ? "w-20" : "w-72",
                navigationMode === NAVIGATION_MODE_NAVBAR ? "md:-translate-x-full" : "md:translate-x-0",
                mobileOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <SidebarContent
                    profile={profile}
                    primaryRole={primaryRole}
                    menuItems={menuItems}
                    expandedItems={expandedItems}
                    toggleExpand={toggleExpand}
                    isMobileOpen={mobileOpen}
                    setIsMobileOpen={setMobileOpen}
                    isActive={isActive}
                    isParentActive={isParentActive}
                    checkAccess={checkAccess}
                    handleLogout={handleLogout}
                    navigationMode={navigationMode}
                    onModeChange={onModeChange}
                    isCollapsed={isCollapsed || false}
                    onCollapseToggle={onCollapseToggle || (() => {})}
                />
            </aside>
        </>
    );
}
