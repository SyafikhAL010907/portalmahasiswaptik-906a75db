//
import { useState, useEffect } from 'react';
import { motion, Variants } from 'framer-motion';
import { Megaphone, Calendar, Pin, ChevronRight, Bell, AlertCircle, Info, Plus, Pencil, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from '@/components/ui/skeleton';

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
  category: string;
  is_pinned: boolean;
  priority: 'normal' | 'important';
  is_new: boolean;
}

const categories = ['Semua', 'Akademik', 'Keuangan', 'Event', 'Sistem', 'Lomba'];
const formCategories = ['Akademik', 'Keuangan', 'Event', 'Sistem', 'Lomba'];

// Helper functions extracted from component body
const getTypeIcon = (priority: string, category: string) => {
  if (priority === 'important') return <Bell className="w-5 h-5 text-indigo-500" />;
  if (category === 'Sistem') return <AlertCircle className="w-5 h-5 text-amber-500" />;
  return <Info className="w-5 h-5 text-primary" />;
};

const getTypeBg = (priority: string, category: string) => {
  if (priority === 'important') return 'bg-indigo-50/50 border-indigo-200/50 dark:bg-indigo-900/10 dark:border-indigo-900/30';
  if (category === 'Sistem') return 'bg-amber-50/50 border-amber-200/50 dark:bg-amber-900/10 dark:border-amber-900/30';
  return 'bg-indigo-50/50 border-indigo-200/50 dark:bg-indigo-900/10 dark:border-indigo-900/30';
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 }
  }
};

const staggerTop: Variants = {
  hidden: { opacity: 0, y: -15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any } }
};

const staggerBottom: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any } }
};

