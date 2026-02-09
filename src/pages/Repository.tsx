import { useState, useRef } from 'react';
import { 
  Folder, FileText, Video, Image, Download, ChevronRight, ArrowLeft,
  Plus, Upload, Pencil, Trash2, Loader2, X, Search, SortAsc
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useRepositoryData, Material } from '@/hooks/useRepositoryData';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const semesterGradients = [
  'from-primary/20 to-primary/5',
  'from-success/20 to-success/5',
  'from-warning/20 to-warning/5',
  'from-destructive/20 to-destructive/5',
  'from-accent/40 to-accent/10',
  'from-primary/30 to-success/10',
  'from-success/30 to-warning/10',
];

type ViewState = 'semesters' | 'courses' | 'files';
type SortOption = 'name' | 'date' | 'type';

export default function Repository() {
  const { isAdminDev, isAdminKelas } = useAuth();
  const {
    loading,
    uploading,
    materials,
    semesters,
    getSubjectsBySemester,
    getMaterialsBySubject,
    uploadMaterial,
    updateMaterial,
    deleteMaterial,
    canEdit
  } = useRepositoryData();

  const [view, setView] = useState<ViewState>('semesters');
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<{ id: string; name: string } | null>(null);
  const [mediaFilter, setMediaFilter] = useState<'all' | 'document' | 'video' | 'image'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [searchQuery, setSearchQuery] = useState('');

  // Upload dialog
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({ title: '', description: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit/Delete dialogs
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [deletingMaterial, setDeletingMaterial] = useState<Material | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSelectSemester = (semester: number) => {
    setSelectedSemester(semester);
    setView('courses');
  };

  const handleSelectCourse = (subject: { id: string; name: string }) => {
    setSelectedSubject(subject);
    setView('files');
  };

  const handleBack = () => {
    if (view === 'files') {
      setView('courses');
      setSelectedSubject(null);
    } else if (view === 'courses') {
      setView('semesters');
      setSelectedSemester(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadForm(prev => ({ ...prev, title: file.name.replace(/\.[^/.]+$/, '') }));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedSubject || !selectedSemester) return;
    
    setSaving(true);
    try {
      await uploadMaterial(selectedFile, {
        title: uploadForm.title,
        description: uploadForm.description || undefined,
        subject_id: selectedSubject.id,
        semester: selectedSemester
      });
      setShowUploadDialog(false);
      setSelectedFile(null);
      setUploadForm({ title: '', description: '' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingMaterial) return;
    
    setSaving(true);
    try {
      await updateMaterial(editingMaterial.id, {
        title: uploadForm.title,
        description: uploadForm.description || null
      });
      setEditingMaterial(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingMaterial) return;
    
    setSaving(true);
    try {
      await deleteMaterial(deletingMaterial.id);
      setDeletingMaterial(null);
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (material: Material) => {
    setEditingMaterial(material);
    setUploadForm({ title: material.title, description: material.description || '' });
  };

  const subjectMaterials = selectedSubject ? getMaterialsBySubject(selectedSubject.id) : [];
  
  // Filter and sort materials
  const filteredMaterials = subjectMaterials
    .filter(m => {
      if (mediaFilter !== 'all' && m.file_type !== mediaFilter) return false;
      if (searchQuery && !m.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.title.localeCompare(b.title);
        case 'type':
          return a.file_type.localeCompare(b.file_type);
        case 'date':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="w-6 h-6 text-destructive" />;
      case 'image':
        return <Image className="w-6 h-6 text-success" />;
      default:
        return <FileText className="w-6 h-6 text-primary" />;
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="space-y-6 pt-12 md:pt-0">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-12 md:pt-0">
      {/* Header with Breadcrumb */}
      <div className="flex items-center gap-4">
        {view !== 'semesters' && (
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Repository Materi</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <span>Repository</span>
            {selectedSemester && (
              <>
                <ChevronRight className="w-4 h-4" />
                <span>Semester {selectedSemester}</span>
              </>
            )}
            {selectedSubject && (
              <>
                <ChevronRight className="w-4 h-4" />
                <span className="truncate max-w-[200px]">{selectedSubject.name}</span>
              </>
            )}
          </div>
        </div>
        
        {canEdit && view === 'files' && selectedSubject && (
          <Button onClick={() => setShowUploadDialog(true)} className="gap-2">
            <Upload className="w-4 h-4" />
            Upload Materi
          </Button>
        )}
      </div>

      {/* Semester Selection */}
      {view === 'semesters' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {semesters.map((semester, idx) => {
            const semSubjects = getSubjectsBySemester(semester);
            return (
              <button
                key={semester}
                onClick={() => handleSelectSemester(semester)}
                className={cn(
                  "glass-card rounded-2xl p-6 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-glow group",
                  `bg-gradient-to-br ${semesterGradients[idx % semesterGradients.length]}`
                )}
              >
                <div className="w-14 h-14 rounded-2xl bg-card/80 backdrop-blur flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Folder className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Semester {semester}</h3>
                <p className="text-sm text-muted-foreground mt-1">{semSubjects.length} Mata Kuliah</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Course Selection */}
      {view === 'courses' && selectedSemester && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {getSubjectsBySemester(selectedSemester).map((subject) => {
            const subjectMats = getMaterialsBySubject(subject.id);
            return (
              <button
                key={subject.id}
                onClick={() => handleSelectCourse({ id: subject.id, name: subject.name })}
                className="glass-card rounded-2xl p-5 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-soft group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                    <Folder className="w-6 h-6 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium text-foreground line-clamp-2">{subject.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{subjectMats.length} File tersedia</p>
                  </div>
                </div>
              </button>
            );
          })}
          
          {getSubjectsBySemester(selectedSemester).length === 0 && (
            <div className="col-span-full text-center py-12">
              <Folder className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Belum ada mata kuliah untuk semester ini</p>
            </div>
          )}
        </div>
      )}

      {/* Files List */}
      {view === 'files' && selectedSubject && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari materi..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Filter */}
            <div className="flex gap-2">
              {[
                { key: 'all', label: 'Semua' },
                { key: 'document', label: 'Dokumen', icon: FileText },
                { key: 'video', label: 'Video', icon: Video },
                { key: 'image', label: 'Gambar', icon: Image },
              ].map((filter) => (
                <Button
                  key={filter.key}
                  variant={mediaFilter === filter.key ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setMediaFilter(filter.key as typeof mediaFilter)}
                  className={cn(mediaFilter === filter.key && 'primary-gradient')}
                >
                  {filter.icon && <filter.icon className="w-4 h-4 mr-2" />}
                  {filter.label}
                </Button>
              ))}
            </div>
            
            {/* Sort */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <SortAsc className="w-4 h-4" />
                  Urutkan
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSortBy('date')}>
                  Terbaru
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('name')}>
                  Nama A-Z
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('type')}>
                  Tipe File
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* File Cards */}
          <div className="space-y-3">
            {filteredMaterials.length > 0 ? (
              filteredMaterials.map((material) => (
                <div
                  key={material.id}
                  className="glass-card rounded-xl p-4 flex items-center justify-between gap-4 hover:shadow-soft transition-shadow"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                      material.file_type === 'document' ? 'bg-primary/10' : 
                      material.file_type === 'video' ? 'bg-destructive/10' : 'bg-success/10'
                    )}>
                      {getFileIcon(material.file_type)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-medium text-foreground truncate">{material.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(material.file_size)} • {new Date(material.created_at).toLocaleDateString('id-ID')}
                      </p>
                      {material.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{material.description}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {canEdit && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(material)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setDeletingMaterial(material)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    <Button variant="pill" size="sm" asChild>
                      <a href={material.file_url} download target="_blank" rel="noopener noreferrer">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </a>
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="glass-card rounded-2xl p-12 text-center">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery ? 'Tidak ada hasil yang cocok' : 'Belum ada materi untuk mata kuliah ini'}
                </p>
                {canEdit && !searchQuery && (
                  <Button onClick={() => setShowUploadDialog(true)} className="mt-4">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Materi Pertama
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Materi Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* File Input */}
            <div className="space-y-2">
              <Label>File</Label>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.mp4,.mov,.jpg,.jpeg,.png,.gif"
              />
              {selectedFile ? (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  {getFileIcon(selectedFile.type.includes('video') ? 'video' : 
                              selectedFile.type.includes('image') ? 'image' : 'document')}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setSelectedFile(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full h-24 border-dashed"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="text-center">
                    <Upload className="w-6 h-6 mx-auto mb-2" />
                    <span>Klik untuk memilih file</span>
                  </div>
                </Button>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Judul</Label>
              <Input
                value={uploadForm.title}
                onChange={e => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Judul materi"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Deskripsi (Opsional)</Label>
              <Textarea
                value={uploadForm.description}
                onChange={e => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Deskripsi singkat tentang materi ini"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleUpload} disabled={saving || !selectedFile || !uploadForm.title}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingMaterial} onOpenChange={() => setEditingMaterial(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Materi</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Judul</Label>
              <Input
                value={uploadForm.title}
                onChange={e => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Deskripsi</Label>
              <Textarea
                value={uploadForm.description}
                onChange={e => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMaterial(null)}>
              Batal
            </Button>
            <Button onClick={handleUpdate} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingMaterial} onOpenChange={() => setDeletingMaterial(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Materi?</AlertDialogTitle>
            <AlertDialogDescription>
              Materi "{deletingMaterial?.title}" akan dihapus permanen.
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
