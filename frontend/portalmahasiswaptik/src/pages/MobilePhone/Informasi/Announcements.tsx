import { motion } from 'framer-motion';
import { Megaphone, Pin, Plus, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAnnouncements, categories } from '@/SharedLogic/hooks/useAnnouncements';
import { AnnouncementItem } from '@/components/Features/Informasi/AnnouncementItem';
import { AnnouncementDialog } from '@/components/Features/Informasi/AnnouncementDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.12 } }
};

const staggerTop = {
    hidden: { opacity: 0, y: -15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any } }
};

const staggerBottom = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any } }
};

export default function Announcements() {
    const hook = useAnnouncements();
    const {
        loading,
        selectedCategory,
        expandedId,
        canManage,
        isDeleteDialogOpen,
        currentAnnouncement,
        isSubmitting,
        pinnedAnnouncements,
        regularAnnouncements
    } = hook.state;

    const {
        setSelectedCategory,
        setExpandedId,
        handleOpenDialog,
        setIsDeleteDialogOpen,
        setCurrentAnnouncement,
        handleDelete
    } = hook.actions;

    return (
        <motion.div
            className="space-y-6 pt-12 md:pt-0 pb-20 px-4"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            layout={false}
        >
            {/* Header */}
            <motion.div variants={staggerTop as any} layout={false} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
            <motion.div variants={staggerTop as any} layout={false} className="flex gap-2 overflow-x-auto pb-2 w-full whitespace-nowrap scrollbar-hide">
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
                <motion.div variants={staggerBottom as any} layout={false} className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="p-6 rounded-2xl bg-secondary/20 animate-pulse h-32" />
                    ))}
                </motion.div>
            ) : (
                <>
                    {/* Pinned Announcements */}
                    {pinnedAnnouncements.length > 0 && (
                        <motion.div variants={staggerBottom as any} layout={false} className="space-y-3">
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
                                    onEdit={handleOpenDialog}
                                    onDelete={(a) => {
                                        setCurrentAnnouncement(a);
                                        setIsDeleteDialogOpen(true);
                                    }}
                                />
                            ))}
                        </motion.div>
                    )}

                    {/* Regular Announcements */}
                    <motion.div variants={staggerBottom as any} layout={false} className="space-y-3">
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
                                    onEdit={handleOpenDialog}
                                    onDelete={(a) => {
                                        setCurrentAnnouncement(a);
                                        setIsDeleteDialogOpen(true);
                                    }}
                                />
                            ))
                        ) : (
                            !loading && pinnedAnnouncements.length === 0 && (
                                <div className="text-center py-12 text-muted-foreground bg-secondary/5 rounded-3xl border border-dashed border-border px-4">
                                    <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p>Tidak ada pengumuman untuk kategori ini</p>
                                </div>
                            )
                        )}
                    </motion.div>
                </>
            )}

            <AnnouncementDialog hook={hook} />

            {/* Delete Confirmation */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="w-[95%] sm:max-w-[400px] bg-white dark:bg-slate-950 shadow-2xl border-white/10 rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-destructive flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" /> Hapus Pengumuman?
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-muted-foreground px-4 text-center">
                            Apakah Anda yakin ingin menghapus pengumuman <strong>"{currentAnnouncement?.title}"</strong>?
                            Tindakan ini tidak dapat dibatalkan.
                        </p>
                    </div>
                    <DialogFooter className="gap-2 p-4">
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
