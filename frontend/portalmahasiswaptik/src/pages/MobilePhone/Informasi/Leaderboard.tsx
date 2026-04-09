import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLeaderboard } from '@/SharedLogic/hooks/useLeaderboard';
import { LeaderboardPodium } from '@/components/Features/Informasi/LeaderboardPodium';
import { AchievementList } from '@/components/Features/Informasi/AchievementList';
import { AchievementDialog } from '@/components/Features/Informasi/AchievementDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from '@/components/ui/skeleton';

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

export default function Leaderboard() {
    const hook = useLeaderboard();
    const {
        loading,
        canManage,
        classesList,
        selectedClassFilter,
        filteredAchievements,
        isDeleteDialogOpen,
        currentAchievement,
        isSubmitting
    } = hook.state;

    const {
        handleOpenDialog,
        setIsDeleteDialogOpen,
        setCurrentAchievement,
        handleDelete,
        handleFilterChange,
        getClassStats,
        hasPermission
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
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">Leaderboard Angkatan</h1>
                    <p className="text-muted-foreground mt-1">Klasemen prestasi antar kelas PTIK 2025</p>
                </div>
                {canManage && (
                    <Button onClick={() => handleOpenDialog()} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-2 px-6 rounded-full shadow-md hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-300 hover:-translate-y-0.5">
                        <Plus className="w-4 h-4 mr-2" /> Tambah Prestasi
                    </Button>
                )}
            </motion.div>

            {loading ? (
                <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-4 h-32">
                        {[1, 2, 3].map(i => <Skeleton key={i} className="h-full rounded-2xl" />)}
                    </div>
                    <Skeleton className="h-64 rounded-2xl" />
                </div>
            ) : (
                <>
                    {/* Top Stats Cards & Podium */}
                    <LeaderboardPodium stats={getClassStats()} />

                    {/* Detailed List */}
                    <motion.div variants={staggerBottom as any} layout={false}>
                        <AchievementList
                            achievements={filteredAchievements}
                            canManage={canManage}
                            hasPermission={hasPermission}
                            onEdit={handleOpenDialog}
                            onDelete={(ach) => {
                                setCurrentAchievement(ach);
                                setIsDeleteDialogOpen(true);
                            }}
                            selectedClassFilter={selectedClassFilter}
                            onFilterChange={handleFilterChange}
                            classesList={classesList}
                        />
                    </motion.div>
                </>
            )}

            <AchievementDialog hook={hook} />

            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="sm:max-w-[400px] bg-white dark:bg-slate-950 shadow-2xl border-white/10 rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-destructive">Hapus Data?</DialogTitle>
                    </DialogHeader>
                    <p className="text-muted-foreground py-4 px-4 text-center">
                        Hapus data prestasi <strong>{currentAchievement?.competition_name}</strong>?
                    </p>
                    <DialogFooter className="gap-2 p-4">
                        <Button
                            variant="outline"
                            onClick={() => setIsDeleteDialogOpen(false)}
                            className="rounded-xl border-2 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all duration-300"
                        >
                            Batal
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isSubmitting}
                            className="rounded-xl bg-rose-600 hover:bg-rose-700 shadow-md hover:shadow-rose-500/20 transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
                        >
                            Hapus
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}
