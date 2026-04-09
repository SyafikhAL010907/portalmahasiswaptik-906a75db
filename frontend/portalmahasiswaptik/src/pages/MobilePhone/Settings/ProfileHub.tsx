import React from 'react';
import { User, Lock, Trophy, Award, Megaphone, ShieldAlert } from 'lucide-react';
import { HubGrid, HubItem } from '@/components/Features/Mobile/HubGrid';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfileHub() {
    const { roles } = useAuth();
    const isAdmin = roles.includes('admin_dev');

    return (
        <HubGrid 
            title="Profil" 
            subtitle="User & Community Hub"
        >
            <HubItem 
                icon={User} 
                label="Profil" 
                path="/dashboard/profile" 
                description="Data Diri"
                color="bg-slate-800"
                delay={0.1}
            />
            <HubItem 
                icon={Lock} 
                label="Keamanan" 
                path="/dashboard/change-password" 
                description="Ganti Password"
                color="bg-slate-600"
                delay={0.2}
            />
            <HubItem 
                icon={Trophy} 
                label="Peringkat" 
                path="/dashboard/leaderboard" 
                description="Leaderboard"
                color="bg-amber-500"
                delay={0.3}
            />
            <HubItem 
                icon={Award} 
                label="Lomba" 
                path="/dashboard/competitions" 
                description="Info Kompetisi"
                color="bg-blue-600"
                delay={0.4}
            />
            <HubItem 
                icon={Megaphone} 
                label="Berita" 
                path="/dashboard/announcements" 
                description="Pengumuman"
                color="bg-indigo-600"
                delay={0.5}
            />
            {isAdmin && (
                <HubItem 
                    icon={ShieldAlert} 
                    label="Admin" 
                    path="/dashboard/users" 
                    description="User Management"
                    color="bg-rose-600"
                    delay={0.6}
                />
            )}
        </HubGrid>
    );
}
