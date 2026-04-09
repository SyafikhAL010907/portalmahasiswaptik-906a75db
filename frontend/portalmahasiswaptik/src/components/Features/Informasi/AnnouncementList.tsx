import { motion } from 'framer-motion';
import { Pin, Megaphone } from 'lucide-react';
import { useAnnouncements } from '@/SharedLogic/hooks/useAnnouncements';
import { AnnouncementItem } from './AnnouncementItem';

const staggerBottom = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any } }
};

interface AnnouncementListProps {
    hook: ReturnType<typeof useAnnouncements>;
}

export function AnnouncementList({ hook }: AnnouncementListProps) {
    const {
        loading, pinnedAnnouncements, regularAnnouncements, expandedId, canManage
    } = hook.state;
    const {
        setExpandedId, handleOpenDialog, setCurrentAnnouncement, setIsDeleteDialogOpen
    } = hook.actions;

    if (loading) {
        return (
            <motion.div variants={staggerBottom as any} layout={false} className="space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="p-6 rounded-2xl bg-secondary/20 animate-pulse h-32" />
                ))}
            </motion.div>
        );
    }

    return (
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
    );
}
