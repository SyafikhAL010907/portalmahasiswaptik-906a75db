import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from "@/components/ui/use-toast";

export interface Competition {
    id: string;
    title: string;
    organizer: string;
    description: string | null;
    deadline: string;
    event_dates: string | null;
    location: string | null;
    prize: string | null;
    category: string;
    badge: string | null;
    team_size: string | null;
    link_url: string | null;
    created_at: string;
}

export const categories = ['Semua', 'Hackathon', 'Design', 'Data Science', 'Programming', 'Startup', 'Security'];
export const formCategories = ['Hackathon', 'Design', 'Data Science', 'Programming', 'Startup', 'Security'];

export function useCompetitions() {
    const { user, isAdminDev, isAdminKelas, isAdminDosen } = useAuth();
    const { toast } = useToast();

    const [competitions, setCompetitions] = useState<Competition[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('Semua');

    // Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [currentCompetition, setCurrentCompetition] = useState<Competition | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        organizer: '',
        description: '',
        deadline: '',
        event_dates: '',
        location: '',
        prize: '',
        category: 'Hackathon',
        badge: 'None',
        team_size: '',
        link_url: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // RBAC Access
    const canManage = isAdminDev() || isAdminKelas() || isAdminDosen();

    useEffect(() => {
        fetchCompetitions();
    }, []);

    const fetchCompetitions = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('competitions')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCompetitions(data as Competition[]);
        } catch (error: any) {
            console.error('Error fetching competitions:', error);
            toast({
                variant: "destructive",
                title: "Gagal memuat lomba",
                description: error.message
            });
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (competition?: Competition) => {
        if (competition) {
            setCurrentCompetition(competition);
            setFormData({
                title: competition.title,
                organizer: competition.organizer,
                description: competition.description || '',
                deadline: competition.deadline,
                event_dates: competition.event_dates || '',
                location: competition.location || '',
                prize: competition.prize ? competition.prize.replace(/^Rp\.\s?/, '') : '',
                category: competition.category,
                badge: competition.badge || 'None',
                team_size: competition.team_size || '',
                link_url: competition.link_url || ''
            });
        } else {
            setCurrentCompetition(null);
            setFormData({
                title: '',
                organizer: '',
                description: '',
                deadline: '',
                event_dates: '',
                location: '',
                prize: '',
                category: 'Hackathon',
                badge: 'None',
                team_size: '',
                link_url: ''
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
                title: formData.title,
                organizer: formData.organizer,
                description: formData.description,
                deadline: formData.deadline,
                event_dates: formData.event_dates,
                location: formData.location,
                prize: formData.prize ? `Rp. ${formData.prize}` : '',
                category: formData.category,
                badge: formData.badge === 'None' ? null : formData.badge,
                team_size: formData.team_size,
                link_url: formData.link_url,
                created_by: user.id
            };

            let error;
            if (currentCompetition) {
                const { error: updateError } = await supabase
                    .from('competitions')
                    .update(payload)
                    .eq('id', currentCompetition.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('competitions')
                    .insert([payload]);
                error = insertError;
            }

            if (error) throw error;

            toast({
                title: currentCompetition ? "Lomba diperbarui" : "Lomba ditambahkan",
                description: "Data lomba berhasil disimpan."
            });

            setIsDialogOpen(false);
            fetchCompetitions();
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
        if (!currentCompetition) return;
        try {
            setIsSubmitting(true);
            const { error } = await supabase
                .from('competitions')
                .delete()
                .eq('id', currentCompetition.id);

            if (error) throw error;

            toast({
                title: "Lomba dihapus",
                description: "Berhasil menghapus data lomba."
            });

            setIsDeleteDialogOpen(false);
            fetchCompetitions();
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

    const handlePrizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        // Allow only numbers
        const numericValue = value.replace(/\D/g, '');
        // Format with dots
        const formattedValue = numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        setFormData({ ...formData, prize: formattedValue });
    };

    const filteredCompetitions = selectedCategory === 'Semua'
        ? competitions
        : competitions.filter(c => c.category === selectedCategory);

    return {
        state: {
            competitions, loading, selectedCategory, isDialogOpen, isDeleteDialogOpen,
            currentCompetition, formData, isSubmitting, canManage, filteredCompetitions
        },
        actions: {
            setSelectedCategory, setIsDialogOpen, setIsDeleteDialogOpen,
            setCurrentCompetition, setFormData, handleOpenDialog, handleSubmit,
            handleDelete, handlePrizeChange, fetchCompetitions
        }
    };
}
