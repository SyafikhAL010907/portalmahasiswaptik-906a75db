import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  Zap,
  Maximize2,
  Minimize2,
  Globe,
  X,
  Code2,
  Save,
  Trash2,
  Terminal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface IDEViewProps {
  onBack: () => void;
}

const COMPILER_CATEGORIES = [
  {
    title: 'PROGRAMMING',
    languages: [
      { id: 'python', name: 'Python', slug: 'python' },
      { id: 'java', name: 'Java', slug: 'java' },
      { id: 'c', name: 'C', slug: 'c' },
      { id: 'cpp', name: 'C++', slug: 'cplusplus' },
      { id: 'nodejs', name: 'NodeJS', slug: 'nodejs' },
      { id: 'javascript', name: 'JavaScript', slug: 'javascript' },
      { id: 'typescript', name: 'TypeScript', slug: 'typescript' },
      { id: 'php', name: 'PHP', slug: 'php' },
      { id: 'ruby', name: 'Ruby', slug: 'ruby' },
      { id: 'swift', name: 'Swift', slug: 'swift' },
      { id: 'kotlin', name: 'Kotlin', slug: 'kotlin' },
      { id: 'rust', name: 'Rust', slug: 'rust' },
      { id: 'go', name: 'Go', slug: 'go' },
      { id: 'csharp', name: 'C#', slug: 'csharp' },
      { id: 'r', name: 'R', slug: 'r' },
      { id: 'bash', name: 'Bash', slug: 'bash' },
      { id: 'scala', name: 'Scala', slug: 'scala' },
      { id: 'lua', name: 'Lua', slug: 'lua' },
      { id: 'dart', name: 'Dart', slug: 'dart' }
    ]
  },
  {
    title: 'WEB DEVELOPMENT',
    languages: [
      { id: 'html', name: 'HTML/JS', slug: 'html5' },
      { id: 'react', name: 'React', slug: 'react' },
      { id: 'vue', name: 'Vue', slug: 'vuejs' },
      { id: 'tailwindcss', name: 'Tailwind CSS', slug: 'tailwindcss' },
      { id: 'nextjs', name: 'Next.js', slug: 'nextjs' },
      { id: 'angularjs', name: 'Angular', slug: 'angularjs' },
      { id: 'svelte', name: 'Svelte', slug: 'svelte' }
    ]
  },
  {
    title: 'DATABASE',
    languages: [
      { id: 'mysql', name: 'MySQL', slug: 'mysql' },
      { id: 'postgresql', name: 'PostgreSQL', slug: 'postgresql' },
      { id: 'mongodb', name: 'MongoDB', slug: 'mongodb' },
      { id: 'sqlite', name: 'SQLite', slug: 'sqlite' },
      { id: 'redis', name: 'Redis', slug: 'redis' },
      { id: 'mariadb', name: 'MariaDB', slug: 'mariadb' }
    ]
  }
];

const LanguageIcon = ({ slug, name }: { slug: string; name: string }) => {
  const [error, setError] = useState(false);
  
  if (error) {
    return <Code2 className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400 opacity-60" />;
  }

  return (
    <img 
      src={`https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${slug}/${slug}-original.svg`}
      alt={name}
      onError={() => setError(true)}
      className="w-5 h-5 sm:w-6 sm:h-6 object-contain drop-shadow-sm transition-transform duration-300 group-hover:scale-110"
    />
  );
};

