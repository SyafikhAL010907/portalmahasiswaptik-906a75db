import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
    Home, 
    MapPin, 
    Wallet, 
    Settings, 
    QrCode, 
    Scan, 
    Plus,
    History,
    CreditCard,
    BarChart3,
    User,
    Lock,
    Trophy,
    Award,
    Megaphone,
    ShieldAlert,
    BookOpen,
    CalendarDays,
    MessageCircle,
    Users,
    GraduationCap,
    LogOut
} from 'lucide-react';
import { AnimatePresence, motion } from "framer-motion";
import { useResponsive } from "@/hooks/useResponsive";
import { cn } from "@/lib/utils";
import { useAuth } from '@/contexts/AuthContext';

type OverlayType = 'none' | 'absensi' | 'keuangan' | 'profil' | 'fab';

const NotchedBackground = () => (
    <div className="absolute inset-0 z-0 pointer-events-none">
        <svg
            width="100%"
            height="100%"
            viewBox="0 0 1000 80"
            preserveAspectRatio="xMidYMin slice"
            className="drop-shadow-[0_15px_40px_rgba(0,0,0,0.15)] filter transition-all duration-500"
        >
            <path
                d="M-500,40 
                   C-500,18 -482,0 -460,0 
                   L430,0 
                   C450,0 455,5 460,15 
                   C480,62 520,62 540,15 
                   C545,5 550,0 570,0 
                   L1460,0 
                   C1482,0 1500,18 1500,40 
                   L1500,40 
                   C1500,62 1482,80 1460,80 
                   L-460,80 
                   C-482,80 -500,62 -500,40 
                   Z"
                className="fill-white/95 dark:fill-slate-900/95 backdrop-blur-3xl stroke-slate-200/50 dark:stroke-white/10"
                strokeWidth="1.5"
            />
        </svg>
    </div>
);

