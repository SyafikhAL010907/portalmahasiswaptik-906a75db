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
    Megaphone,
    Award,
    Trophy,
    Settings,
    User,
    Lock,
    Users,
    BarChart3,
    Shield,
    type LucideIcon
} from 'lucide-react';
import { AppRole } from '@/contexts/AuthContext';

export interface MenuItem {
    icon: LucideIcon;
    label: string;
    path?: string;
    roles?: AppRole[];
    children?: {
        icon: LucideIcon;
        label: string;
        path: string;
        roles?: AppRole[];
    }[];
}

export const NAVIGATION_MODE_SIDEBAR = 'sidebar';
export const NAVIGATION_MODE_NAVBAR = 'navbar';

export type NavigationMode = typeof NAVIGATION_MODE_SIDEBAR | typeof NAVIGATION_MODE_NAVBAR;

export const getMenuItems = (): MenuItem[] => [
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

    // Attendance
    {
        icon: MapPin,
        label: 'Absensi',
        children: [
            { icon: QrCode, label: 'Generator QR', path: '/dashboard/qr-generator', roles: ['admin_dosen', 'admin_dev'] },
            { icon: QrCode, label: 'Scan QR', path: '/dashboard/scan-qr', roles: ['mahasiswa', 'admin_dev', 'admin_kelas'] },
            { icon: History, label: 'Riwayat Kehadiran', path: '/dashboard/attendance-history', roles: ['mahasiswa', 'admin_dev', 'admin_kelas', 'admin_dosen'] },
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

export const hasAccess = (itemRoles?: AppRole[], userRoles?: AppRole[]): boolean => {
    if (!itemRoles || itemRoles.length === 0) return true;
    if (!userRoles || userRoles.length === 0) return false;
    return itemRoles.some(role => userRoles.includes(role));
};
