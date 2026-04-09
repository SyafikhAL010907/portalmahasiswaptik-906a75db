import React from 'react';
import { CreditCard, BarChart3, ShieldCheck } from 'lucide-react';
import { HubGrid, HubItem } from '@/components/Features/Mobile/HubGrid';
import { useAuth } from '@/contexts/AuthContext';

export default function KeuanganHub() {
    const { roles } = useAuth();
    const isAdmin = roles.includes('admin_dev') || roles.includes('admin_kelas');

    return (
        <HubGrid 
            title="Keuangan" 
            subtitle="Financial Management Hub"
        >
            <HubItem 
                icon={CreditCard} 
                label="Bayar" 
                path="/dashboard/payment" 
                description="Iuran Kas"
                color="bg-emerald-500"
                delay={0.1}
            />
            <HubItem 
                icon={BarChart3} 
                label="Statistik" 
                path="/dashboard/finance" 
                description="Arus Kas"
                color="bg-blue-500"
                delay={0.2}
            />
            {isAdmin && (
                <HubItem 
                    icon={ShieldCheck} 
                    label="Admin" 
                    path="/dashboard/finance" 
                    description="Manajemen Kas"
                    color="bg-rose-500"
                    delay={0.3}
                />
            )}
        </HubGrid>
    );
}