export const IDEView: React.FC<IDEViewProps> = ({ onBack }) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [currentLang, setCurrentLang] = useState('python');
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [recoveredCode, setRecoveredCode] = useState<string | null>(null);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const { theme } = useTheme();
  const { user, profile, refreshProfile } = useAuth();
  const [isFetchingSnippet, setIsFetchingSnippet] = useState(false);

  // 🔄 FETCH USER STATE FROM SUPABASE (SINGLETON)
  const syncUserState = async () => {
    if (!user?.id) return;

    // 1. Sync last language from profile (Safely check property)
    if (profile && (profile as any).last_language && (profile as any).last_language !== currentLang) {
      setCurrentLang((profile as any).last_language);
    }
  };

  useEffect(() => {
    syncUserState();
  }, [user?.id, profile]);

  // 🔄 FETCH SNIPPET FROM SUPABASE (SINGLETON: No language filter)
  const fetchSnippet = async () => {
    if (!user?.id) return;
    
    setIsFetchingSnippet(true);
    try {
      const { data, error } = await supabase
        .from('user_snippets' as any)
        .select('code_content, language')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setRecoveredCode((data as any).code_content || null);
        // Optional: If we want to auto-switch to the snippet's language
        // if ((data as any).language) setCurrentLang((data as any).language);
      } else {
        setRecoveredCode(null);
      }
    } catch (error) {
      console.error('Error fetching snippet:', error);
    } finally {
      setIsFetchingSnippet(false);
    }
  };

  useEffect(() => {
    fetchSnippet();
  }, [user?.id, currentLang]);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const handleAICopy = (e: any) => {
      if (e.detail) {
        toast.success('Kode dari AI dicopy ke clipboard, silahkan paste di editor OneCompiler!', { duration: 3000 });
      }
    };
    window.addEventListener('monster-ide-copy', handleAICopy);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('monster-ide-copy', handleAICopy);
    };
  }, []);

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [snippetText, setSnippetText] = useState('');

  const handleLanguageSelect = async (langId: string) => {
    setCurrentLang(langId);
    setIsPopupOpen(false);

    // PERSIST LAST LANGUAGE TO SUPABASE
    if (user?.id) {
      try {
        await supabase
          .from('profiles')
          .update({ last_language: langId } as any)
          .eq('user_id', user.id);
        
        refreshProfile(); 
      } catch (error) {
        console.error('Error updating last language:', error);
      }
    }
  };

  const handleOpenSaveModal = () => {
    setSnippetText('');
    setIsSaveModalOpen(true);
  };

  const handleSaveSnippet = async () => {
    if (!user?.id || !currentLang || !snippetText.trim()) {
      toast.error('Gagal menyimpan, pastikan kode tidak kosong!');
      return;
    }

    try {
      const { error } = await supabase
        .from('user_snippets' as any)
        .upsert({
          user_id: user.id,
          language: currentLang,
          code_content: snippetText,
          last_accessed: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setRecoveredCode(snippetText);
      setIsSaveModalOpen(false);
      toast.success(`Kodingan ${currentLang.toUpperCase()} berhasil diamankan!`, {
        description: "Data sebelumnya telah diperbarui (Singleton Mode).",
        duration: 3000
      });
    } catch (error) {
      console.error('Error saving snippet:', error);
      toast.error('Gagal sinkronisasi ke database!');
    }
  };

  const handleCopyRecovered = () => {
    if (recoveredCode) {
      navigator.clipboard.writeText(recoveredCode);
      toast.success('Kode disalin ke Clipboard! Silahkan Paste di Editor.', {
        icon: <Zap size={14} className="text-amber-400" />
      });
    }
  };

  const handleDeleteSnippet = async () => {
    if (!user?.id || !currentLang) return;

    try {
      const { error } = await supabase
        .from('user_snippets' as any)
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setRecoveredCode(null);
      setIsRestoreModalOpen(false);
      toast.success("Brankas telah dibersihkan!", {
        description: "Semua data snippet tunggal telah dihapus.",
        icon: <Trash2 size={14} className="text-rose-500" />
      });
    } catch (error) {
      console.error('Error deleting snippet:', error);
      toast.error('Gagal menghapus data dari database!');
    }
  };

  const renderIDEContent = () => (
    <>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 9999px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
        :not(.dark) .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
        }
        :not(.dark) .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #334155 transparent;
        }
        :not(.dark) .custom-scrollbar {
          scrollbar-color: #cbd5e1 transparent;
        }
      `}</style>
      <AnimatePresence>
        {isMaximized && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-lg z-[999998]" 
          />
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={cn(
          "bg-white dark:bg-[#030712] overflow-hidden flex flex-col transition-all duration-500 custom-scrollbar",
          isMaximized 
            ? "fixed inset-0 m-auto w-[90vw] h-[90vh] z-[999999] rounded-3xl shadow-[0_0_50px_rgba(3,7,18,0.8)] ring-1 ring-sky-500/30" 
            : "w-full h-full rounded-2xl border border-slate-200 dark:border-sky-500/20 shadow-2xl relative"
        )}
      >
        {/* HEADER PATEN - ANTI-COLLISION RESPONSIVE */}
        <div className="bg-white/90 dark:bg-[#030712] backdrop-blur-xl px-3 sm:px-4 py-3 flex items-center justify-between border-b border-slate-200 dark:border-sky-500/20 shrink-0 z-[100] transition-colors relative">
          {/* LEFT SIDE: BRANDING */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink min-w-0 mr-4 sm:mr-6">
            <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 rounded-full text-slate-400 hover:text-white hover:bg-white/5 transition-all shrink-0">
              <ChevronLeft size={18} />
            </Button>
            <div className="flex items-center gap-2 min-w-0">
              <Terminal size={16} className="text-sky-400 shrink-0" />
              <div className="flex flex-col min-w-0">
                <h1 className={cn(
                  "text-xs sm:text-sm font-bold text-slate-800 dark:text-white tracking-wider uppercase font-mono truncate max-w-[150px] sm:max-w-none text-left"
                )}>
                  {isMaximized ? 'THE ULTIMATE COMPILER' : 'IDE PTIK'}
                </h1>
                {recoveredCode && (
                  <span className="text-[8px] text-emerald-500 font-bold animate-pulse -mt-0.5 truncate uppercase tracking-widest hidden sm:block">
                    Brankas Aktif: {currentLang}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: ACTIONS GROUP */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto mr-0.5">
            {/* RESTORE BUTTON (ADAPTIVE) */}
            {recoveredCode && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsRestoreModalOpen(true)}
                className="h-8 px-2 sm:px-3 text-[10px] sm:text-xs font-bold gap-1 rounded-md border-amber-500/20 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/20 transition-all shrink-0"
              >
                <div className="relative">
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                  <Code2 size={13} />
                </div>
                <span className="hidden sm:inline">Restore</span>
              </Button>
            )}

            {/* CIRCULAR SAVE SNIPPET BUTTON */}
            <Button 
              size="icon"
              onClick={handleOpenSaveModal}
              title="Simpan Snippet"
              className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/10"
            >
              <Save size={16} />
            </Button>

            {/* LANGUAGE BUTTON (ADAPTIVE) */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsPopupOpen(true)}
              className="h-8 px-2 sm:px-4 text-[10px] sm:text-xs font-bold gap-1.5 sm:gap-2 rounded-lg border-slate-200 dark:border-sky-500/20 dark:bg-[#0f172a] text-sky-600 dark:text-sky-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-all shadow-sm shrink-0"
            >
              <Globe size={14} className="animate-pulse" />
              <span className="hidden sm:inline">Language</span>
              <span className="sm:hidden">{currentLang.substring(0, 2).toUpperCase()}</span>
            </Button>

            {/* MAXIMIZE BUTTON (ALWAYS ON RIGHT) */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsMaximized(!isMaximized)}
              className="h-8 w-8 rounded-md text-slate-400 hover:text-white hover:bg-white/5 flex items-center justify-center shrink-0"
            >
              {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </Button>
          </div>
        </div>

        {/* BEAST EMBED (ONE COMPILER) */}
        <div className="flex-1 w-full h-full overflow-hidden bg-white dark:bg-[#030712] relative z-10 flex flex-col p-0 m-0 custom-scrollbar">
          <iframe 
            src={`https://onecompiler.com/embed/${currentLang}?hideLanguageSelection=true&hideTitle=true&isInteractive=true&theme=${theme === 'dark' ? 'dark' : 'light'}&codeEditorHeight=55%`}
            className="flex-1 w-full h-full border-none m-0 p-0 block"
            width="100%"
            height="100%"
            title="OneCompiler IDE Hub"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-downloads"
            allow="clipboard-write; auto-picture-in-picture fullscreen"
          />
        </div>
      </motion.div>

      {/* POPUP LANGUAGE PICKER */}
      <AnimatePresence>
        {isPopupOpen && (
          <div className="fixed inset-0 z-[1000000] flex items-center justify-center pointer-events-none">
            {/* BACKDROP */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPopupOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
            />
            
            {/* MODAL WINDOW */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn(
                "relative z-[1000001] w-[90vw] sm:max-w-2xl max-h-[80vh] flex flex-col pointer-events-auto",
                "bg-white dark:bg-[#0a0a0a] backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-sky-500/20"
              )}
            >
              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-md z-10">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                    <Globe className="text-sky-500" size={18} /> THE ULTIMATE HUB
                  </h2>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Pilih bahasa untuk menjalankan engine di dalam lab virtual.</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsPopupOpen(false)} className="rounded-full bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-500 transition-colors h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                  <X size={20} className="sm:w-5 sm:h-5" />
                </Button>
              </div>

              <div className="p-4 sm:p-6 overflow-y-auto max-h-[70vh] custom-scrollbar flex-1">
                <div className="flex flex-col gap-6 sm:gap-8">
                  {COMPILER_CATEGORIES.map((category) => (
                    <div key={category.title} className="flex flex-col gap-3">
                      <h3 className="text-[10px] sm:text-[11px] font-black tracking-widest text-slate-400 dark:text-slate-500 pl-1 uppercase">
                        {category.title}
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                        {category.languages.map((lang) => (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            key={lang.id}
                            onClick={() => handleLanguageSelect(lang.id)}
                            className={cn(
                              "p-3 sm:p-4 rounded-xl flex flex-col items-center justify-center gap-2.5 sm:gap-3 border transition-all duration-300 group relative overflow-hidden",
                              currentLang === lang.id 
                                ? "bg-sky-500 text-white border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.4)]" 
                                : "bg-slate-50 dark:bg-[#111] border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1a1a1a] hover:border-sky-500/40 hover:shadow-lg"
                            )}
                          >
                            <div className={cn(
                              "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all bg-white dark:bg-[#222]",
                              currentLang === lang.id ? "bg-white/20 shadow-inner" : "shadow-sm group-hover:shadow-sky-500/20"
                            )}>
                              <LanguageIcon slug={lang.slug} name={lang.name} />
                            </div>
                            <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-center">{lang.name}</span>
                            {currentLang === lang.id && (
                               <div className="absolute inset-0 border-2 border-white/20 rounded-xl pointer-events-none" />
                            )}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SAVE CODE (SNIPPET VAULT) MODAL */}
      <AnimatePresence>
        {isSaveModalOpen && (
          <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSaveModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white dark:bg-[#0a0a0a] border border-emerald-500/20 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-4 border-b border-emerald-500/10 flex items-center justify-between bg-emerald-500/5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <Save size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white">Brankas Snippet</h3>
                    <p className="text-[10px] text-slate-500">Amankan kodingan {currentLang.toUpperCase()} kamu di sini.</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsSaveModalOpen(false)} className="rounded-full">
                  <X size={20} />
                </Button>
              </div>

              <div className="p-4 flex-1 overflow-hidden flex flex-col gap-4">
                <div className="flex-1 min-h-[200px] relative group">
                  <textarea
                    value={snippetText}
                    onChange={(e) => setSnippetText(e.target.value)}
                    placeholder="Paste kode kamu di sini..."
                    className="w-full h-full bg-slate-950 rounded-xl p-4 font-mono text-xs text-sky-400 border border-white/5 focus:ring-1 focus:ring-emerald-500/50 outline-none resize-none transition-all"
                  />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[8px] px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded-full font-bold uppercase tracking-widest whitespace-nowrap">Input Area</span>
                  </div>
                </div>
                
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 flex gap-3">
                  <Zap size={20} className="text-emerald-500 shrink-0" />
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    <span className="font-bold text-emerald-500">TIPS:</span> Copy kode dari tampilan IDE lalu Paste di atas. Data akan disimpan aman di memori browser (Local Storage) kamu.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-white/5 flex gap-3">
                <Button 
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-lg shadow-emerald-500/20"
                  onClick={handleSaveSnippet}
                >
                  <Save size={16} /> Simpan ke Browser
                </Button>
                <Button 
                  variant="outline"
                  className="px-6"
                  onClick={() => setIsSaveModalOpen(false)}
                >
                  Batal
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RESTORE CODE MODAL */}
      <AnimatePresence>
        {isRestoreModalOpen && (
          <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRestoreModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-amber-500/5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-500">
                    <Code2 size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white">Recover Snippet</h3>
                    <p className="text-[10px] text-slate-500">Terakhir disimpan untuk {currentLang.toUpperCase()}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsRestoreModalOpen(false)} className="rounded-full">
                  <X size={20} />
                </Button>
              </div>

              <div className="p-4 flex-1 overflow-hidden flex flex-col gap-4">
                <div className="flex-1 bg-slate-950 rounded-xl p-4 font-mono text-xs text-sky-400 overflow-y-auto border border-white/5">
                  <pre className="whitespace-pre-wrap break-all">{recoveredCode}</pre>
                </div>
                
                <div className="bg-sky-500/5 border border-sky-500/20 rounded-xl p-3 flex gap-3">
                  <Zap size={20} className="text-sky-500 shrink-0" />
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    <span className="font-bold text-sky-500">INFO:</span> Salin kode di atas lalu <b>Paste (Ctrl + V)</b> 
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-white/5 flex gap-3">
                <Button 
                  className="flex-1 bg-sky-500 hover:bg-sky-600 text-white font-bold gap-2"
                  onClick={handleCopyRecovered}
                >
                  <Save size={16} /> Salin Kode
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleDeleteSnippet}
                  title="Hapus Brankas"
                  className="bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/20 shrink-0"
                >
                  <Trash2 size={18} />
                </Button>
                <Button 
                  variant="outline"
                  className="px-6"
                  onClick={() => setIsRestoreModalOpen(false)}
                >
                  Tutup
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );

  return (
    <>
      {isMaximized ? createPortal(renderIDEContent(), document.body) : renderIDEContent()}
    </>
  );
};

export default IDEView;
