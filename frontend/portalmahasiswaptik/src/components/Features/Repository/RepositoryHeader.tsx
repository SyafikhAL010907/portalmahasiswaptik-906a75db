import { motion } from 'framer-motion';
import { ChevronRight, ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRepository } from '@/SharedLogic/hooks/useRepository';

interface RepositoryHeaderProps {
  repository: ReturnType<typeof useRepository>;
}

export function RepositoryHeader({ repository }: RepositoryHeaderProps) {
  const { view, selectedSemester, selectedCourse, canManage } = repository.state;
  const { handleBack, setIsSemesterDialogOpen, setIsEditingSemester, setSemesterForm, handleResetCourseForm, setIsAddMaterialOpen } = repository.actions;

  return (
    <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start sm:items-center gap-4">
        {view !== 'semesters' && (
          <Button variant="ghost" size="icon" onClick={handleBack} className="rounded-full bg-muted/50 flex-shrink-0 mt-1 sm:mt-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight italic uppercase tracking-tight">Repository Materi</h1>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs md:text-sm text-muted-foreground mt-1 font-medium">
            <span>Repository</span>
            {selectedSemester && (
              <>
                <ChevronRight className="w-4 h-4 flex-shrink-0" />
                <span className="break-words">{selectedSemester.name}</span>
              </>
            )}
            {selectedCourse && (
              <>
                <ChevronRight className="w-4 h-4 flex-shrink-0" />
                <span className="break-words">{selectedCourse.name}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Add Actions (RBAC) */}
      {canManage && (
        <div className="w-full sm:w-auto flex justify-start sm:justify-end">
          {view === 'semesters' && (
            <Button 
              onClick={() => { setSemesterForm({ id: 0, name: '' }); setIsEditingSemester(false); setIsSemesterDialogOpen(true); }} 
              className="w-full sm:w-auto rounded-xl gap-2 shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-11"
            >
              <Plus className="w-4 h-4" /> Tambah Semester
            </Button>
          )}
          {view === 'courses' && (
            <Button 
              onClick={() => { handleResetCourseForm(); repository.actions.setIsCourseDialogOpen(true); }} 
              className="w-full sm:w-auto rounded-xl gap-2 shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-11"
            >
              <Plus className="w-4 h-4" /> Tambah Matkul
            </Button>
          )}
          {view === 'files' && (
            <Button 
              onClick={() => setIsAddMaterialOpen(true)} 
              className="w-full sm:w-auto rounded-xl gap-2 shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-11"
            >
              <Plus className="w-4 h-4" /> Upload Materi
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
}