// Extracted Component
const AnnouncementItem = ({
  item,
  expandedId,
  setExpandedId,
  canManage,
  handleOpenDialog,
  setCurrentAnnouncement,
  setIsDeleteDialogOpen
}: {
  item: Announcement,
  expandedId: string | null,
  setExpandedId: (id: string | null) => void,
  canManage: boolean,
  handleOpenDialog: (item: Announcement) => void,
  setCurrentAnnouncement: (item: Announcement) => void,
  setIsDeleteDialogOpen: (val: boolean) => void
}) => (
  <motion.div
    variants={staggerBottom}
    layout={false}
    className={cn(
      "glass-card rounded-2xl p-5 border-2 transition-all duration-300 cursor-pointer hover-glow-blue relative group",
      getTypeBg(item.priority, item.category),
      item.is_pinned && "border-primary/40 shadow-soft"
    )}
    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
  >
    <div className="flex items-start gap-4">
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110",
        item.priority === 'important' ? 'bg-indigo-500/10' : 'bg-card shadow-inner'
      )}>
        {getTypeIcon(item.priority, item.category)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-foreground whitespace-normal break-words">{item.title}</h3>
          {item.is_new && (
            <span className="px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-full flex-shrink-0">
              New
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1 flex-shrink-0">
            <Calendar className="w-3 h-3" />
            {formatDate(item.created_at)}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-muted text-xs flex-shrink-0">
            {item.category}
          </span>
        </div>
        {expandedId === item.id && (
          <div className="mt-3 text-foreground/80 animate-fade-in space-y-4">
            <p className="whitespace-pre-wrap break-words">{item.content}</p>

            {/* Admin Actions */}
            {canManage && (
              <div className="flex gap-2 pt-2 border-t border-border/50">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenDialog(item);
                  }}
                >
                  <Pencil className="w-3 h-3" /> Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-8 gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentAnnouncement(item);
                    setIsDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="w-3 h-3" /> Hapus
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
      <ChevronRight className={cn(
        "w-5 h-5 text-muted-foreground transition-transform flex-shrink-0",
        expandedId === item.id && "rotate-90"
      )} />
    </div>
  </motion.div>
);

export default function Announcements() {
  const { user, isAdmin, isAdminDev, isAdminKelas, isAdminDosen } = useAuth();
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


  // Helper functions extracted from component body
  const getTypeIcon = (priority: string, category: string) => {
    if (priority === 'important') return <Bell className="w-5 h-5 text-indigo-500" />;
    if (category === 'Sistem') return <AlertCircle className="w-5 h-5 text-amber-500" />;
    return <Info className="w-5 h-5 text-primary" />;
  };

  const getTypeBg = (priority: string, category: string) => {
    if (priority === 'important') return 'bg-indigo-50/50 border-indigo-200/50 dark:bg-indigo-900/10 dark:border-indigo-900/30';
    if (category === 'Sistem') return 'bg-amber-50/50 border-amber-200/50 dark:bg-amber-900/10 dark:border-amber-900/30';
    return 'bg-indigo-50/50 border-indigo-200/50 dark:bg-indigo-900/10 dark:border-indigo-900/30';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Extracted Component
  const AnnouncementItem = ({
    item,
    expandedId,
    setExpandedId,
    canManage,
    handleOpenDialog,
    setCurrentAnnouncement,
    setIsDeleteDialogOpen
  }: {
    item: Announcement,
    expandedId: string | null,
    setExpandedId: (id: string | null) => void,
    canManage: boolean,
    handleOpenDialog: (item: Announcement) => void,
    setCurrentAnnouncement: (item: Announcement) => void,
    setIsDeleteDialogOpen: (val: boolean) => void
  }) => (
    <motion.div
      variants={staggerBottom}
      layout={false}
      className={cn(
        "glass-card rounded-2xl p-5 border-2 transition-all duration-300 cursor-pointer hover-glow-blue relative group",
        getTypeBg(item.priority, item.category),
        item.is_pinned && "border-primary/40 shadow-soft"
      )}
      onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
    >
      <div className="flex items-start gap-4">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110",
          item.priority === 'important' ? 'bg-indigo-500/10' : 'bg-card shadow-inner'
        )}>
          {getTypeIcon(item.priority, item.category)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-foreground whitespace-normal break-words">{item.title}</h3>
            {item.is_new && (
              <span className="px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-full flex-shrink-0">
                New
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1 flex-shrink-0">
              <Calendar className="w-3 h-3" />
              {formatDate(item.created_at)}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-muted text-xs flex-shrink-0">
              {item.category}
            </span>
          </div>
          {expandedId === item.id && (
            <div className="mt-3 text-foreground/80 animate-fade-in space-y-4">
              <p className="whitespace-pre-wrap break-words">{item.content}</p>

              {/* Admin Actions */}
              {canManage && (
                <div className="flex gap-2 pt-2 border-t border-border/50">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDialog(item);
                    }}
                  >
                    <Pencil className="w-3 h-3" /> Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-8 gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentAnnouncement(item);
                      setIsDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="w-3 h-3" /> Hapus
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
        <ChevronRight className={cn(
          "w-5 h-5 text-muted-foreground transition-transform flex-shrink-0",
          expandedId === item.id && "rotate-90"
        )} />
      </div>
    </motion.div>
  );
  return (
    <motion.div
      className="space-y-6 pt-12 md:pt-0 pb-20"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      layout={false}
    >
      {/* Header */}
      <motion.div variants={staggerTop} layout={false} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Pengumuman</h1>
          <p className="text-muted-foreground mt-1">Informasi terbaru untuk angkatan PTIK 2025</p>
        </div>
        {canManage && (
          <Button onClick={() => handleOpenDialog()} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-2 px-6 rounded-full shadow-md hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-300 hover:-translate-y-0.5">
            <Plus className="w-4 h-4 mr-2" />
            Buat Pengumuman
          </Button>
        )}
      </motion.div>

      {/* Category Filter */}
      <motion.div variants={staggerTop} layout={false} className="flex gap-2 overflow-x-auto pb-2 w-full whitespace-nowrap scrollbar-hide">
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={selectedCategory === cat ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedCategory(cat)}
            className={selectedCategory === cat ? 'primary-gradient transition-all flex-shrink-0' : 'text-muted-foreground flex-shrink-0'}
          >
            {cat}
          </Button>
        ))}
      </motion.div>

      {/* Loading State */}
      {loading ? (
        <motion.div variants={staggerBottom} layout={false} className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-6 rounded-2xl bg-secondary/20 animate-pulse h-32" />
          ))}
        </motion.div>
      ) : (
        <>
          {/* Pinned Announcements */}
          {pinnedAnnouncements.length > 0 && (
            <motion.div variants={staggerBottom} layout={false} className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                <Pin className="w-4 h-4 text-primary" />
                <span>Disematkan</span>
              </div>
              {pinnedAnnouncements.map((announcement) => (
                <AnnouncementItem
                  key={announcement.id}
                  item={announcement}
                  expandedId={expandedId}
                  setExpandedId={setExpandedId}
                  canManage={canManage}
                  handleOpenDialog={handleOpenDialog}
                  setCurrentAnnouncement={setCurrentAnnouncement}
                  setIsDeleteDialogOpen={setIsDeleteDialogOpen}
                />
              ))}
            </motion.div>
          )}

          {/* Regular Announcements */}
          <motion.div variants={staggerBottom} layout={false} className="space-y-3">
            {pinnedAnnouncements.length > 0 && regularAnnouncements.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium mt-6">
                <Megaphone className="w-4 h-4" />
                <span>Pengumuman Lainnya</span>
              </div>
            )}
            {regularAnnouncements.length > 0 ? (
              regularAnnouncements.map((announcement) => (
                <AnnouncementItem
                  key={announcement.id}
                  item={announcement}
                  expandedId={expandedId}
                  setExpandedId={setExpandedId}
                  canManage={canManage}
                  handleOpenDialog={handleOpenDialog}
                  setCurrentAnnouncement={setCurrentAnnouncement}
                  setIsDeleteDialogOpen={setIsDeleteDialogOpen}
                />
              ))
            ) : (
              !loading && pinnedAnnouncements.length === 0 && (
                <div className="text-center py-12 text-muted-foreground bg-secondary/5 rounded-3xl border border-dashed border-border">
                  <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>Tidak ada pengumuman untuk kategori ini</p>
                </div>
              )
            )}
          </motion.div>
        </>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] bg-white dark:bg-slate-950 shadow-2xl border-white/10">
          <DialogHeader>
            <DialogTitle>{currentAnnouncement ? 'Edit Pengumuman' : 'Buat Pengumuman Baru'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-slate-900 dark:text-slate-200 font-medium">Judul Pengumuman</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Contoh: Jadwal UAS..."
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all shadow-sm"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-900 dark:text-slate-200 font-medium">Kategori</Label>
                <Select
                  value={formData.category}
                  onValueChange={(val) => setFormData({ ...formData, category: val })}
                >
                  <SelectTrigger className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {formCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-900 dark:text-slate-200 font-medium">Prioritas</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(val: any) => setFormData({ ...formData, priority: val })}
                >
                  <SelectTrigger className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal (Info)</SelectItem>
                    <SelectItem value="important">Penting (Merah)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-900 dark:text-slate-200 font-medium">Isi Pengumuman</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Tulis detail pengumuman di sini..."
                className="min-h-[150px] w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all shadow-sm"
                required
              />
            </div>

            <div className="flex gap-6 pt-2">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_pinned}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_pinned: checked })}
                  id="pin-mode"
                />
                <Label htmlFor="pin-mode" className="cursor-pointer text-slate-900 dark:text-slate-200 font-medium">Sematkan (Pin)</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_new}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_new: checked })}
                  id="new-mode"
                />
                <Label htmlFor="new-mode" className="cursor-pointer text-slate-900 dark:text-slate-200 font-medium">Tandai "New"</Label>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Batal</Button>
              <Button type="submit" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-2 px-6 rounded-full shadow-md hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-300 hover:-translate-y-0.5" disabled={isSubmitting}>
                {isSubmitting ? 'Menyimpan...' : 'Simpan Pengumuman'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px] bg-white dark:bg-slate-950 shadow-2xl border-white/10">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="w-5 h-5" /> Hapus Pengumuman?
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              Apakah Anda yakin ingin menghapus pengumuman <strong>"{currentAnnouncement?.title}"</strong>?
              Tindakan ini tidak dapat dibatalkan.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDeleteDialogOpen(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? 'Menghapus...' : 'Hapus Permanen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </motion.div>
  );
}