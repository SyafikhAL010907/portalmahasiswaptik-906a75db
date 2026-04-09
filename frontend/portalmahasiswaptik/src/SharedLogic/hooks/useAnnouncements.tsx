import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from "@/components/ui/use-toast";

export interface Announcement {
    id: string;
    title: string;
    content: string;
    created_at: string;
    category: string;
    is_pinned: boolean;
    priority: 'normal' | 'important';
    is_new: boolean;
}

export const categories = ['Semua', 'Akademik', 'Keuangan', 'Event', 'Sistem', 'Lomba'];
export const formCategories = ['Akademik', 'Keuangan', 'Event', 'Sistem', 'Lomba'];

export function useAnnouncements() {
    const { user, isAdminDev, isAdminKelas, isAdminDosen } = useAuth();
    const { toast } = useToast();

    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('Semua');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [currentAnnouncement, setCurrentAnnouncement] = useState<Announcement | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        category: 'Akademik',
        is_pinned: false,
        priority: 'normal' as 'normal' | 'important',
        is_new: true
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // RBAC Access
    const canManage = isAdminDev() || isAdminKelas() || isAdminDosen();

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('announcements')
                .select('*')
                .order('is_pinned', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAnnouncements(data as Announcement[]);
        } catch (error: any) {
            console.error('Error fetching announcements:', error);
            toast({
                variant: "destructive",
                title: "Gagal memuat pengumuman",
                description: error.message
            });
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (announcement?: Announcement) => {
        if (announcement) {
            setCurrentAnnouncement(announcement);
            setFormData({
                title: announcement.title,
                content: announcement.content,
                category: announcement.category,
                is_pinned: announcement.is_pinned,
                priority: announcement.priority,
                is_new: announcement.is_new
            });
        } else {
            setCurrentAnnouncement(null);
            setFormData({
                title: '',
                content: '',
                category: 'Akademik',
                is_pinned: false,
                priority: 'normal',
                is_new: true
            });
        }
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        try {
            setIsSubmitting(true);

            const payload = {
                ...formData,
                created_by: user.id
            };

            let error;
            if (currentAnnouncement) {
                // Update
                const { error: updateError } = await supabase
                    .from('announcements')
                    .update(payload)
                    .eq('id', currentAnnouncement.id);
                error = updateError;
            } else {
                // Create
                const { error: insertError } = await supabase
                    .from('announcements')
                    .insert([payload]);
                error = insertError;
            }

            if (error) throw error;

            toast({
                title: currentAnnouncement ? "Pengumuman diperbarui" : "Pengumuman dibuat",
                description: `Berhasil ${currentAnnouncement ? 'memperbarui' : 'membuat'} pengumuman.`
            });

            setIsDialogOpen(false);
            fetchAnnouncements();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Gagal menyimpan",
                description: error.message
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!currentAnnouncement) return;

        try {
            setIsSubmitting(true);
            const { error } = await supabase
                .from('announcements')
                .delete()
                .eq('id', currentAnnouncement.id);

            if (error) throw error;

            toast({
                title: "Pengumuman dihapus",
                description: "Berhasil menghapus pengumuman."
            });

            setIsDeleteDialogOpen(false);
            fetchAnnouncements();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Gagal menghapus",
                description: error.message
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredAnnouncements = selectedCategory === 'Semua'
        ? announcements
        : announcements.filter(a => a.category === selectedCategory);

    const pinnedAnnouncements = filteredAnnouncements.filter(a => a.is_pinned);
    const regularAnnouncements = filteredAnnouncements.filter(a => !a.is_pinned);

    return {
        state: {
            announcements, loading, selectedCategory, expandedId, isDialogOpen,
            isDeleteDialogOpen, currentAnnouncement, formData, isSubmitting, canManage,
            pinnedAnnouncements, regularAnnouncements
        },
        actions: {
            setSelectedCategory, setExpandedId, setIsDialogOpen, setIsDeleteDialogOpen,
            setCurrentAnnouncement, setFormData, handleOpenDialog, handleSubmit, handleDelete,
            fetchAnnouncements
        }
    };
}
