import { motion } from 'framer-motion';
import { UserCheck, ArrowLeft, Plus, Trash2, FileSpreadsheet, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAttendance } from '@/SharedLogic/hooks/useAttendance';

interface AttendanceHeaderProps {
  at: ReturnType<typeof useAttendance>;
}

export function AttendanceHeader({ at }: AttendanceHeaderProps) {
  const { view, activeId, canEdit, userRole, isLoading } = at.state;
  const { handleBack, openAddDialog, handleGlobalWipe, setIsMasterExportOpen, handleResetGlobalSubject } = at.actions;

  return (
    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        {view !== 'semesters' && (
          <Button variant="ghost" size="icon" onClick={handleBack} className="rounded-full bg-muted/50 shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2 truncate">
            <UserCheck className="w-5 h-5 md:w-6 md:h-6 text-primary shrink-0" /> Sistem Absensi
          </h1>
          <p className="text-[9px] md:text-[10px] text-muted-foreground mt-0.5 uppercase tracking-normal md:tracking-widest font-bold leading-relaxed">
            Level: <span className="text-primary">{view}</span>
            {activeId.semesterName && <span className="text-muted-foreground"> • {activeId.semesterName}</span>}
            {activeId.courseName && <span className="text-muted-foreground"> • {activeId.courseName}</span>}
            {activeId.meetingName && <span className="text-muted-foreground"> • {activeId.meetingName}</span>}
            {activeId.className && <span className="text-muted-foreground"> • {activeId.className}</span>}
          </p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
        {view !== 'students' && view !== 'semesters' && view !== 'courses' && (
          view === 'classes' ? userRole === 'admin_dev' : canEdit
        ) && (
            <Button onClick={openAddDialog} className="rounded-xl gap-2 shadow-lg hover:scale-105 transition-transform flex-1 md:flex-initial h-9 px-4">
              <Plus className="w-4 h-4" /> Tambah {view === 'classes' ? 'Kelas' : view.slice(0, -1)}
            </Button>
          )}
        {view === 'semesters' && userRole === 'admin_dev' && (
          <Button variant="destructive" onClick={handleGlobalWipe} className="rounded-xl gap-2 shadow-lg hover:scale-105 transition-transform flex-1 md:flex-initial h-9 px-4">
            <Trash2 className="w-4 h-4" /> Reset Masal (Global Wipe)
          </Button>
        )}
        {view === 'meetings' && canEdit && (
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
             <Button
                onClick={() => setIsMasterExportOpen(true)}
                className="rounded-xl gap-2 shadow-lg hover:scale-110 transition-transform h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold w-full sm:w-auto text-xs sm:text-sm"
              >
                <FileSpreadsheet className="w-4 h-4" /> Export Master Semester
              </Button>
            {userRole === 'admin_dev' && (
              <Button
                variant="destructive"
                onClick={handleResetGlobalSubject}
                className="rounded-xl gap-2 shadow-lg hover:scale-110 transition-transform h-9 px-4 font-bold w-full sm:w-auto text-xs sm:text-sm"
              >
                <RotateCcw className="w-4 h-4" /> Reset Matkul
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
