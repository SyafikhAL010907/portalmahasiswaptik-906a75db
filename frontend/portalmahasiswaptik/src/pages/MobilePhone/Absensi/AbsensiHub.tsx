import React from 'react';
import { History, LayoutList, ClipboardCheck } from 'lucide-react';
import { HubGrid, HubItem } from '@/components/Features/Mobile/HubGrid';
import { useAuth } from '@/contexts/AuthContext';

export default function AbsensiHub() {
    const { roles } = useAuth();
    const isAdmin = roles.includes('admin_dev') || roles.includes('admin_dosen');

    return (
        <HubGrid 
            title="Absensi" 
            subtitle="Academic Attendance Hub"
        >
            <HubItem 
                icon={History} 
                label="Riwayat" 
                path="/dashboard/attendance-history" 
                description="Log Kehadiran"
                color="bg-blue-500"
                delay={0.1}
            />
            <HubItem 
                icon={LayoutList} 
                label="Status" 
                path="/dashboard/attendance-history" // Reuse or specific status page if exists
                description="Status Semester"
                color="bg-indigo-500"
                delay={0.2}
            />
            {isAdmin && (
                <HubItem 
                    icon={ClipboardCheck} 
                    label="Log Sesi" 
                    path="/dashboard/attendance-history" 
                    description="Admin Only"
                    color="bg-rose-500"
                    delay={0.3}
                />
            )}
        </HubGrid>
    );
}
