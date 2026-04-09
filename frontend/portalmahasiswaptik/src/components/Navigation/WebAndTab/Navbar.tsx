import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, User, Menu, X, Layout, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/contexts/ThemeContext';
import {
    getMenuItems,
    hasAccess,
    type MenuItem,
    type NavigationMode,
    NAVIGATION_MODE_SIDEBAR,
} from '@/lib/navigationConfig';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Optimized Mobile Menu Component (Isolated State)
const MobileMenu = React.memo(({ onClose }: { onClose: () => void }) => {
    const handleClose = () => {
        onClose();
    };
    const location = useLocation();
    const navigate = useNavigate();
    const { profile, roles, signOut } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    const menuItems = getMenuItems();

    const isActive = (path?: string) => path && location.pathname === path;
    const isParentActive = (children?: MenuItem['children']) => children?.some(child => location.pathname === child.path);
    const checkAccess = (itemRoles?: string[]) => hasAccess(itemRoles as any, roles);

    const handleLogout = async () => {
        await signOut();
        localStorage.clear();
        navigate('/login');
    };

    return (
        <div key="mobile-wrapper">
            <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-xl z-[60] md:hidden"
                onClick={handleClose}
            />

            <motion.div
                key="mobile-content"
                initial={{ y: -20, opacity: 0, scale: 0.98 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -20, opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
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
                                        onClick={handleClose}
                                        className={cn(
                                            'relative flex items-center gap-4 px-6 py-4 rounded-[1.5rem] text-sm font-black transition-all duration-500 ease-in-out overflow-hidden group',
                                            isActive(item.path)
                                                ? 'bg-blue-600/10 text-slate-900 dark:text-white border-b-2 border-blue-600 dark:border-blue-400 font-bold'
                                                : 'text-slate-700 dark:text-slate-400 bg-slate-200/20 border border-slate-200/40 backdrop-blur-md dark:bg-white/5 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10'
                                        )}
                                    >
                                        <item.icon className={cn("w-5 h-5 relative z-10 transition-all duration-500", isActive(item.path) ? "text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.8)] scale-110" : "text-slate-400")} />
                                        <span className="relative z-10 uppercase tracking-tight font-pj">{item.label}</span>
                                    </Link>
                                );
                            }

                            return (
                                <div key={item.label} className="space-y-1">
                                    <button
                                        onClick={() => setOpenDropdown(openDropdown === item.label ? null : item.label)}
                                        className={cn(
                                            'relative w-full flex items-center justify-between gap-4 px-6 py-4 rounded-[1.5rem] text-sm font-bold transition-all duration-500 ease-in-out overflow-hidden group',
                                            isParentActive(accessibleChildren)
                                                ? 'bg-indigo-500/10 text-slate-900 dark:text-white border-b-2 border-indigo-500 dark:border-indigo-400 font-bold'
                                                : 'text-slate-700 dark:text-slate-400 bg-slate-200/20 border border-slate-200/40 backdrop-blur-md dark:bg-white/5 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10'
                                        )}
                                    >
                                        <div className="flex items-center gap-4 relative z-10">
                                            <item.icon className={cn("w-5 h-5 transition-all duration-500", isParentActive(accessibleChildren) ? "text-indigo-500 drop-shadow-[0_0_15px_rgba(168,85,247,0.8)] scale-110" : "text-slate-400")} />
                                            <span className="relative z-10 uppercase tracking-tight font-pj">{item.label}</span>
                                        </div>
                                        <ChevronDown className={cn('w-4 h-4 transition-transform duration-500 relative z-10', openDropdown === item.label && 'rotate-180')} />
                                    </button>
                                    <AnimatePresence>
                                        {openDropdown === item.label && accessibleChildren && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.3 }}
                                                className="ml-6 space-y-1 border-l-2 border-slate-200 dark:border-slate-800 pl-4 overflow-hidden"
                                            >
                                                {accessibleChildren.map((child) => (
                                                    <Link
                                                        key={child.path}
                                                        to={child.path}
                                                        onClick={handleClose}
                                                        className={cn(
                                                            'flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-300',
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
                            <div className="grid grid-cols-1 gap-3">
                                <button onClick={toggleTheme} className="group relative flex items-center justify-center gap-3 p-4 w-full rounded-2xl border bg-white/60 border-slate-200/60 dark:bg-slate-800/40 dark:border-white/5 overflow-hidden transition-all duration-300 shadow-sm dark:shadow-none">
                                    <div className="relative z-10 flex flex-col items-center justify-center gap-1">
                                        {theme === 'dark' ? <Sun className="w-6 h-6 text-slate-600 dark:text-slate-400 group-hover:text-amber-500" /> : <Moon className="w-6 h-6 text-slate-600 dark:text-slate-400 group-hover:text-indigo-600" />}
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 transition-colors duration-300">Mode</span>
                                    </div>
                                </button>
                            </div>
                            <Button variant="ghost" className="relative w-full h-16 rounded-[2.5rem] justify-center gap-3 text-rose-500 hover:text-white hover:bg-rose-500 transition-all duration-500 font-black uppercase tracking-[0.2em] overflow-hidden group shadow-lg" onClick={handleLogout}>
                                <LogOut className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                                <span className="relative z-10">LOG OUT</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
});

interface NavbarProps {
    onModeChange: (mode: NavigationMode) => void;
}

export function Navbar({ onModeChange }: NavbarProps) {
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
        localStorage.clear();
        navigate('/login');
    };

    const toggleSidebar = () => {
        onModeChange(NAVIGATION_MODE_SIDEBAR);
    };

    return (
        <>
            <nav className={cn(
                'fixed top-0 left-0 right-0 w-full h-16 lg:h-24 z-50 transition-all duration-500 font-pj',
                'bg-white/80 dark:bg-slate-950/95 backdrop-blur-3xl border-b border-slate-200/50 dark:border-white/10 shadow-2xl'
            )}>
                <div className="h-full px-4 lg:px-12 flex items-center justify-between">
                    {/* LEFT: LOGO */}
                    <div className="flex items-center shrink-0">
                        <Link to="/dashboard" className="flex items-center gap-3 lg:gap-6 hover:opacity-80 transition-opacity">
                            <div className="bg-transparent flex items-center justify-center shrink-0">
                                <img
                                    src="https://ft.unj.ac.id/ptik/wp-content/uploads/2021/07/LOGO-BEMP-PTIK-150x150.png"
                                    alt="Logo BEMP PTIK"
                                    className="w-10 h-10 lg:w-14 lg:h-14 object-contain"
                                />
                            </div>
                            <div className="hidden xl:block font-black text-xl lg:text-2xl text-slate-900 dark:text-white tracking-tighter uppercase font-pj">PTIK 2025</div>
                        </Link>
                    </div>

                    {/* CENTER: MENU ITEMS (Safe Scrollable Basin) */}
                    <div className="hidden md:flex flex-1 items-center justify-center min-w-0 px-4">
                        <div className="flex items-center gap-1 lg:gap-2 xl:gap-3 overflow-x-auto nav-scrollbar py-2 max-w-full">
                            {menuItems.map((item) => {
                                if (!checkAccess(item.roles)) return null;
                                const accessibleChildren = item.children?.filter((child) => checkAccess(child.roles));
                                if (item.children && (!accessibleChildren || accessibleChildren.length === 0)) return null;

                                if (item.path) {
                                    return (
                                        <Link
                                            key={item.label}
                                            to={item.path}
                                            className={cn(
                                                'relative flex items-center gap-2 lg:gap-2.5 px-3 lg:px-4 xl:px-6 py-3 rounded-2xl text-[10px] lg:text-[13px] xl:text-[17px] font-pj font-black transition-all duration-500 group shrink-0 whitespace-nowrap',
                                                isActive(item.path)
                                                    ? 'bg-blue-600/10 text-blue-600 dark:bg-blue-600/20 dark:text-white shadow-[0_0_30px_rgba(37,99,235,0.1)] border-b-2 border-blue-500'
                                                    : 'text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                                            )}
                                        >
                                            <item.icon className={cn("w-3.5 h-3.5 lg:w-4 lg:h-4 xl:w-5 xl:h-5", isActive(item.path) ? "text-blue-500" : "text-slate-500")} />
                                            <span className="uppercase tracking-tight">{item.label}</span>
                                        </Link>
                                    );
                                }

                                return (
                                    <DropdownMenu key={item.label}>
                                        <DropdownMenuTrigger asChild>
                                            <button className={cn(
                                                'relative flex items-center gap-2 lg:gap-2.5 px-3 lg:px-4 xl:px-6 py-3 rounded-2xl text-[10px] lg:text-[13px] xl:text-[17px] font-pj font-black transition-all duration-500 group shrink-0 whitespace-nowrap',
                                                isParentActive(accessibleChildren)
                                                    ? 'bg-blue-600/10 text-blue-600 dark:bg-blue-600/20 dark:text-white shadow-[0_0_30px_rgba(37,99,235,0.1)] border-b-2 border-blue-500'
                                                    : 'text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                                            )}>
                                                <item.icon className={cn("w-3.5 h-3.5 lg:w-4 lg:h-4 xl:w-5 xl:h-5", isParentActive(accessibleChildren) ? "text-blue-500" : "text-slate-500")} />
                                                <span className="uppercase tracking-tight">{item.label}</span>
                                                <ChevronDown className="w-2.5 h-2.5 lg:w-3.5 lg:h-3.5" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="center" className="w-60 bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl border border-slate-200/50 dark:border-white/10 p-2 rounded-2xl shadow-2xl z-[100]">
                                            {accessibleChildren?.map((child) => (
                                                <DropdownMenuItem key={child.path} asChild>
                                                    <Link
                                                        to={child.path}
                                                        className={cn(
                                                            'flex items-center gap-3 px-4 py-3 rounded-xl text-slate-800 dark:text-white font-black text-xs uppercase tracking-tighter hover:bg-black/5 dark:hover:bg-white/10 transition-all cursor-pointer outline-none',
                                                            isActive(child.path) ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : ''
                                                        )}
                                                    >
                                                        <child.icon className={cn("w-4 h-4", isActive(child.path) ? "text-white" : "text-blue-400")} />
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

                    {/* RIGHT: SETTINGS & PROFILE (Fixed Spacing) */}
                    <div className="flex items-center justify-end gap-2 lg:gap-4 shrink-0 px-2">
                        <div className="hidden md:flex items-center gap-3 lg:gap-5">
                            <button onClick={toggleSidebar} className="flex items-center justify-center w-11 lg:w-16 h-11 lg:h-16 rounded-3xl bg-slate-900/5 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 hover:bg-slate-900/10 dark:hover:bg-white/10 text-slate-700 dark:text-white transition-all hover:scale-110 shadow-lg">
                                <Layout className="w-5 lg:w-8 h-5 lg:h-8" />
                            </button>
                            <button onClick={toggleTheme} className="flex items-center justify-center w-11 lg:w-16 h-11 lg:h-16 rounded-3xl bg-slate-900/5 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 hover:bg-slate-900/10 dark:hover:bg-white/10 text-slate-700 dark:text-white transition-all hover:scale-110 shadow-lg">
                                {theme === 'dark' ? <Sun className="w-5 lg:w-8 h-5 lg:h-8" /> : <Moon className="w-5 lg:w-8 h-5 lg:h-8" />}
                            </button>
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="flex items-center gap-2 lg:gap-5 px-2 lg:px-5 py-2 rounded-3xl hover:bg-white/5 transition-all group shrink-0">
                                     <div className="w-10 h-10 lg:w-16 lg:h-16 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-white/20 flex items-center justify-center overflow-hidden shrink-0 group-hover:border-blue-500 transition-colors shadow-xl">
                                        {profile?.avatar_url ? (
                                            <img src={`${profile.avatar_url}?t=${new Date().getTime()}`} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-6 lg:w-10 h-6 lg:h-10 text-blue-500" />
                                        )}
                                    </div>
                                    <div className="hidden 2xl:block text-left">
                                        <p className="font-black text-sm lg:text-[18px] text-slate-800 dark:text-white leading-none truncate max-w-[150px] font-pj uppercase tracking-tight">{profile?.full_name || 'User'}</p>
                                        <p className="text-[10px] lg:text-xs font-bold text-blue-600 dark:text-blue-400 mt-1.5 uppercase tracking-widest font-pj">{profile?.user_class ? `Kelas ${profile.user_class}` : profile?.nim}</p>
                                    </div>
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" sideOffset={12} className="w-56 bg-white dark:bg-slate-900/98 backdrop-blur-3xl border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-2 z-[100]">
                                <DropdownMenuItem asChild>
                                    <Link to="/dashboard/profile" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-800 dark:text-white font-black text-xs hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer outline-none">
                                        <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                        PROFIL USER
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 rounded-xl text-rose-500 font-black text-xs hover:bg-rose-500/10 transition-colors cursor-pointer outline-none">
                                    <LogOut className="w-4 h-4" />
                                    LOG OUT
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(prev => !prev)} className="md:hidden text-slate-800 dark:text-white w-10 h-10">
                            {mobileMenuOpen ? <X className="w-8 h-8" /> : <Menu className="w-8 h-8" />}
                        </Button>
                    </div>
                </div>
            </nav>

            <AnimatePresence mode="wait">
                {mobileMenuOpen && <MobileMenu onClose={() => setMobileMenuOpen(false)} />}
            </AnimatePresence>
        </>
    );
}
