import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, User, Menu, X, Layout, Sun, Moon, Bell, Search, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

// Extend window interface for debounce
declare global {
    interface Window {
        mobileMenuTimeout?: NodeJS.Timeout | null;
    }
}

// Optimized Mobile Menu Component (Isolated State)
const MobileMenu = React.memo(({ isOpen, onClose, onModeChange }: { isOpen: boolean; onClose: () => void; onModeChange: (mode: NavigationMode) => void }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { profile, roles, signOut } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    const menuItems = getMenuItems();

    // Close menu when route changes (redundant safety)
    useEffect(() => {
        if (isOpen) onClose();
    }, [location.pathname, isOpen, onClose]);

    const isActive = (path?: string) => path && location.pathname === path;
    const isParentActive = (children?: MenuItem['children']) => children?.some(child => location.pathname === child.path);
    const checkAccess = (itemRoles?: string[]) => hasAccess(itemRoles as any, roles);

    const handleLogout = async () => {
        onClose(); // Instant close
        await signOut();
        navigate('/login');
    };

    const toggleSidebar = () => {
        onClose();
        onModeChange(NAVIGATION_MODE_SIDEBAR);
    };

    const handleThemeToggle = () => {
        // Don't close menu for theme toggle, user might want to see the change
        toggleTheme();
    };

    return (
        <AnimatePresence mode='wait'>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xl z-[60] md:hidden touch-none cursor-pointer"
                        onClick={onClose}
                        style={{ willChange: 'opacity' }}
                    />

                    <motion.div
                        initial={{ y: -20, opacity: 0, scale: 0.98 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: -20, opacity: 0, scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
                        style={{
                            willChange: 'transform, opacity',
                            transform: 'translate3d(0,0,0)',
                            backfaceVisibility: 'hidden'
                        }}
                        className={cn(
                            "fixed top-[4.5rem] left-4 right-4 bottom-8 z-[70] md:hidden overflow-hidden font-pj",
                            "bg-slate-50/90 dark:bg-slate-900/60 backdrop-blur-2xl px-6 py-8",
                            "rounded-[2.5rem] border border-slate-200/50 dark:border-white/10 shadow-[0_20px_50px_rgba(59,130,246,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-y-auto"
                        )}
                    >
                        <div className="absolute top-10 right-10 w-48 h-48 bg-blue-500/10 rounded-full blur-[80px] animate-pulse pointer-events-none" />
                        <div className="absolute bottom-10 left-10 w-48 h-48 bg-purple-500/10 rounded-full blur-[80px] animate-pulse pointer-events-none" />

                        <div className="relative z-10 space-y-3">
                            <div className="p-6 rounded-[2rem] bg-gradient-to-br from-indigo-50 to-blue-50/50 dark:from-slate-800/80 dark:to-indigo-950/40 border border-white/40 dark:border-white/5 mb-6 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="relative w-16 h-16 rounded-full ring-4 ring-white/50 dark:ring-white/10 flex items-center justify-center overflow-hidden shadow-lg">
                                        {profile?.avatar_url ? (
                                            <img src={`${profile.avatar_url}?t=${new Date().getTime()}`} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-8 h-8 text-indigo-500" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-black text-lg text-slate-900 dark:text-white leading-tight">{profile?.full_name || 'User'}</p>
                                        <p className="text-xs font-mono font-bold text-slate-500 dark:text-blue-300 mt-1 tracking-wider uppercase">
                                            {profile?.user_class ? `Kelas ${profile.user_class}` : profile?.nim}
                                        </p>
                                        {roles[0] && (
                                            <Badge className="mt-2 bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 border-indigo-200/50">
                                                {roles[0] === 'admin_dev' && 'AdminDev'}
                                                {roles[0] === 'admin_kelas' && 'Admin Kelas'}
                                                {roles[0] === 'admin_dosen' && 'Dosen'}
                                                {roles[0] === 'mahasiswa' && 'Mahasiswa'}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 pb-6">
                                {menuItems.map((item) => {
                                    if (!checkAccess(item.roles)) return null;
                                    const accessibleChildren = item.children?.filter((child) => checkAccess(child.roles));

                                    if (item.children && (!accessibleChildren || accessibleChildren.length === 0)) return null;

                                    if (item.path) {
                                        return (
                                            <Link
                                                key={item.label}
                                                to={item.path}
                                                onClick={onClose}
                                                className={cn(
                                                    'relative flex items-center gap-4 px-6 py-4 rounded-[1.5rem] text-sm font-black transition-all duration-300 ease-in-out overflow-hidden group',
                                                    isActive(item.path)
                                                        ? 'bg-blue-600/10 text-slate-900 dark:text-white border-b-2 border-blue-600 dark:border-blue-400 font-bold'
                                                        : 'text-slate-700 dark:text-slate-400 bg-slate-200/20 border border-slate-200/40 backdrop-blur-md dark:bg-white/5 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10'
                                                )}
                                            >
                                                <span className={cn("absolute inset-0 -z-10 opacity-0 group-active:opacity-100 transition-opacity duration-300", "bg-[radial-gradient(circle_at_var(--mouse-x,50%)_var(--mouse-y,50%),rgba(59,130,246,0.25)_0%,rgba(168,85,247,0.1)_50%,transparent_100%)]")} />
                                                {isActive(item.path) && <span className="absolute inset-0 bg-blue-500/10 blur-2xl animate-pulse" />}
                                                <item.icon className={cn("w-5 h-5 relative z-10 transition-all duration-300", isActive(item.path) ? "text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.8)] scale-110" : "text-slate-400")} />
                                                <span className="relative z-10 uppercase tracking-tight font-pj">{item.label}</span>
                                            </Link>
                                        );
                                    }

                                    return (
                                        <div key={item.label} className="space-y-1">
                                            <button
                                                onClick={() => setOpenDropdown(openDropdown === item.label ? null : item.label)}
                                                className={cn(
                                                    'relative w-full flex items-center justify-between gap-4 px-6 py-4 rounded-[1.5rem] text-sm font-bold transition-all duration-300 ease-in-out overflow-hidden group',
                                                    isParentActive(accessibleChildren)
                                                        ? 'bg-indigo-500/10 text-slate-900 dark:text-white border-b-2 border-indigo-500 dark:border-indigo-400 font-bold'
                                                        : 'text-slate-700 dark:text-slate-400 bg-slate-200/20 border border-slate-200/40 backdrop-blur-md dark:bg-white/5 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10'
                                                )}
                                            >
                                                <span className={cn("absolute inset-0 -z-10 opacity-0 group-active:opacity-100 transition-opacity duration-300", "bg-[radial-gradient(circle_at_var(--mouse-x,50%)_var(--mouse-y,50%),rgba(168,85,247,0.25)_0%,rgba(59,130,246,0.1)_50%,transparent_100%)]")} />
                                                {isParentActive(accessibleChildren) && <span className="absolute inset-0 bg-indigo-500/5 blur-2xl animate-pulse" />}
                                                <div className="flex items-center gap-4 relative z-10">
                                                    <item.icon className={cn("w-5 h-5 transition-all duration-300", isParentActive(accessibleChildren) ? "text-indigo-500 drop-shadow-[0_0_15px_rgba(168,85,247,0.8)] scale-110" : "text-slate-400")} />
                                                    <span className="relative z-10 uppercase tracking-tight font-pj">{item.label}</span>
                                                </div>
                                                <ChevronDown className={cn('w-4 h-4 transition-transform duration-300 relative z-10', openDropdown === item.label && 'rotate-180')} />
                                            </button>
                                            <AnimatePresence>
                                                {openDropdown === item.label && accessibleChildren && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: "auto", opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.2 }} // Faster dropdown
                                                        className="ml-6 space-y-1 border-l-2 border-slate-200 dark:border-slate-800 pl-4 overflow-hidden"
                                                    >
                                                        {accessibleChildren.map((child) => (
                                                            <Link
                                                                key={child.path}
                                                                to={child.path}
                                                                onClick={onClose}
                                                                className={cn(
                                                                    'flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-200',
                                                                    isActive(child.path)
                                                                        ? 'text-blue-600 bg-blue-50/50 dark:text-blue-400 dark:bg-blue-900/20 shadow-sm'
                                                                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-white/5'
                                                                )}
                                                            >
                                                                <child.icon className="w-4 h-4" />
                                                                <span className="uppercase tracking-tighter text-[11px]">{child.label}</span>
                                                            </Link>
                                                        ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    );
                                })}

                                <div className="pt-6 border-t border-slate-200/50 dark:border-white/5 mt-6 space-y-6">
                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={toggleSidebar} className="group relative flex items-center justify-center gap-3 p-4 w-full rounded-2xl border bg-white/60 border-slate-200/60 dark:bg-slate-800/40 dark:border-white/5 overflow-hidden transition-all duration-300 shadow-sm dark:shadow-none active:scale-95">
                                            <div className="absolute inset-0 bg-gradient-to-tr from-purple-400/50 via-blue-400/50 to-emerald-300/50 blur-xl opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-300 ease-in-out" />
                                            <div className="relative z-10 flex flex-col items-center justify-center gap-1">
                                                <Layout className="w-6 h-6 text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-white group-active:text-indigo-600 dark:group-active:text-white transition-colors duration-300" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-white group-active:text-indigo-600 dark:group-active:text-white transition-colors duration-300">Sidebar</span>
                                            </div>
                                        </button>
                                        <button onClick={handleThemeToggle} className="group relative flex items-center justify-center gap-3 p-4 w-full rounded-2xl border bg-white/60 border-slate-200/60 dark:bg-slate-800/40 dark:border-white/5 overflow-hidden transition-all duration-300 shadow-sm dark:shadow-none active:scale-95">
                                            <div className="absolute inset-0 bg-gradient-to-tr from-purple-400/50 via-blue-400/50 to-emerald-300/50 blur-xl opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-300 ease-in-out" />
                                            <div className="relative z-10 flex flex-col items-center justify-center gap-1">
                                                {theme === 'dark' ? <Sun className="w-6 h-6 text-slate-600 dark:text-slate-400 group-hover:text-amber-500 dark:group-hover:text-amber-300" /> : <Moon className="w-6 h-6 text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-white" />}
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-white transition-colors duration-300">Mode</span>
                                            </div>
                                        </button>
                                    </div>
                                    <Button variant="ghost" className="relative w-full h-16 rounded-[2.5rem] justify-center gap-3 text-rose-500 hover:text-white hover:bg-rose-500 transition-all duration-300 font-black uppercase tracking-[0.2em] overflow-hidden group shadow-lg active:scale-95" onClick={handleLogout}>
                                        <div className="absolute inset-0 bg-gradient-to-r from-rose-500/10 to-transparent opacity-50" />
                                        <LogOut className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                                        <span className="relative z-10">LOG OUT</span>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
});

interface TopNavbarProps {
    onModeChange: (mode: NavigationMode) => void;
}

export function TopNavbarInternal({ onModeChange }: TopNavbarProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const { profile, roles, signOut } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // State Lock to prevent double-triggers and ghost clicks during animation
    const isTransitioning = useRef(false);

    const menuItems = getMenuItems();

    // Force close menu on route change - Strict dependency
    useEffect(() => {
        setMobileMenuOpen(false);
        // Reset lock on navigation
        isTransitioning.current = false;
    }, [location.pathname]);

    // Handle interactive glow mouse tracking
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const nav = document.querySelector('nav');
            if (nav) {
                const rect = nav.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                nav.style.setProperty('--mouse-x', `${x}px`);
                nav.style.setProperty('--mouse-y', `${y}px`);
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const isActive = (path?: string) => path && location.pathname === path;
    const isParentActive = (children?: MenuItem['children']) =>
        children?.some(child => location.pathname === child.path);

    const checkAccess = (itemRoles?: string[]) => hasAccess(itemRoles as any, roles);

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    const toggleSidebar = () => {
        onModeChange(NAVIGATION_MODE_SIDEBAR);
    };

    // Robust Toggle Handler
    const handleToggleMenu = (e: React.MouseEvent) => {
        // Stop ALL propagation immediately
        e.preventDefault();
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();

        // If locked, ignore completely
        if (isTransitioning.current) return;

        // Lock state
        isTransitioning.current = true;

        // Toggle State
        setMobileMenuOpen(prev => !prev);

        // Release lock after animation completes (450ms safety buffer for 400ms transition)
        setTimeout(() => {
            isTransitioning.current = false;
        }, 450);
    };

    // Safe Close Handler (Passed to child)
    const handleCloseMenu = useCallback(() => {
        // Prevent closing if we are in the middle of opening animation
        // This stops "ghost clicks" on the backdrop immediately after opening
        if (isTransitioning.current) return;

        setMobileMenuOpen(false);
    }, []);

    return (
        <>
            {/* Desktop Top Navbar - FIXED POSITIONING */}
            <nav
                className={cn(
                    'fixed top-0 left-0 right-0 w-full h-16 z-50 transition-all duration-500 font-pj',
                    'bg-white/5 dark:bg-slate-950/20 backdrop-blur-2xl border-b border-white/10 shadow-sm'
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
                                                'relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-500 overflow-hidden group',
                                                isActive(item.path)
                                                    ? 'bg-blue-600/10 text-slate-950 shadow-sm border-b-2 border-blue-600 dark:bg-white/10 dark:text-white dark:border-blue-400'
                                                    : 'text-slate-700 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
                                            )}
                                        >
                                            {/* Universal Holographic Cursor Glow */}
                                            <span className={cn(
                                                "absolute inset-0 -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                                                "bg-[radial-gradient(circle_at_var(--mouse-x,50%)_var(--mouse-y,50%),rgba(59,130,246,0.15)_0%,rgba(168,85,247,0.05)_50%,transparent_100%)]",
                                            )} />

                                            <item.icon className={cn("w-4 h-4 relative z-10", isActive(item.path) ? "text-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.4)]" : "text-muted-foreground")} />
                                            <span className="relative z-10 uppercase tracking-tighter font-pj">{item.label}</span>
                                        </Link>
                                    );
                                }

                                // Dropdown menu item
                                return (
                                    <DropdownMenu key={item.label}>
                                        <DropdownMenuTrigger asChild>
                                            <button
                                                className={cn(
                                                    'relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-500 overflow-hidden group',
                                                    isParentActive(accessibleChildren)
                                                        ? 'bg-blue-600/10 text-slate-950 shadow-sm border-b-2 border-blue-600 dark:bg-white/10 dark:text-white dark:border-blue-400'
                                                        : 'text-slate-700 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
                                                )}
                                            >
                                                {/* Universal Holographic Cursor Glow */}
                                                <span className={cn(
                                                    "absolute inset-0 -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                                                    "bg-[radial-gradient(circle_at_var(--mouse-x,50%)_var(--mouse-y,50%),rgba(59,130,246,0.15)_0%,rgba(168,85,247,0.05)_50%,transparent_100%)]",
                                                )} />

                                                <item.icon className={cn("w-4 h-4 relative z-10 transition-transform duration-500 group-hover:scale-110", isParentActive(accessibleChildren) ? "text-blue-500 drop-shadow-[0_0_12px_rgba(59,130,246,0.4)]" : "text-muted-foreground")} />
                                                <span className="relative z-10 uppercase tracking-tighter font-pj">{item.label}</span>
                                                <ChevronDown className="w-3 h-3 relative z-10 group-hover:rotate-180 transition-transform duration-500" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start" className="w-48 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-white/20 p-2 rounded-2xl shadow-2xl">
                                            {accessibleChildren?.map((child) => (
                                                <DropdownMenuItem key={child.path} asChild>
                                                    <Link
                                                        to={child.path}
                                                        className={cn(
                                                            'flex items-center gap-2 cursor-pointer transition-all duration-300 rounded-xl px-4 py-2.5 font-pj font-bold text-xs uppercase tracking-tighter',
                                                            isActive(child.path)
                                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                                                : 'hover:bg-white/10 dark:hover:bg-white/5'
                                                        )}
                                                    >
                                                        <child.icon className={cn("w-4 h-4", isActive(child.path) ? "text-white" : "text-blue-500")} />
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
                                onClick={toggleSidebar}
                                className={cn(
                                    "relative hidden md:flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-500 group overflow-hidden",
                                    "bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/10",
                                    "hover:scale-110",
                                    "text-slate-950 dark:text-white shadow-sm"
                                )}
                                title="Switch to Sidebar Layout"
                            >
                                {/* Universal Holographic Cursor Glow */}
                                <span className={cn(
                                    "absolute inset-0 -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                                    "bg-[radial-gradient(circle_at_var(--mouse-x,50%)_var(--mouse-y,50%),rgba(168,85,247,0.15)_0%,rgba(59,130,246,0.05)_50%,transparent_100%)]",
                                )} />
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
                                    "relative hidden md:flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-500 group overflow-hidden",
                                    "bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/10",
                                    "hover:scale-110",
                                    "text-slate-950 dark:text-white shadow-sm"
                                )}
                                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                            >
                                {/* Universal Holographic Cursor Glow */}
                                <span className={cn(
                                    "absolute inset-0 -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                                    "bg-[radial-gradient(circle_at_var(--mouse-x,50%)_var(--mouse-y,50%),rgba(59,130,246,0.15)_0%,rgba(16,185,129,0.05)_50%,transparent_100%)]",
                                )} />
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

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="relative group hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-white/10 dark:hover:bg-white/5 transition-all text-slate-950 dark:text-white overflow-hidden">
                                    {/* Universal Holographic Cursor Glow */}
                                    <span className={cn(
                                        "absolute inset-0 -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                                        "bg-[radial-gradient(circle_at_var(--mouse-x,50%)_var(--mouse-y,50%),rgba(59,130,246,0.1)_0%,transparent_100%)]",
                                    )} />
                                    <div className="relative w-8 h-8 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden border-2 border-white/50 shadow-sm">
                                        {profile?.avatar_url ? (
                                            <img
                                                src={`${profile.avatar_url}?t=${new Date().getTime()}`}
                                                alt="Avatar"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <User className="w-4 h-4 text-blue-500" />
                                        )}
                                    </div>
                                    <div className="text-left hidden lg:block">
                                        <p className="text-sm font-bold leading-tight font-pj">
                                            {profile?.full_name || 'User'}
                                        </p>
                                        <p className="text-[10px] font-pj font-bold text-slate-500 dark:text-blue-300 mt-0.5 tracking-tight">
                                            {profile?.user_class ? `Kelas ${profile.user_class}` : profile?.nim}
                                        </p>
                                    </div>
                                    <ChevronDown className="w-4 h-4 hidden lg:block transition-transform duration-500 group-hover:rotate-180" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl">
                                <div className="px-4 py-3 bg-gradient-to-br from-indigo-500/10 to-blue-500/10 dark:from-indigo-500/20 dark:to-blue-500/20">
                                    <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{profile?.full_name || 'User'}</p>
                                    <p className="text-[10px] font-mono text-slate-500 dark:text-blue-300 mt-1 uppercase tracking-wider">{profile?.nim}</p>
                                    {roles[0] && (
                                        <Badge variant="secondary" className="mt-2 bg-white/50 dark:bg-white/10 text-[9px] uppercase tracking-widest px-2 py-0 border-none shadow-none text-indigo-600 dark:text-indigo-400">
                                            {roles[0] === 'admin_dev' && 'AdminDev'}
                                            {roles[0] === 'admin_kelas' && 'Admin Kelas'}
                                            {roles[0] === 'admin_dosen' && 'Dosen'}
                                            {roles[0] === 'mahasiswa' && 'Mahasiswa'}
                                        </Badge>
                                    )}
                                </div>
                                <DropdownMenuSeparator className="bg-white/10 dark:bg-white/5" />
                                <DropdownMenuItem asChild>
                                    <Link to="/dashboard/profile" className="cursor-pointer flex items-center gap-2 px-4 py-3 hover:bg-white/10 dark:hover:bg-white/5 transition-colors">
                                        <User className="w-4 h-4 text-blue-500" />
                                        <span className="font-bold text-xs uppercase tracking-tight">Profil User</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/10 dark:bg-white/5" />
                                <DropdownMenuItem
                                    onClick={handleLogout}
                                    className="text-rose-500 focus:text-rose-500 cursor-pointer flex items-center gap-2 px-4 py-3 hover:bg-rose-500/10 transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span className="font-bold text-xs uppercase tracking-tight">Log Out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Mobile: Hamburger Menu (Stabilized) */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleToggleMenu}
                            className="md:hidden text-slate-950 dark:text-white touch-none"
                            style={{ touchAction: 'manipulation' }}
                        >
                            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </Button>
                    </div>
                </div>
            </nav>

            {/* Mobile Drawer Menu Overhaul */}
            {/* Mobile Drawer Menu (Memoized) */}
            <MobileMenu
                isOpen={mobileMenuOpen}
                onClose={handleCloseMenu}
                onModeChange={onModeChange}
            />
        </>
    );
}
// Memoize TopNavbar to prevent re-renders unless mode changes
export const TopNavbar = React.memo(TopNavbarInternal);
