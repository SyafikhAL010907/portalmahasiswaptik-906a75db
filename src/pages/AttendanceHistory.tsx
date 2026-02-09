import { useState, useEffect } from 'react';
import { 
  Folder, FolderOpen, Users, ChevronRight, ArrowLeft, 
  CheckCircle, XCircle, Clock, Plus, Pencil, Trash2, 
  Loader2, AlertCircle, BookOpen, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAttendanceData, Subject, Meeting } from '@/hooks/useAttendanceData';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';

type ViewState = 'semesters' | 'courses' | 'meetings' | 'classes' | 'students';

export default function AttendanceHistory() {
  const { isAdminDev, isAdminDosen } = useAuth();
  const {
    loading,
    semesters,
    subjects,
    meetings,
    classes,
    records,
    fetchMeetings,
    fetchRecords,
    fetchSessions,
    createSubject,
    updateSubject,
    deleteSubject,
    createMeeting,
    updateMeeting,
    deleteMeeting,
    updateRecordStatus,
    getSubjectsBySemester
  } = useAttendanceData();

  const [view, setView] = useState<ViewState>('semesters');
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [selectedClass, setSelectedClass] = useState<{ id: string; name: string } | null>(null);
  const [subjectMeetings, setSubjectMeetings] = useState<Meeting[]>([]);

  // CRUD Dialogs
  const [showSubjectDialog, setShowSubjectDialog] = useState(false);
  const [showMeetingDialog, setShowMeetingDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [deletingItem, setDeletingItem] = useState<{ type: 'subject' | 'meeting'; id: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // Form data
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '', semester: 1 });
  const [meetingForm, setMeetingForm] = useState({ meeting_number: 1, topic: '' });

  const canEdit = isAdminDev() || isAdminDosen();

  useEffect(() => {
    if (selectedSubject) {
      fetchMeetings(selectedSubject.id).then(() => {
        setSubjectMeetings(meetings.filter(m => m.subject_id === selectedSubject.id));
      });
    }
  }, [selectedSubject, meetings, fetchMeetings]);

  useEffect(() => {
    if (selectedMeeting && selectedClass) {
      fetchSessions(selectedMeeting.id, selectedClass.id).then(() => {
        // TODO: Get latest session and fetch records
      });
    }
  }, [selectedMeeting, selectedClass, fetchSessions]);

  const handleBack = () => {
    if (view === 'students') {
      setView('classes');
      setSelectedClass(null);
    } else if (view === 'classes') {
      setView('meetings');
      setSelectedMeeting(null);
    } else if (view === 'meetings') {
      setView('courses');
      setSelectedSubject(null);
    } else if (view === 'courses') {
      setView('semesters');
      setSelectedSemester(null);
    }
  };

  const getBreadcrumb = () => {
    const parts = ['Riwayat Kehadiran'];
    if (selectedSemester) parts.push(`Semester ${selectedSemester}`);
    if (selectedSubject) parts.push(selectedSubject.name);
    if (selectedMeeting) parts.push(`Pertemuan ${selectedMeeting.meeting_number}`);
    if (selectedClass) parts.push(`Kelas ${selectedClass.name}`);
    return parts;
  };

  // Subject CRUD handlers
  const handleOpenSubjectDialog = (subject?: Subject) => {
    if (subject) {
      setEditingSubject(subject);
      setSubjectForm({ name: subject.name, code: subject.code, semester: subject.semester });
    } else {
      setEditingSubject(null);
      setSubjectForm({ name: '', code: '', semester: selectedSemester || 1 });
    }
    setShowSubjectDialog(true);
  };

  const handleSaveSubject = async () => {
    if (!subjectForm.name || !subjectForm.code) return;
    
    setSaving(true);
    try {
      if (editingSubject) {
        await updateSubject(editingSubject.id, subjectForm);
      } else {
        await createSubject(subjectForm);
      }
      setShowSubjectDialog(false);
    } finally {
      setSaving(false);
    }
  };

  // Meeting CRUD handlers
  const handleOpenMeetingDialog = (meeting?: Meeting) => {
    if (meeting) {
      setEditingMeeting(meeting);
      setMeetingForm({ meeting_number: meeting.meeting_number, topic: meeting.topic || '' });
    } else {
      setEditingMeeting(null);
      const nextNumber = subjectMeetings.length + 1;
      setMeetingForm({ meeting_number: nextNumber, topic: '' });
    }
    setShowMeetingDialog(true);
  };

  const handleSaveMeeting = async () => {
    if (!selectedSubject) return;
    
    setSaving(true);
    try {
      if (editingMeeting) {
        await updateMeeting(editingMeeting.id, meetingForm);
      } else {
        await createMeeting({
          subject_id: selectedSubject.id,
          ...meetingForm
        });
      }
      await fetchMeetings(selectedSubject.id);
      setShowMeetingDialog(false);
    } finally {
      setSaving(false);
    }
  };

  // Delete handlers
  const handleDelete = async () => {
    if (!deletingItem) return;
    
    setSaving(true);
    try {
      if (deletingItem.type === 'subject') {
        await deleteSubject(deletingItem.id);
      } else {
        await deleteMeeting(deletingItem.id);
        if (selectedSubject) {
          await fetchMeetings(selectedSubject.id);
        }
      }
      setShowDeleteDialog(false);
      setDeletingItem(null);
    } finally {
      setSaving(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="w-5 h-5 text-success" />;
      case 'late':
        return <Clock className="w-5 h-5 text-warning-foreground" />;
      case 'excused':
        return <Clock className="w-5 h-5 text-primary" />;
      case 'absent':
        return <XCircle className="w-5 h-5 text-destructive" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      present: 'bg-success/10 text-success',
      late: 'bg-warning/20 text-warning-foreground',
      excused: 'bg-primary/10 text-primary',
      absent: 'bg-destructive/10 text-destructive',
    };
    return styles[status as keyof typeof styles] || '';
  };

  if (loading) {
    return (
      <div className="space-y-6 pt-12 md:pt-0">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-12 md:pt-0">
      {/* Header */}
      <div className="flex items-center gap-4">
        {view !== 'semesters' && (
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Riwayat Kehadiran</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1 flex-wrap">
            {getBreadcrumb().map((item, idx) => (
              <span key={idx} className="flex items-center gap-2">
                {idx > 0 && <ChevronRight className="w-4 h-4" />}
                <span className={idx === getBreadcrumb().length - 1 ? 'text-foreground' : ''}>
                  {item.length > 20 ? item.substring(0, 20) + '...' : item}
                </span>
              </span>
            ))}
          </div>
        </div>
        
        {/* Add buttons */}
        {canEdit && view === 'courses' && selectedSemester && (
          <Button onClick={() => handleOpenSubjectDialog()} className="gap-2">
            <Plus className="w-4 h-4" />
            Tambah Mata Kuliah
          </Button>
        )}
        {canEdit && view === 'meetings' && selectedSubject && (
          <Button onClick={() => handleOpenMeetingDialog()} className="gap-2">
            <Plus className="w-4 h-4" />
            Tambah Pertemuan
          </Button>
        )}
      </div>

      {/* Semesters */}
      {view === 'semesters' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {semesters.map((sem) => {
            const semSubjects = getSubjectsBySemester(sem);
            return (
              <button
                key={sem}
                onClick={() => {
                  setSelectedSemester(sem);
                  setView('courses');
                }}
                className="glass-card rounded-2xl p-6 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-glow group"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Folder className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">Semester {sem}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {semSubjects.length} Mata Kuliah
                </p>
              </button>
            );
          })}
        </div>
      )}

      {/* Courses */}
      {view === 'courses' && selectedSemester && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {getSubjectsBySemester(selectedSemester).map((subject) => (
            <div
              key={subject.id}
              className="glass-card rounded-2xl p-5 transition-all duration-300 hover:shadow-soft group"
            >
              <div className="flex items-start gap-4">
                <button
                  onClick={() => {
                    setSelectedSubject(subject);
                    setView('meetings');
                  }}
                  className="flex items-start gap-4 flex-1 text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center flex-shrink-0 group-hover:bg-success/20 transition-colors">
                    <FolderOpen className="w-6 h-6 text-success" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium text-foreground line-clamp-2">{subject.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{subject.code}</p>
                  </div>
                </button>
                
                {canEdit && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleOpenSubjectDialog(subject)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => {
                        setDeletingItem({ type: 'subject', id: subject.id });
                        setShowDeleteDialog(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {getSubjectsBySemester(selectedSemester).length === 0 && (
            <div className="col-span-full text-center py-12">
              <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Belum ada mata kuliah untuk semester ini</p>
              {canEdit && (
                <Button onClick={() => handleOpenSubjectDialog()} className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Mata Kuliah
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Meetings */}
      {view === 'meetings' && selectedSubject && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {meetings
            .filter(m => m.subject_id === selectedSubject.id)
            .sort((a, b) => a.meeting_number - b.meeting_number)
            .map((meeting) => (
            <div
              key={meeting.id}
              className="glass-card rounded-xl p-4 transition-all duration-300 hover:shadow-soft group relative"
            >
              <button
                onClick={() => {
                  setSelectedMeeting(meeting);
                  setView('classes');
                }}
                className="w-full text-center"
              >
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center mx-auto mb-2 group-hover:bg-warning/20 transition-colors">
                  <span className="font-bold text-warning-foreground">{meeting.meeting_number}</span>
                </div>
                <p className="text-xs text-muted-foreground">Minggu {meeting.meeting_number}</p>
                {meeting.topic && (
                  <p className="text-xs text-foreground mt-1 line-clamp-2">{meeting.topic}</p>
                )}
              </button>
              
              {canEdit && (
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleOpenMeetingDialog(meeting)}
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive"
                    onClick={() => {
                      setDeletingItem({ type: 'meeting', id: meeting.id });
                      setShowDeleteDialog(true);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          ))}
          
          {meetings.filter(m => m.subject_id === selectedSubject.id).length === 0 && (
            <div className="col-span-full text-center py-12">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Belum ada pertemuan</p>
              {canEdit && (
                <Button onClick={() => handleOpenMeetingDialog()} className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Pertemuan
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Classes */}
      {view === 'classes' && selectedMeeting && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {classes.map((cls) => (
            <button
              key={cls.id}
              onClick={() => {
                setSelectedClass(cls);
                setView('students');
              }}
              className="glass-card rounded-2xl p-6 text-center transition-all duration-300 hover:scale-[1.02] hover:shadow-glow group"
            >
              <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Users className="w-8 h-8 text-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Kelas {cls.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">25 Mahasiswa</p>
            </button>
          ))}
        </div>
      )}

      {/* Students List */}
      {view === 'students' && selectedClass && (
        <div className="glass-card rounded-2xl overflow-hidden">
          {/* Summary */}
          <div className="p-4 border-b border-border flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success" />
              <span className="text-sm text-muted-foreground">
                Hadir: {records.filter(r => r.status === 'present').length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-warning" />
              <span className="text-sm text-muted-foreground">
                Terlambat: {records.filter(r => r.status === 'late').length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span className="text-sm text-muted-foreground">
                Izin: {records.filter(r => r.status === 'excused').length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive" />
              <span className="text-sm text-muted-foreground">
                Alpha: {records.filter(r => r.status === 'absent').length}
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">No</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">NIM</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Nama</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Waktu</th>
                </tr>
              </thead>
              <tbody>
                {records.length > 0 ? (
                  records.map((record, idx) => (
                    <tr key={record.id} className={idx % 2 === 0 ? 'bg-muted/30' : ''}>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{idx + 1}</td>
                      <td className="py-3 px-4 text-sm font-mono text-foreground">{record.student_nim || '-'}</td>
                      <td className="py-3 px-4 text-sm text-foreground">{record.student_name || '-'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={cn(
                          "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium",
                          getStatusBadge(record.status)
                        )}>
                          {getStatusIcon(record.status)}
                          <span className="capitalize">{record.status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-center text-muted-foreground">
                        {record.scanned_at ? new Date(record.scanned_at).toLocaleTimeString('id-ID') : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      Belum ada data kehadiran
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subject Dialog */}
      <Dialog open={showSubjectDialog} onOpenChange={setShowSubjectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSubject ? 'Edit Mata Kuliah' : 'Tambah Mata Kuliah'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nama Mata Kuliah</Label>
              <Input
                value={subjectForm.name}
                onChange={e => setSubjectForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Contoh: Pemrograman Web"
              />
            </div>
            <div className="space-y-2">
              <Label>Kode</Label>
              <Input
                value={subjectForm.code}
                onChange={e => setSubjectForm(prev => ({ ...prev, code: e.target.value }))}
                placeholder="Contoh: IF123"
              />
            </div>
            <div className="space-y-2">
              <Label>Semester</Label>
              <Select
                value={String(subjectForm.semester)}
                onValueChange={v => setSubjectForm(prev => ({ ...prev, semester: Number(v) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {semesters.map(sem => (
                    <SelectItem key={sem} value={String(sem)}>Semester {sem}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubjectDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveSubject} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Meeting Dialog */}
      <Dialog open={showMeetingDialog} onOpenChange={setShowMeetingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMeeting ? 'Edit Pertemuan' : 'Tambah Pertemuan'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nomor Pertemuan</Label>
              <Input
                type="number"
                min={1}
                max={14}
                value={meetingForm.meeting_number}
                onChange={e => setMeetingForm(prev => ({ ...prev, meeting_number: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Topik (Opsional)</Label>
              <Input
                value={meetingForm.topic}
                onChange={e => setMeetingForm(prev => ({ ...prev, topic: e.target.value }))}
                placeholder="Contoh: Pengenalan HTML & CSS"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMeetingDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveMeeting} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {deletingItem?.type === 'subject' ? 'Mata Kuliah' : 'Pertemuan'}?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Data yang terkait juga akan terhapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