export function BottomNav() {
    const { isLandscape } = useResponsive();
    const location = useLocation();
    const navigate = useNavigate();
    const { roles, signOut } = useAuth();
    
    const [activeOverlay, setActiveOverlay] = useState<OverlayType>('none');

    const isMahasiswa = roles.includes('mahasiswa');
    const isAdminDev = roles.includes('admin_dev');
    const isDosen = roles.includes('admin_dosen');
    const isKelas = roles.includes('admin_kelas');
    
    const canGenerateQR = isDosen || isAdminDev;
    const canScanQR = isMahasiswa || isAdminDev || isKelas;

    const isActive = (overlayId: string) => {
        if (overlayId === 'beranda') return location.pathname === '/dashboard' && activeOverlay === 'none';
        return activeOverlay === overlayId;
    };

    const handleNavClick = (overlayId: string) => {
        if (overlayId === 'beranda') {
            setActiveOverlay('none');
            navigate('/dashboard');
        } else {
            setActiveOverlay(activeOverlay === overlayId ? 'none' : overlayId as OverlayType);
        }
    };

    const closeOverlay = () => {
        setActiveOverlay('none');
    };

    const openGlobalChat = (e?: React.MouseEvent) => {
        e?.preventDefault();
        window.dispatchEvent(new Event('open-global-chat'));
        closeOverlay();
    };

    // Staggered Spring Animation Variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.05, delayChildren: 0.05 }
        },
        exit: {
            opacity: 0,
            transition: { staggerChildren: 0.05, staggerDirection: -1 }
        }
    };

    const floatingItemVariants: import("framer-motion").Variants = {
        hidden: { opacity: 0, scale: 0, y: 20 },
        visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", damping: 15, stiffness: 300 } },
        exit: { opacity: 0, scale: 0, y: 20, transition: { duration: 0.15 } }
    };

    const arcItemVariants: import("framer-motion").Variants = {
        hidden: { opacity: 0, scale: 0, x: 0, y: 0 },
        visible: (custom: { x: number, y: number }) => ({
            opacity: 1,
            scale: 1,
            x: custom.x,
            y: custom.y,
            transition: { type: "spring", damping: 12, stiffness: 200 }
        }),
        exit: { opacity: 0, scale: 0, x: 0, y: 0, transition: { duration: 0.15 } }
    };

    // --- DATA DEFINITIONS ---

    type NavStackItem = {
        icon: any;
        path: string;
        show: boolean;
        color: string;
        onClick?: (e: React.MouseEvent) => void;
    };

    const absensiItems: NavStackItem[] = [
        { icon: Scan, path: '/dashboard/scan-qr', show: canScanQR, color: 'bg-blue-500 shadow-blue-500/50' },
        { icon: QrCode, path: '/dashboard/qr-generator', show: canGenerateQR, color: 'bg-indigo-500 shadow-indigo-500/50' },
        { icon: History, path: '/dashboard/attendance-history', show: true, color: 'bg-violet-500 shadow-violet-500/50' }
    ].filter(i => i.show);

    const keuanganItems: NavStackItem[] = [
        { icon: CreditCard, path: '/dashboard/payment', show: true, color: 'bg-emerald-500 shadow-emerald-500/50' },
        { icon: BarChart3, path: '/dashboard/finance', show: true, color: 'bg-blue-500 shadow-blue-500/50' }
    ].filter(i => i.show);

    const profilItems: NavStackItem[] = [
        { icon: LogOut, path: '#', onClick: async () => { await signOut(); navigate('/login'); }, show: true, color: 'bg-rose-500 shadow-rose-500/50' },
        { icon: Users, path: '/dashboard/users', show: isAdminDev, color: 'bg-indigo-600 shadow-indigo-600/50' },
        { icon: MessageCircle, path: '#', onClick: openGlobalChat, show: !isDosen, color: 'bg-indigo-500 shadow-indigo-500/50' },
        { icon: Lock, path: '/dashboard/change-password', show: true, color: 'bg-slate-700 shadow-slate-700/50' },
        { icon: User, path: '/dashboard/profile', show: true, color: 'bg-slate-900 shadow-slate-900/50' }
    ].filter(i => i.show);

    // ARC DATA for FAB (Center)
    // Angles for 5 items: 150, 120, 90, 60, 30. Radius = 90px
    const R = 115;
    const fabItems = [
        { icon: BookOpen, path: '/dashboard/repository', angle: 160, color: 'bg-indigo-500 shadow-indigo-500/50' },
        { icon: CalendarDays, path: '/dashboard/schedule', angle: 132, color: 'bg-blue-500 shadow-blue-500/50' },
        { icon: GraduationCap, path: '/dashboard/ipk-simulator', angle: 104, color: 'bg-purple-500 shadow-purple-500/50' },
        { icon: Trophy, path: '/dashboard/leaderboard', angle: 76, color: 'bg-amber-500 shadow-amber-500/50' },
        { icon: Award, path: '/dashboard/competitions', angle: 48, color: 'bg-rose-500 shadow-rose-500/50' },
        { icon: Megaphone, path: '/dashboard/announcements', angle: 20, color: 'bg-emerald-500 shadow-emerald-500/50' },
    ];

    // Compute dynamic nav bar based on role (Dosen excludes Keuangan)
    const navItems = [
        { id: 'beranda', icon: Home, label: 'Beranda' },
        { id: 'absensi', icon: MapPin, label: 'Absensi' },
        { id: 'fab', isFAB: true },
        isDosen
            ? { id: 'chat', icon: MessageCircle, label: 'Chat' }
            : { id: 'keuangan', icon: Wallet, label: 'Keuangan' },
        { id: 'profil', icon: Settings, label: 'Profil' },
    ];

    return (
        <>
            {/* Overlay Dimming Backdrop */}
            <AnimatePresence>
                {activeOverlay !== 'none' && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        onClick={closeOverlay}
                        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-all"
                    />
                )}
            </AnimatePresence>


            {/* Bottom Nav Container - Floating Capsule with Notch */}
            <div className={cn(
                "fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-2 h-[80px] pointer-events-none transition-all duration-500",
                isLandscape ? "w-[96%] max-w-3xl" : "w-[92%] max-w-lg"
            )}>
                <nav className="relative flex items-center justify-between px-6 h-full pointer-events-auto">
                    <NotchedBackground />
                    {navItems.map((item) => {
                        if (item.isFAB) {
                            return (
                                <div key="fab-slot" className="relative flex flex-col items-center w-[60px]">
                                    {/* ARC SPEED DIAL (Attached to FAB Position) */}
                                    <AnimatePresence>
                                        {activeOverlay === 'fab' && (
                                            <motion.div
                                                variants={containerVariants}
                                                initial="hidden"
                                                animate="visible"
                                                exit="exit"
                                                className="absolute bottom-[80px] w-0 h-0 pointer-events-none flex items-center justify-center"
                                            >
                                                {fabItems.map((fItem, idx) => {
                                                    const x = R * Math.cos((fItem.angle * Math.PI) / 180);
                                                    const y = -R * Math.sin((fItem.angle * Math.PI) / 180);
                                                    const FIcon = fItem.icon;
                                                    return (
                                                        <motion.div
                                                            key={`fab-arc-${idx}`}
                                                            custom={{ x, y }}
                                                            variants={arcItemVariants}
                                                            className="absolute"
                                                        >
                                                            <Link 
                                                                to={fItem.path}
                                                                onClick={closeOverlay}
                                                                className={cn(
                                                                    "w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg pointer-events-auto",
                                                                    "active:scale-90 transition-transform duration-200",
                                                                    fItem.color
                                                                )}
                                                            >
                                                                <FIcon className="w-5 h-5" />
                                                            </Link>
                                                        </motion.div>
                                                    );
                                                })}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* The Floating FAB Button */}
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        animate={{ rotate: activeOverlay === 'fab' ? 45 : 0 }}
                                        onClick={() => handleNavClick('fab')}
                                        className={cn(
                                            "absolute -top-16 w-[64px] h-[64px] rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 z-[70] pointer-events-auto",
                                            activeOverlay === 'fab'
                                              ? "bg-rose-500 text-white shadow-rose-500/50"
                                              : "bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-[0_10px_25px_rgba(79,70,229,0.4)]"
                                        )}
                                    >
                                        <Plus className="w-8 h-8" />
                                    </motion.button>
                                </div>
                            );
                        }

                        const ActiveIcon = item.icon!;
                        const active = isActive(item.id!);
                        
                        // Select correct items array for this button's stack
                        const stackItems = item.id === 'absensi' ? absensiItems : 
                                           item.id === 'keuangan' ? keuanganItems : 
                                           item.id === 'profil' ? profilItems : [];

                        const isDirectLink = item.id === 'admin';

                        return (
                            <div key={item.id} className="relative flex flex-col items-center">
                                {/* Vertical Speed Dial Stack for this Nav Item */}
                                <AnimatePresence>
                                    {activeOverlay === item.id && stackItems.length > 0 && (
                                        <motion.div
                                            variants={containerVariants}
                                            initial="hidden"
                                            animate="visible"
                                            exit="exit"
                                            className="absolute bottom-[80px] flex flex-col-reverse items-center gap-3 z-50 pb-2 pointer-events-none"
                                        >
                                            {stackItems.map((sItem, idx) => {
                                                const SIcon = sItem.icon;
                                                return (
                                                    <motion.div key={`${item.id}-${idx}`} variants={floatingItemVariants}>
                                                        <Link 
                                                            to={sItem.path}
                                                            onClick={(e) => {
                                                                if (sItem.onClick) {
                                                                    sItem.onClick(e);
                                                                } else {
                                                                    closeOverlay();
                                                                }
                                                            }}
                                                            className={cn(
                                                                "w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg pointer-events-auto hover:scale-110 active:scale-90 transition-transform duration-200",
                                                                sItem.color
                                                            )}
                                                        >
                                                            <SIcon className="w-5 h-5" />
                                                        </Link>
                                                    </motion.div>
                                                );
                                            })}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <button
                                    onClick={(e) => {
                                        if (item.id === 'chat') {
                                            openGlobalChat(e);
                                        } else if (isDirectLink) {
                                            navigate((item as any).path);
                                        } else {
                                            handleNavClick(item.id!);
                                        }
                                    }}
                                    className="flex flex-col items-center gap-1.5 group relative"
                                >
                                    <motion.div
                                        initial={false}
                                        animate={active ? { scale: 1.2, y: -4 } : { scale: 1, y: 0 }}
                                        className={cn(
                                            "p-2 rounded-2xl transition-all duration-300",
                                            active 
                                                ? "text-primary dark:text-blue-400 drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]" 
                                                : "text-slate-400 dark:text-slate-500"
                                        )}
                                    >
                                        <ActiveIcon className="w-6 h-6" />
                                    </motion.div>
                                    
                                    <AnimatePresence>
                                        {active && (
                                            <motion.span 
                                                initial={{ opacity: 0, y: 5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 5 }}
                                                className="absolute -bottom-1 text-[9px] font-black uppercase tracking-[0.2em] text-primary dark:text-blue-400 whitespace-nowrap"
                                            >
                                                {item.label}
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                </button>
                            </div>
                        );
                    })}

                </nav>
            </div>
        </>
    );
}

export const Sidebar = BottomNav;


