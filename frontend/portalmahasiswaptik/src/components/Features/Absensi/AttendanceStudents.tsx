import { motion } from 'framer-motion';
import { Users, RotateCcw, Eye, Download, Save, Loader2, CheckCircle, Clock, XCircle, QrCode, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAttendance } from '@/SharedLogic/hooks/useAttendance';

interface AttendanceStudentsProps {
  at: ReturnType<typeof useAttendance>;
}

export function AttendanceStudents({ at }: AttendanceStudentsProps) {
  const { students, isLoading, canEdit, userRole, pendingChanges, currentSessionId, userClassId, activeId } = at.state;
  const { handleResetSession, handlePreviewMeetingExcel, handleExportExcel, saveAttendance, toggleAttendance, handleResetIndividual } = at.actions;

  const isLockedForAdminKelas = userRole === 'admin_kelas' && userClassId !== activeId.class;

  const staggerBottom = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any } }
  };

  return (
    <motion.div variants={staggerBottom} layout={false} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center bg-card p-4 rounded-xl border shadow-sm flex-wrap gap-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" /> 
          {userRole === 'mahasiswa' ? 'Detail Kehadiran Saya' : 'Daftar Mahasiswa'}
          {userRole !== 'mahasiswa' && (
            <span className="text-sm font-normal text-muted-foreground ml-2">({students.length} Total)</span>
          )}
        </h2>
        <div className="flex flex-col gap-3 w-full lg:w-auto lg:flex-row lg:items-center">
          {userRole === 'admin_dev' && (
            <Button variant="destructive" onClick={handleResetSession} className="w-full lg:w-auto min-w-[140px] gap-2 h-10 px-4 rounded-full shadow-lg transition-all hover:scale-[1.03] active:scale-[0.97] text-sm font-bold order-1">
              <RotateCcw className="w-4 h-4" /> Reset Status
            </Button>
          )}
          {canEdit && (
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto order-2">
              <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
                <Button
                  onClick={handlePreviewMeetingExcel}
                  className="gap-2 h-10 px-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg transition-all hover:scale-110 font-bold text-xs sm:text-sm"
                >
                  <Eye className="w-4 h-4" /> Buka File
                </Button>
                <Button
                  onClick={handleExportExcel}
                  className="gap-2 h-10 px-4 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg transition-all hover:scale-110 font-bold text-xs sm:text-sm"
                >
                  <Download className="w-4 h-4" /> Export
                </Button>
              </div>
              <Button
                onClick={saveAttendance}
                disabled={Object.keys(pendingChanges).length === 0 || isLoading}
                className={cn(
                  "w-full sm:w-auto min-w-[180px] gap-2 h-10 px-5 transition-all duration-300 rounded-full font-bold order-3",
                  Object.keys(pendingChanges).length > 0
                    ? "bg-gradient-to-r from-indigo-600 via-violet-600 to-emerald-600 hover:from-indigo-700 hover:to-emerald-700 text-white shadow-lg shadow-indigo-500/25 dark:shadow-emerald-500/20 hover:scale-[1.03] active:scale-[0.97]"
                    : "bg-muted/50 text-muted-foreground cursor-not-allowed border border-dashed border-muted-foreground/20"
                )}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Save className={cn("w-4 h-4", Object.keys(pendingChanges).length > 0 ? "text-white" : "text-muted-foreground")} />
                )}
                <span className="tracking-tight text-xs sm:text-sm">
                  {isLoading ? 'Menyimpan...' : `Simpan Permanen ${Object.keys(pendingChanges).length > 0 ? `(${Object.keys(pendingChanges).length})` : ''}`}
                </span>
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="w-full overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
        <div className="min-w-[950px] px-1">
          <div className="grid grid-cols-[240px,160px,140px,180px,100px,60px] items-center px-5 py-3 bg-muted/20 rounded-xl border border-dashed border-border/60 mb-3 gap-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Nama & Identitas</div>
            <div className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Location</div>
            <div className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Metode Belajar</div>
            <div className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Status Kehadiran</div>
            <div className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Waktu Scan</div>
            <div className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">{userRole === 'admin_dev' ? 'Aksi' : ''}</div>
          </div>

          <div className="space-y-3">
            {students.map((student) => {
              const status = student.status;
              const isAlpha = status === 'absent';
              const isHadir = status === 'present';
              const isPending = status === 'pending';
              const isIzin = status === 'excused';

              return (
                <div
                  key={student.id}
                  className={cn(
                    "grid grid-cols-[240px,160px,140px,180px,100px,60px] items-center p-5 rounded-2xl transition-all duration-300 ease-in-out gap-4 mb-3",
                    "bg-white/60 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 shadow-sm",
                    "hover:-translate-y-1 hover:scale-[1.01] group",
                    isAlpha ? "hover:shadow-[0_8px_30px_rgba(244,63,94,0.15)] hover:border-rose-300/50" :
                      (isHadir || isPending) ? "hover:shadow-[0_8px_30px_rgba(59,130,246,0.15)] hover:border-blue-300/50" :
                        isIzin ? "hover:shadow-[0_8px_30px_rgba(245,158,11,0.15)] hover:border-amber-300/50" :
                          "hover:shadow-lg"
                  )}
                >
                  <div className="flex items-center gap-4 w-full min-w-0">
                    <div className={cn(
                      "w-12 h-12 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ring-2 ring-offset-2 ring-offset-background/50 shadow-inner overflow-hidden",
                      !student.avatarUrl && getStatusColor(student.status)
                    )}>
                      {student.avatarUrl ? (
                        <img 
                          src={student.avatarUrl} 
                          alt={student.name} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).parentElement!.classList.add(...getStatusColor(student.status).split(' '));
                            (e.target as HTMLImageElement).parentElement!.innerText = student.name.substring(0, 2).toUpperCase();
                          }}
                        />
                      ) : (
                        student.name.substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate w-full">{student.name}</div>
                      <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">{student.nim}</div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center min-w-0 text-center">
                    <div className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
                      {(() => {
                        const s = student as any;
                        const dist = s.distance_meters ?? s.distanceMeters ?? s.distance;
                        const lat = s.latitude;
                        const lng = s.longitude;
                        if (!s.scanned_at && !s.scannedAt && s.status !== 'present') return "--";
                        
                        return (
                          <div className="flex flex-col items-center leading-tight">
                            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                                {dist?.toFixed(1) || '0.0'} Meter
                            </span>
                            {lat && (
                              <div className="text-[7px] font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/5 px-1 rounded-sm mt-0.5 border border-emerald-500/10">
                                 {Number(lat).toFixed(5)} , {Number(lng).toFixed(5)}
                              </div>
                            )}
                            <span className={`text-[7px] font-black uppercase tracking-tighter mt-1 px-1.5 py-0.5 rounded-[4px] ${s.is_misslock ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'}`}>
                              {s.is_misslock ? 'MISSLOCATION' : 'VERIFIED GPS'}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="flex flex-col items-center">
                    <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 border">
                      Luring
                    </span>
                  </div>

                  <div className="flex flex-col items-center w-full">
                    <button
                      onClick={() => toggleAttendance(student.id, student.status)}
                      disabled={!canEdit || student.method === 'qr' || isLockedForAdminKelas}
                      className={cn(
                        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest justify-center w-full max-w-[120px]",
                        getStatusBadge(student.status)
                      )}
                    >
                      {getStatusIcon(student.status)}
                      {student.status === 'present' ? 'Hadir' : 
                       student.status === 'excused' ? 'Izin' : 
                       student.status === 'absent' ? 'Alpha' : 'Pending'}
                    </button>
                    {student.method === 'qr' && (
                      <span className={cn(
                        "text-[8px] font-black uppercase mt-1 px-1.5 py-0.5 rounded-[4px] border",
                        (student as any).is_misslock 
                          ? "bg-rose-500/10 text-rose-500 border-rose-500/20" 
                          : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                      )}>
                        {(student as any).is_misslock ? 'Unverified QR' : 'Verified QR'}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col items-center">
                    <span className="text-xs font-mono font-bold">
                      {student.scannedAt ? new Date(student.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </span>
                  </div>

                  <div className="flex flex-col items-center">
                    {userRole === 'admin_dev' && (
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-500" onClick={() => handleResetIndividual(student.id, student.name)}>
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {students.length === 0 && (
            <div className="p-12 text-center text-muted-foreground bg-secondary/10 rounded-2xl border border-dashed">
              Tidak ada data mahasiswa ditemukan.
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function getStatusIcon(status: string) {
  if (status === 'present' || status === 'hadir') return <CheckCircle className="w-5 h-5 text-green-500" />;
  if (status === 'excused' || status === 'izin') return <Clock className="w-5 h-5 text-yellow-500" />;
  if (status === 'absent' || status === 'alpha') return <XCircle className="w-5 h-5 text-destructive" />;
  if (status === 'pending') return <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />;
  return <Clock className="w-4 h-4 text-muted-foreground" />;
}

function getStatusColor(status: string) {
  switch (status) {
    case 'present':
    case 'hadir': return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
    case 'excused':
    case 'izin': return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800';
    case 'absent':
    case 'alpha': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
    default: return 'bg-muted/50 text-muted-foreground border-transparent';
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'present':
    case 'hadir': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    case 'excused':
    case 'izin': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'absent':
    case 'alpha': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    default: return 'bg-muted text-muted-foreground';
  }
}
