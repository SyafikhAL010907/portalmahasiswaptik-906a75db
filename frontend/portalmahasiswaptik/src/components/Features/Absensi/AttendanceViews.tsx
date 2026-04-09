import { motion } from 'framer-motion';
import { Folder, FileText, Calendar, Users, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { useAttendance } from '@/SharedLogic/hooks/useAttendance';

// SOFT PASTEL MODE: Finance Dashboard Style
const SEMESTER_GRADIENTS = [
  { gradient: 'from-purple-50 to-white dark:from-purple-950/20 dark:to-background', iconBg: 'bg-purple-100 dark:bg-purple-900/30', iconColor: 'text-purple-600 dark:text-purple-400', shadowColor: 'hover:shadow-purple-200/50 dark:hover:shadow-purple-900/50' },
  { gradient: 'from-blue-50 to-white dark:from-blue-950/20 dark:to-background', iconBg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400', shadowColor: 'hover:shadow-blue-200/50 dark:hover:shadow-blue-900/50' },
  { gradient: 'from-orange-50 to-white dark:from-orange-950/20 dark:to-background', iconBg: 'bg-orange-100 dark:bg-orange-900/30', iconColor: 'text-orange-600 dark:text-orange-400', shadowColor: 'hover:shadow-orange-200/50 dark:hover:shadow-orange-900/50' },
  { gradient: 'from-cyan-50 to-white dark:from-cyan-950/20 dark:to-background', iconBg: 'bg-cyan-100 dark:bg-cyan-900/30', iconColor: 'text-cyan-600 dark:text-cyan-400', shadowColor: 'hover:shadow-cyan-200/50 dark:hover:shadow-cyan-900/50' },
  { gradient: 'from-indigo-50 to-white dark:from-indigo-950/20 dark:to-background', iconBg: 'bg-indigo-100 dark:bg-indigo-900/30', iconColor: 'text-indigo-600 dark:text-indigo-400', shadowColor: 'hover:shadow-indigo-200/50 dark:hover:shadow-indigo-900/50' },
  { gradient: 'from-yellow-50 to-white dark:from-yellow-950/20 dark:to-background', iconBg: 'bg-yellow-100 dark:bg-yellow-900/30', iconColor: 'text-yellow-600 dark:text-yellow-400', shadowColor: 'hover:shadow-yellow-200/50 dark:hover:shadow-yellow-900/50' },
  { gradient: 'from-pink-50 to-white dark:from-pink-950/20 dark:to-background', iconBg: 'bg-pink-100 dark:bg-pink-900/30', iconColor: 'text-pink-600 dark:text-pink-400', shadowColor: 'hover:shadow-pink-200/50 dark:hover:shadow-pink-900/50' },
];

const COURSE_PASTELS = [
  { gradient: 'from-violet-50 to-white dark:from-violet-950/20 dark:to-background', iconBg: 'bg-violet-100 dark:bg-violet-900/30', iconColor: 'text-violet-600 dark:text-violet-400', shadowColor: 'hover:shadow-violet-200/50 dark:hover:shadow-violet-900/50' },
  { gradient: 'from-sky-50 to-white dark:from-sky-950/20 dark:to-background', iconBg: 'bg-sky-100 dark:bg-sky-900/30', iconColor: 'text-sky-600 dark:text-sky-400', shadowColor: 'hover:shadow-sky-200/50 dark:hover:shadow-sky-900/50' },
  { gradient: 'from-rose-50 to-white dark:from-rose-950/20 dark:to-background', iconBg: 'bg-rose-100 dark:bg-rose-900/30', iconColor: 'text-rose-600 dark:text-rose-400', shadowColor: 'hover:shadow-rose-200/50 dark:hover:shadow-rose-900/50' },
  { gradient: 'from-amber-50 to-white dark:from-amber-950/20 dark:to-background', iconBg: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600 dark:text-amber-400', shadowColor: 'hover:shadow-amber-200/50 dark:hover:shadow-amber-900/50' },
  { gradient: 'from-cyan-50 to-white dark:from-cyan-950/20 dark:to-background', iconBg: 'bg-cyan-100 dark:bg-cyan-900/30', iconColor: 'text-cyan-600 dark:text-cyan-400', shadowColor: 'hover:shadow-cyan-200/50 dark:hover:shadow-cyan-900/50' },
  { gradient: 'from-blue-50 to-white dark:from-blue-950/20 dark:to-background', iconBg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400', shadowColor: 'hover:shadow-blue-200/50 dark:hover:shadow-blue-900/50' },
];

interface AttendanceViewsProps {
  at: ReturnType<typeof useAttendance>;
}

export function AttendanceViews({ at }: AttendanceViewsProps) {
  const { view, semesters, courses, meetings, classes, isLoading, canEdit, userRole } = at.state;
  const { handleSemesterClick, handleCourseClick, handleMeetingClick, handleClassClick, openEditDialog, handleDelete } = at.actions;

  if (isLoading && view !== 'students') {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-primary w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
      {/* VIEW SEMESTERS */}
      {view === 'semesters' && semesters.map((sem, idx) => (
        <PremiumCard
          key={sem.id}
          variant="pastel"
          icon={Folder}
          title={sem.name}
          subtitle="Klik untuk lihat matkul"
          gradient={SEMESTER_GRADIENTS[idx % SEMESTER_GRADIENTS.length].gradient}
          iconClassName={`${SEMESTER_GRADIENTS[idx % SEMESTER_GRADIENTS.length].iconBg} ${SEMESTER_GRADIENTS[idx % SEMESTER_GRADIENTS.length].iconColor}`}
          className={SEMESTER_GRADIENTS[idx % SEMESTER_GRADIENTS.length].shadowColor}
          onClick={() => handleSemesterClick(sem.id, sem.name)}
        />
      ))}

      {/* VIEW COURSES */}
      {view === 'courses' && courses.map((course, idx) => {
        const pastel = COURSE_PASTELS[idx % COURSE_PASTELS.length];
        return (
          <div key={course.id} className="relative">
            <PremiumCard
              variant="pastel"
              icon={FileText}
              title={course.name}
              subtitle={course.code}
              gradient={pastel.gradient}
              iconClassName={`${pastel.iconBg} ${pastel.iconColor}`}
              className={pastel.shadowColor}
              onClick={() => handleCourseClick(course.id, course.name)}
            />
          </div>
        );
      })}

      {/* VIEW MEETINGS */}
      {view === 'meetings' && meetings.map((meeting) => (
        <div key={meeting.id} className="relative group">
          <PremiumCard
            variant="pastel"
            icon={Calendar}
            title={meeting.topic}
            subtitle={`Pertemuan Ke-${meeting.meeting_number}`}
            gradient="from-emerald-50 to-white dark:from-emerald-950/20 dark:to-background"
            iconClassName="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
            className="hover:shadow-emerald-200/50 dark:hover:shadow-emerald-900/50"
            onClick={() => handleMeetingClick(meeting.id, meeting.topic)}
          />
          {canEdit && (
            <div className="absolute top-4 right-4 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button size="icon" variant="ghost" className="h-8 w-8 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700" onClick={(e) => openEditDialog(meeting.id, meeting.topic, e)}>
                <Pencil className="w-4 h-4 text-blue-500" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700" onClick={(e) => handleDelete(meeting.id, e)}>
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          )}
        </div>
      ))}

      {/* VIEW CLASSES */}
      {view === 'classes' && classes
        .filter(cls => {
          if (userRole === 'mahasiswa' && at.state.userClassId) {
            return cls.id === at.state.userClassId;
          }
          return true;
        })
        .map((cls) => (
        <div key={cls.id} className="relative group">
          <PremiumCard
            variant="pastel"
            icon={Users}
            title={cls.name}
            subtitle="Klik untuk absen"
            gradient="from-teal-50 to-white dark:from-teal-950/20 dark:to-background"
            iconClassName="bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400"
            className="hover:shadow-teal-200/50 dark:hover:shadow-teal-900/50"
            onClick={() => handleClassClick(cls.id, cls.name)}
          />
          {userRole === 'admin_dev' && (
            <div className="absolute top-4 right-4 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button size="icon" variant="ghost" className="h-8 w-8 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700" onClick={(e) => openEditDialog(cls.id, cls.name, e)}>
                <Pencil className="w-4 h-4 text-blue-500" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700" onClick={(e) => handleDelete(cls.id, e)}>
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
