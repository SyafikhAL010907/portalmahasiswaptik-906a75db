import { motion } from 'framer-motion';
import { Calendar, ChevronRight, Bell, AlertCircle, Info, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Announcement } from '@/SharedLogic/hooks/useAnnouncements';

interface AnnouncementItemProps {
    item: Announcement;
    expandedId: string | null;
    setExpandedId: (id: string | null) => void;
    canManage: boolean;
    onEdit: (item: Announcement) => void;
    onDelete: (item: Announcement) => void;
}

const staggerBottom = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any } }
};

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

export function AnnouncementItem({
    item,
    expandedId,
    setExpandedId,
    canManage,
    onEdit,
    onDelete
}: AnnouncementItemProps) {
    return (
        <motion.div
            variants={staggerBottom as any}
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
                                            onEdit(item);
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
                                            onDelete(item);
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
}
