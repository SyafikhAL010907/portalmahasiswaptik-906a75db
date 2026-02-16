import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, User, Menu, X, Layout, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTheme } from '@/contexts/ThemeContext';
import {
    getMenuItems,
    hasAccess,
    type MenuItem,
    type NavigationMode,
    NAVIGATION_MODE_SIDEBAR,
    NAVIGATION_MODE_NAVBAR,
} from '@/lib/navigationConfig';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TopNavbarProps {
    onModeChange: (mode: NavigationMode) => void;
}

export function TopNavbar({ onModeChange }: TopNavbarProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const { profile, roles, signOut } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    const menuItems = getMenuItems();

    useEffect(() => {
        setMobileMenuOpen(false);
        setOpenDropdown(null);
    }, [location.pathname]);

    const isActive = (path?: string) => path && location.pathname === path;
    const isParentActive = (children?: MenuItem['children']) =>
        children?.some(child => location.pathname === child.path);

    const checkAccess = (itemRoles?: string[]) => hasAccess(itemRoles as any, roles);

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

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
        <>
            {/* Desktop Top Navbar - FIXED POSITIONING */}
            <nav
                className={cn(
                    'fixed top-0 left-0 right-0 w-full h-16 z-50 border-b backdrop-blur-md',
                    'bg-gradient-to-r from-blue-200 via-purple-200 to-emerald-100 border-border/30',
                    'dark:bg-gradient-to-r dark:from-slate-950 dark:via-indigo-950/40 dark:to-slate-950 dark:border-slate-800/50',
                    'transition-all duration-500'
                )}
            >
                <div className="h-full px-4 md:px-6 flex items-center justify-between">
                    {/* Left: Logo + Desktop Menu */}
                    <div className="flex items-center gap-6">
                        {/* Logo */}
                        <Link to="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                            <div className="bg-transparent flex items-center justify-center" style={{ isolation: 'isolate' }}>
                                <img
                                    src="https://ft.unj.ac.id/ptik/wp-content/uploads/2021/07/LOGO-BEMP-PTIK-150x150.png"
                                    alt="Logo BEMP PTIK"
                                    className="w-9 h-9 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] dark:drop-shadow-[0_0_8px_rgba(147,197,253,0.3)]"
                                    style={{
                                        clipPath: 'circle(46%)',
                                        filter: 'contrast(1.2) brightness(1.1) drop-shadow(0 0 2px rgba(255,255,255,0.5))',
                                        mixBlendMode: 'plus-lighter'
                                    }}
                                />
                            </div>
                            <div className="hidden lg:block">
                                <div className="font-bold text-sm text-slate-950 dark:text-white">PTIK 2025</div>
                            </div>
                        </Link>

                        {/* Desktop Menu Items */}
                        <div className="hidden md:flex items-center gap-1">
                            {menuItems.map((item) => {
                                if (!checkAccess(item.roles)) return null;

                                const accessibleChildren = item.children?.filter((child) =>
                                    checkAccess(child.roles)
                                );

                                if (item.children && (!accessibleChildren || accessibleChildren.length === 0)) {
                                    return null;
                                }

                                // Direct link item
                                if (item.path) {
                                    return (
                                        <Link
                                            key={item.label}
                                            to={item.path}
                                            className={cn(
                                                'relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-500 overflow-hidden group',
                                                isActive(item.path)
                                                    ? 'bg-white/80 text-slate-950 shadow-sm dark:bg-slate-800 dark:text-white'
                                                    : 'text-slate-950 hover:bg-white/50 dark:text-white dark:hover:bg-slate-800/50'
                                            )}
                                        >
                                            {/* Holographic Glow Background */}
                                            <span className={cn(
                                                "absolute inset-0 -z-10 opacity-0 group-hover:opacity-100 transition-all duration-500 blur-2xl",
                                                "bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-emerald-400/20",
                                                "dark:from-blue-500/30 dark:via-purple-500/30 dark:to-emerald-500/30",
                                                "group-hover:scale-110"
                                            )} />
                                            <item.icon className="w-4 h-4 relative z-10" />
                                            <span className="relative z-10">{item.label}</span>
                                        </Link>
                                    );
                                }

                                // Dropdown menu item
                                return (
                                    <DropdownMenu key={item.label}>
                                        <DropdownMenuTrigger asChild>
                                            <button
                                                className={cn(
                                                    'relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-500 overflow-hidden group',
                                                    isParentActive(accessibleChildren)
                                                        ? 'bg-white/80 text-slate-950 shadow-sm dark:bg-slate-800 dark:text-white'
                                                        : 'text-slate-950 hover:bg-white/50 dark:text-white dark:hover:bg-slate-800/50'
                                                )}
                                            >
                                                {/* Holographic Glow Background */}
                                                <span className={cn(
                                                    "absolute inset-0 -z-10 opacity-0 group-hover:opacity-100 transition-all duration-500 blur-2xl",
                                                    "bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-emerald-400/20",
                                                    "dark:from-blue-500/30 dark:via-purple-500/30 dark:to-emerald-500/30",
                                                    "group-hover:scale-110"
                                                )} />
                                                <item.icon className="w-4 h-4 relative z-10" />
                                                <span className="relative z-10">{item.label}</span>
                                                <ChevronDown className="w-3 h-3 relative z-10" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start" className="w-48">
                                            {accessibleChildren?.map((child) => (
                                                <DropdownMenuItem key={child.path} asChild>
                                                    <Link
                                                        to={child.path}
                                                        className={cn(
                                                            'flex items-center gap-2 cursor-pointer',
                                                            isActive(child.path) && 'bg-blue-100 dark:bg-blue-900/30'
                                                        )}
                                                    >
                                                        <child.icon className="w-4 h-4" />
                                                        <span>{child.label}</span>
                                                    </Link>
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right: Quick Access Buttons + User Profile + Mobile Menu */}
                    <div className="flex items-center gap-2">
                        {/* Desktop: Layout Switcher Button */}
                        <div className="relative group/tooltip">
                            <button
                                onClick={() => onModeChange(NAVIGATION_MODE_SIDEBAR)}
                                className={cn(
                                    "relative hidden md:flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-500 group",
                                    "bg-white/20 dark:bg-white/10 backdrop-blur-md border border-white/30 dark:border-white/20",
                                    "hover:scale-110 hover:bg-white/30 dark:hover:bg-white/20",
                                    "text-slate-950 dark:text-white",
                                    // Aura Glow Effect
                                    "shadow-lg shadow-purple-300/0 hover:shadow-purple-400/50 dark:shadow-purple-500/0 dark:hover:shadow-purple-500/60",
                                    "hover:shadow-2xl"
                                )}
                                title="Switch to Sidebar Layout"
                            >
                                {/* Inner Glow */}
                                <span className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-purple-400/20 to-blue-400/20 blur-xl" />
                                <Layout className="w-5 h-5 relative z-10" />
                            </button>

                            {/* Glassmorphism Tooltip */}
                            <div className={cn(
                                "absolute -bottom-12 left-1/2 -translate-x-1/2 opacity-0 group-hover/tooltip:opacity-100 pointer-events-none",
                                "transition-all duration-500 transform group-hover/tooltip:translate-y-0 translate-y-2",
                                "px-3 py-1.5 rounded-lg whitespace-nowrap",
                                "bg-white/40 dark:bg-slate-800/60 backdrop-blur-md",
                                "border border-white/30 dark:border-slate-700/50",
                                "shadow-lg"
                            )}>
                                <span className="text-xs font-medium text-slate-950 dark:text-white">
                                    Switch To Sidebar
                                </span>
                            </div>
                        </div>


                        {/* Desktop: Theme Toggle Button */}
                        <div className="relative group/tooltip">
                            <button
                                onClick={toggleTheme}
                                className={cn(
                                    "relative hidden md:flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-500 group",
                                    "bg-white/20 dark:bg-white/10 backdrop-blur-md border border-white/30 dark:border-white/20",
                                    "hover:scale-110 hover:bg-white/30 dark:hover:bg-white/20",
                                    "text-slate-950 dark:text-white",
                                    // Aura Glow Effect
                                    "shadow-lg shadow-blue-300/0 hover:shadow-blue-400/50 dark:shadow-blue-500/0 dark:hover:shadow-blue-500/60",
                                    "hover:shadow-2xl"
                                )}
                                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                            >
                                {/* Inner Glow */}
                                <span className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-blue-400/20 to-emerald-400/20 blur-xl" />
                                {theme === 'dark' ? <Sun className="w-5 h-5 relative z-10" /> : <Moon className="w-5 h-5 relative z-10" />}
                            </button>

                            {/* Glassmorphism Tooltip */}
                            <div className={cn(
                                "absolute -bottom-12 left-1/2 -translate-x-1/2 opacity-0 group-hover/tooltip:opacity-100 pointer-events-none",
                                "transition-all duration-500 transform group-hover/tooltip:translate-y-0 translate-y-2",
                                "px-3 py-1.5 rounded-lg whitespace-nowrap",
                                "bg-white/40 dark:bg-slate-800/60 backdrop-blur-md",
                                "border border-white/30 dark:border-slate-700/50",
                                "shadow-lg"
                            )}>
                                <span className="text-xs font-medium text-slate-950 dark:text-white">
                                    {theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                                </span>
                            </div>
                        </div>


                        {/* Desktop: User Profile Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/50 dark:hover:bg-slate-800/50 transition-all text-slate-950 dark:text-white">
                                    <div className="relative w-8 h-8 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden border-2 border-white/50">
                                        {profile?.avatar_url ? (
                                            <img
                                                src={`${profile.avatar_url}?t=${new Date().getTime()}`}
                                                alt="Avatar"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <User className="w-4 h-4" />
                                        )}
                                    </div>
                                    <div className="text-left hidden lg:block">
                                        <p className="text-sm font-medium leading-tight">
                                            {profile?.full_name || 'User'}
                                        </p>
                                        <p className="text-xs text-slate-700 dark:text-slate-300">
                                            {profile?.user_class ? `Kelas ${profile.user_class}` : profile?.nim}
                                        </p>
                                    </div>
                                    <ChevronDown className="w-4 h-4 hidden lg:block" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <div className="px-2 py-2">
                                    <p className="font-medium">{profile?.full_name || 'User'}</p>
                                    <p className="text-xs text-muted-foreground">{profile?.nim}</p>
                                    {roles[0] && (
                                        <Badge variant="secondary" className="mt-1">
                                            {roles[0] === 'admin_dev' && 'AdminDev'}
                                            {roles[0] === 'admin_kelas' && 'Admin Kelas'}
                                            {roles[0] === 'admin_dosen' && 'Dosen'}
                                            {roles[0] === 'mahasiswa' && 'Mahasiswa'}
                                        </Badge>
                                    )}
                                </div>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link to="/dashboard/profile" className="cursor-pointer flex items-center gap-2">
                                        <User className="w-4 h-4" />
                                        <span>Profil User</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={handleLogout}
                                    className="text-destructive focus:text-destructive cursor-pointer flex items-center gap-2"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span>Log Out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Mobile: Hamburger Menu */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden text-slate-950 dark:text-white"
                        >
                            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </Button>
                    </div>
                </div>
            </nav>

            {/* Mobile Drawer Menu */}
            {mobileMenuOpen && (
                <>
                    {/* Overlay */}
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
                        onClick={() => setMobileMenuOpen(false)}
                    />

                    {/* Drawer */}
                    <div className="fixed top-16 left-0 right-0 bottom-0 bg-background z-50 md:hidden overflow-y-auto">
                        <div className="p-4 space-y-2">
                            {/* User Info */}
                            <div className="p-4 rounded-xl bg-muted/50 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="relative w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                                        {profile?.avatar_url ? (
                                            <img
                                                src={`${profile.avatar_url}?t=${new Date().getTime()}`}
                                                alt="Avatar"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <User className="w-6 h-6 text-primary" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-sm">{profile?.full_name || 'User'}</p>
                                        <p className="text-xs text-muted-foreground">{profile?.nim}</p>
                                        {roles[0] && (
                                            <Badge variant="secondary" className="mt-1">
                                                {roles[0] === 'admin_dev' && 'AdminDev'}
                                                {roles[0] === 'admin_kelas' && 'Admin Kelas'}
                                                {roles[0] === 'admin_dosen' && 'Dosen'}
                                                {roles[0] === 'mahasiswa' && 'Mahasiswa'}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Menu Items */}
                            {menuItems.map((item) => {
                                if (!checkAccess(item.roles)) return null;

                                const accessibleChildren = item.children?.filter((child) =>
                                    checkAccess(child.roles)
                                );

                                if (item.children && (!accessibleChildren || accessibleChildren.length === 0)) {
                                    return null;
                                }

                                if (item.path) {
                                    return (
                                        <Link
                                            key={item.label}
                                            to={item.path}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className={cn(
                                                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                                                isActive(item.path)
                                                    ? 'bg-blue-100 text-slate-950 dark:bg-blue-900/30 dark:text-white'
                                                    : 'hover:bg-muted'
                                            )}
                                        >
                                            <item.icon className="w-5 h-5" />
                                            {item.label}
                                        </Link>
                                    );
                                }

                                return (
                                    <div key={item.label}>
                                        <button
                                            onClick={() =>
                                                setOpenDropdown(openDropdown === item.label ? null : item.label)
                                            }
                                            className={cn(
                                                'w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                                                isParentActive(accessibleChildren)
                                                    ? 'bg-blue-50 text-slate-950 dark:bg-blue-950/30'
                                                    : 'hover:bg-muted'
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <item.icon className="w-5 h-5" />
                                                {item.label}
                                            </div>
                                            <ChevronDown
                                                className={cn(
                                                    'w-4 h-4 transition-transform',
                                                    openDropdown === item.label && 'rotate-180'
                                                )}
                                            />
                                        </button>
                                        {openDropdown === item.label && accessibleChildren && (
                                            <div className="ml-4 mt-1 space-y-1">
                                                {accessibleChildren.map((child) => (
                                                    <Link
                                                        key={child.path}
                                                        to={child.path}
                                                        onClick={() => setMobileMenuOpen(false)}
                                                        className={cn(
                                                            'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all',
                                                            isActive(child.path)
                                                                ? 'bg-blue-200 text-slate-950 dark:bg-blue-800/30'
                                                                : 'text-muted-foreground hover:bg-muted'
                                                        )}
                                                    >
                                                        <child.icon className="w-4 h-4" />
                                                        {child.label}
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Quick Access Buttons (Mobile) */}
                            <div className="border-t border-border pt-4 mt-4 space-y-2">
                                {/* Layout Switcher */}
                                <button
                                    onClick={() => {
                                        onModeChange(NAVIGATION_MODE_SIDEBAR);
                                        setMobileMenuOpen(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                                >
                                    <Layout className="w-5 h-5" />
                                    <span>Switch to Sidebar Layout</span>
                                </button>

                                {/* Theme Toggle */}
                                <button
                                    onClick={() => {
                                        toggleTheme();
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all bg-muted hover:bg-muted/80"
                                >
                                    {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                                    <span>{theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
                                </button>
                            </div>

                            {/* Logout */}
                            <Button
                                variant="ghost"
                                className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10 mt-4"
                                onClick={handleLogout}
                            >
                                <LogOut className="w-5 h-5" />
                                Log Out
                            </Button>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
