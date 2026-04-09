import { motion } from 'framer-motion';
import { 
  FileText, Video, Download, Folder, ExternalLink, 
  MoreVertical, Pencil, Trash2, Loader2, Table, 
  Presentation, Image as ImageIcon, File 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { useRepository, GDRIVE_LINKS } from '@/SharedLogic/hooks/useRepository';

interface RepositoryMaterialsProps {
  repository: ReturnType<typeof useRepository>;
}

export function RepositoryMaterials({ repository }: RepositoryMaterialsProps) {
  const { 
    view, selectedSemester, selectedCourse, materials, mediaFilter, 
    isLoading, canManage, exhaustedMaterials 
  } = repository.state;

  const { 
    setMediaFilter, handleOpenFile, handleDownload, 
    handleEditMaterialClick, handleDeleteMaterial 
  } = repository.actions;

  if (view !== 'files') return null;

  // --- Filter Logic (SYNCED WITH ORIGINAL) ---
  const filteredMaterials = mediaFilter === 'all'
    ? materials
    : materials.filter(m => {
        const name = (m.title || '').toLowerCase();
        const isOfficeDoc = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'pdf'].some(ext => name.endsWith('.' + ext));
        if (mediaFilter === 'document') return m.file_type === 'document' || m.file_type === 'pdf' || isOfficeDoc;
        return m.file_type === mediaFilter;
      });

  // --- Icon Helpers (SYNCED WITH ORIGINAL) ---
  const getFileIcon = (file: any) => {
    const name = (file.title || '').toLowerCase();
    if (name.endsWith('.pdf')) return <FileText className="w-6 h-6 text-red-500" />;
    if (name.endsWith('.doc') || name.endsWith('.docx')) return <FileText className="w-6 h-6 text-blue-500" />;
    if (name.endsWith('.xls') || name.endsWith('.xlsx')) return <Table className="w-6 h-6 text-green-500" />;
    if (name.endsWith('.ppt') || name.endsWith('.pptx')) return <Presentation className="w-6 h-6 text-orange-500" />;
    if (file.file_type === 'image') return <ImageIcon className="w-6 h-6 text-purple-500" />;
    if (file.file_type === 'video') return <Video className="w-6 h-6 text-orange-500" />;
    return <File className="w-6 h-6 text-gray-500" />;
  };

  const getFileIconBg = (file: any) => {
    const name = (file.title || '').toLowerCase();
    if (name.endsWith('.pdf')) return 'bg-red-500/10';
    if (name.endsWith('.doc') || name.endsWith('.docx')) return 'bg-blue-500/10';
    if (name.endsWith('.xls') || name.endsWith('.xlsx')) return 'bg-green-500/10';
    if (name.endsWith('.ppt') || name.endsWith('.pptx')) return 'bg-orange-500/10';
    if (file.file_type === 'image') return 'bg-purple-500/10';
    if (file.file_type === 'video') return 'bg-orange-500/10';
    return 'bg-gray-500/10';
  };

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* 1. Media Filter Buttons */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all', label: 'Semua' },
          { key: 'document', label: 'Dokumen', icon: FileText },
          { key: 'video', label: 'Video', icon: Video },
          { key: 'image', label: 'Gambar', icon: ImageIcon },
        ].map((filter) => (
          <Button
            key={filter.key}
            variant={mediaFilter === filter.key ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMediaFilter(filter.key as any)}
            className={cn("rounded-full h-10 px-6 font-bold transition-all", mediaFilter === filter.key && 'primary-gradient shadow-lg')}
          >
            {filter.icon && <filter.icon className="w-4 h-4 mr-2" />}
            {filter.label}
          </Button>
        ))}
      </div>

      {/* 2. File Cards Container */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin w-10 h-10 text-primary" /></div>
      ) : (
        <div className="space-y-4">
          {/* --- PINNED GOOGLE DRIVE FOLDER CARD (SYNCED WITH ORIGINAL) --- */}
          {(() => {
            const semesterNumber = selectedSemester?.name.replace(/\D/g, '') || "1";
            const subjectName = selectedCourse?.name || "";
            let currentDriveLink = GDRIVE_LINKS.root;

            if (GDRIVE_LINKS.semesters[semesterNumber]) {
              currentDriveLink = GDRIVE_LINKS.semesters[semesterNumber].root;
              if (GDRIVE_LINKS.semesters[semesterNumber].subjects && GDRIVE_LINKS.semesters[semesterNumber].subjects[subjectName]) {
                currentDriveLink = GDRIVE_LINKS.semesters[semesterNumber].subjects[subjectName];
              }
            }

            return (
              <div className="glass-card rounded-xl p-4 md:p-6 w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-2 border-blue-500/30 dark:border-blue-500/20 bg-blue-50/50 dark:bg-blue-900/10 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 min-w-0 flex-1 w-full">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-blue-100 dark:bg-blue-900/40 shadow-inner">
                    <Folder className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0 flex-1 w-full">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-base md:text-lg text-blue-900 dark:text-blue-100 truncate leading-snug">Folder Drive Eksternal: {subjectName}</h4>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500 text-white flex-shrink-0 animate-pulse">
                        PINNED
                      </span>
                    </div>
                    <p className="text-xs md:text-sm text-blue-700/80 dark:text-blue-300/80 mt-1 font-medium font-italic">Penyimpanan Utama Matakuliah (Tidak dapat dihapus)</p>
                  </div>
                </div>
                <Button variant="default" size="sm" onClick={() => window.open(currentDriveLink, '_blank')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-11 px-6 shadow-md shadow-blue-500/20">
                  <ExternalLink className="w-4 h-4 mr-2" /> Buka Folder
                </Button>
              </div>
            );
          })()}

          {/* Individual Material Cards */}
          {filteredMaterials.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground glass-card rounded-xl opacity-60">Belum ada materi diunggah.</div>
          ) : (
            filteredMaterials.map((file) => (
              <div
                key={file.id}
                className="glass-card rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:shadow-soft transition-all duration-300 group border border-border/50"
              >
                <div className="flex items-center gap-4 min-w-0 flex-1 pr-0 sm:pr-4 w-full">
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm", getFileIconBg(file))}>
                    {getFileIcon(file)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm sm:text-base text-foreground truncate group-hover:text-primary transition-colors">{file.title}</h4>
                      {file.storage_type === 'google_drive' && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex-shrink-0 uppercase">DRIVE</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] sm:text-xs text-muted-foreground mt-1 font-medium opacity-80">
                      {file.file_size ? <span>{(file.file_size / 1024 / 1024).toFixed(2)} MB</span> : <span>GDrive Shared</span>}
                      <span>•</span>
                      <span>{new Date(file.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 flex-shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-muted/10">
                  <div className="flex gap-2 flex-1 sm:flex-none">
                    {file.storage_type === 'google_drive' ? (
                      <Button variant="pill" size="sm" onClick={() => window.open(file.file_url || file.external_url || '', '_blank')} className="flex-1 sm:flex-none h-9 text-xs font-bold gap-2">
                        <ExternalLink className="w-3.5 h-3.5" /> Buka Drive
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenFile(file)}
                          className="flex-1 sm:flex-none h-9 text-xs gap-2 rounded-full border border-muted/30 hover:bg-primary/5 hover:text-primary transition-colors font-medium"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Buka
                        </Button>
                        <Button
                          variant="pill"
                          size="sm"
                          onClick={() => handleDownload(file)}
                          disabled={exhaustedMaterials[file.id]}
                          className="flex-1 sm:flex-none h-9 text-xs font-bold gap-2"
                        >
                          <Download className="w-3.5 h-3.5" />
                          {exhaustedMaterials[file.id] ? "Jatah Habis" : "Download"}
                        </Button>
                      </>
                    )}
                  </div>

                  {canManage && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all flex-shrink-0 rounded-full">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 rounded-xl glass-card border-none shadow-xl p-1">
                        <DropdownMenuItem onClick={() => handleEditMaterialClick(file)} className="gap-2 cursor-pointer focus:bg-primary/10 rounded-lg m-1 font-bold h-10">
                          <Pencil className="w-4 h-4 text-blue-500" /> <span>Edit Data</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteMaterial(file.id)} className="gap-2 cursor-pointer focus:bg-red-500/10 text-red-500 rounded-lg m-1 font-bold h-10">
                          <Trash2 className="w-4 h-4" /> <span>Hapus File</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </motion.div>
  );
}
