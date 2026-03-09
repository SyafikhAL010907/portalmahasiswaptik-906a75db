import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from 'react-simple-code-editor';
// @ts-ignore
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-php';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-swift';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import { 
  ChevronLeft, 
  Play, 
  Trash2, 
  Terminal as TerminalIcon, 
  Loader2,
  RotateCcw,
  Zap,
  Maximize2,
  Minimize2,
  Smartphone,
  Code as CodeIcon,
  Palette,
  FileCode,
  Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectValue, 
  SelectTrigger 
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface IDEViewProps {
  onBack: () => void;
}

interface TerminalLine {
  type: 'output' | 'input' | 'error' | 'system';
  content: string;
  lineLink?: number;
}

interface LanguageMetadata {
  id: string;
  name: string;
  version: string;
  prismLang: string;
  inputKeywords: string[];
  description: string;
  pistonLang: string;
  pistonVersion: string;
  boilerplate: string | { html: string, css: string, js: string };
}

// 🟢 NUCLEAR OPTION: Simpler versions for maximum Piston V2 compatibility
const LANGUAGES: LanguageMetadata[] = [
  { 
    id: 'python', name: 'Python', version: '3.10', prismLang: 'python',
    inputKeywords: ['input(', 'sys.stdin'],
    pistonLang: 'python', pistonVersion: '*',
    description: 'V.2026 Python Monster Engine (Piston)',
    boilerplate: 'print("Halo Mahasiswa PTIK! V-Code Cloud Mode Gratisan Aktif.")'
  },
  { 
    id: 'javascript', name: 'JavaScript', version: 'Node 18', prismLang: 'javascript',
    inputKeywords: ['readline', 'process.stdin'],
    pistonLang: 'javascript', pistonVersion: '*',
    description: 'V.2026 JS Monster Engine (Piston)',
    boilerplate: 'console.log("Halo Mahasiswa PTIK! V-Code Cloud Mode Gratisan Aktif.");'
  },
  { 
    id: 'typescript', name: 'TypeScript', version: '5.0', prismLang: 'typescript',
    inputKeywords: ['readline', 'process.stdin'],
    pistonLang: 'typescript', pistonVersion: '*',
    description: 'V.2026 TS Monster Engine (Piston)',
    boilerplate: 'console.log("Halo Mahasiswa PTIK! V-Code Cloud Mode Gratisan Aktif.");'
  },
  { 
    id: 'java', name: 'Java', version: '17', prismLang: 'java',
    inputKeywords: ['Scanner', '.next', '.read'],
    pistonLang: 'java', pistonVersion: '*',
    description: 'V.2026 Java Monster Engine (Piston)',
    boilerplate: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Halo Mahasiswa PTIK!");\n    }\n}'
  },
  { 
    id: 'cpp', name: 'C++', version: 'GCC 11', prismLang: 'cpp',
    inputKeywords: ['cin >>', 'getline(', 'scanf('],
    pistonLang: 'cpp', pistonVersion: '*',
    description: 'V.2026 C++ Monster Engine (Piston)',
    boilerplate: '#include <iostream>\n\nint main() {\n    std::cout << "Halo Mahasiswa PTIK!";\n    return 0;\n}'
  },
  { 
    id: 'c', name: 'C', version: 'GCC 11', prismLang: 'c',
    inputKeywords: ['scanf(', 'gets(', 'getchar('],
    pistonLang: 'c', pistonVersion: '*',
    description: 'V.2026 C Monster Engine (Piston)',
    boilerplate: '#include <stdio.h>\n\nint main() {\n    printf("Halo Mahasiswa PTIK!");\n    return 0;\n}'
  },
  { 
    id: 'csharp', name: 'C#', version: 'Mono 6.12', prismLang: 'csharp',
    inputKeywords: ['Console.Read'],
    pistonLang: 'csharp', pistonVersion: '*',
    description: 'V.2026 C# Monster Engine (Piston)',
    boilerplate: 'using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Halo Mahasiswa PTIK!");\n    }\n}'
  },
  { 
    id: 'php', name: 'PHP', version: '8.2', prismLang: 'php',
    inputKeywords: ['fgets(STDIN)', 'readline('],
    pistonLang: 'php', pistonVersion: '*',
    description: 'V.2026 PHP Monster Engine (Piston)',
    boilerplate: '<?php echo "Halo Mahasiswa PTIK!"; ?>'
  },
  { 
    id: 'go', name: 'Go', version: '1.16', prismLang: 'go',
    inputKeywords: ['fmt.Scan', 'fmt.Fscan'],
    pistonLang: 'go', pistonVersion: '*',
    description: 'V.2026 Go Monster Engine (Piston)',
    boilerplate: 'package main\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Halo Mahasiswa PTIK!")\n}'
  },
  { 
    id: 'ruby', name: 'Ruby', version: '3.0', prismLang: 'ruby',
    inputKeywords: ['gets', 'readLine'],
    pistonLang: 'ruby', pistonVersion: '*',
    description: 'V.2026 Ruby Monster Engine (Piston)',
    boilerplate: 'puts "Halo Mahasiswa PTIK!"'
  },
  { 
    id: 'ruby', name: 'Ruby', version: '3.0', prismLang: 'ruby',
    inputKeywords: ['gets', 'readLine'],
    pistonLang: 'ruby', pistonVersion: '*',
    description: 'V.2026 Ruby Monster Engine (Piston)',
    boilerplate: 'puts "Halo Mahasiswa PTIK!"'
  },
  { 
    id: 'rust', name: 'Rust', version: '1.68', prismLang: 'rust',
    inputKeywords: ['read_line', 'stdin()'],
    pistonLang: 'rust', pistonVersion: '*',
    description: 'V.2026 Rust Monster Engine (Piston)',
    boilerplate: 'fn main() {\n    println!("Halo Mahasiswa PTIK!");\n}'
  },
  { 
    id: 'swift', name: 'Swift', version: '5.3', prismLang: 'swift',
    inputKeywords: ['readLine('],
    pistonLang: 'swift', pistonVersion: '*',
    description: 'V.2026 Swift Monster Engine (Piston)',
    boilerplate: 'print("Halo Mahasiswa PTIK!")'
  },
  { 
    id: 'r', name: 'R', version: '4.1', prismLang: 'r',
    inputKeywords: ['readline(', 'scan('],
    pistonLang: 'r', pistonVersion: '*',
    description: 'V.2026 R Monster Engine (Piston)',
    boilerplate: 'print("Halo Mahasiswa PTIK!")'
  },
  { 
    id: 'sql', name: 'SQL', version: 'SQLite 3.36', prismLang: 'sql',
    inputKeywords: [],
    pistonLang: 'sqlite3', pistonVersion: '*',
    description: 'V.2026 SQL Monster Engine (Piston)',
    boilerplate: '-- SQL Ready\nSELECT "Halo Mahasiswa PTIK!";'
  },
  { 
    id: 'web', name: 'WEB', version: 'Triple Factory', prismLang: 'html',
    inputKeywords: [],
    pistonLang: 'web', pistonVersion: '1.0',
    description: 'V.2026 WebTriple Factory Engine (Internal)',
    boilerplate: {
      html: '<div class="card">\n  <h1>V-CODE MONSTER</h1>\n  <p>Status: <span id="status">GACOR!</span></p>\n  <button id="btn">KLIK GUE, BRO!</button>\n</div>',
      css: "body { \n  background: #010409; \n  color: white; \n  display: flex; \n  justify-content: center; \n  align-items: center; \n  height: 100vh; \n  font-family: 'Inter', sans-serif;\n}\n.card {\n  padding: 40px;\n  background: rgba(255,255,255,0.02);\n  border: 1px solid rgba(255,255,255,0.05);\n  border-radius: 20px;\n  backdrop-filter: blur(10px);\n  text-align: center;\n}\nh1 { color: #38bdf8; margin-bottom: 20px; }\nbutton {\n  background: #38bdf8;\n  border: none;\n  padding: 10px 20px;\n  border-radius: 10px;\n  color: #000;\n  font-weight: bold;\n  cursor: pointer;\n  transition: 0.3s;\n}\nbutton:hover { scale: 1.1; box-shadow: 0 0 20px #38bdf8; }",
      js: "const btn = document.getElementById('btn');\nconst status = document.getElementById('status');\nlet count = 0;\n\nbtn.addEventListener('click', () => {\n  count++;\n  status.innerText = 'KLIK KE-' + count + '!';\n  console.log('User nge-klik tombol gacor!');\n});"
    }
  }
];

export const IDEView: React.FC<IDEViewProps> = ({ onBack }) => {
  const [language, setLanguage] = useState<LanguageMetadata>(LANGUAGES[0]);
  
  const [webCode, setWebCode] = useState<{html: string, css: string, js: string}>(() => {
    const web = LANGUAGES.find(l => l.id === 'web');
    return (web?.boilerplate as {html: string, css: string, js: string});
  });
  const [activeTab, setActiveTab ] = useState<'html' | 'css' | 'js'>('html');
  const [previewDoc, setPreviewDoc] = useState('');

  const [code, setCode] = useState(LANGUAGES[0].boilerplate as string);
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [inputBuffer, setInputBuffer] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isCollecting, setIsCollecting] = useState(false);
  const [errorLines, setErrorLines] = useState<number[]>([]);
  const [blinkLine, setBlinkLine] = useState<number | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  
  const terminalScrollRef = useRef<HTMLDivElement>(null);
  const editorScrollRef = useRef<HTMLDivElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    // 📡 LISTEN TO AI BRAIN CODE TRANSFERS
    const handleAICopy = (e: any) => {
      if (e.detail) {
        setCode(e.detail);
        toast.success('Kode dari AI masuk ke Editor, Bro!');
        // Blink the editor to show it updated
        setBlinkLine(1);
        setTimeout(() => setBlinkLine(null), 1500);
      }
    };
    window.addEventListener('monster-ide-copy', handleAICopy);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('monster-ide-copy', handleAICopy);
    };
  }, []);

  useEffect(() => {
    if (terminalScrollRef.current) {
      terminalScrollRef.current.scrollTop = terminalScrollRef.current.scrollHeight;
    }
  }, [terminalLines]);

  useEffect(() => {
    if (language.id !== 'web') {
      setCode(language.boilerplate as string);
    }
    
    setTerminalLines([{ type: 'system', content: '[SYSTEM]: V-CODE MONSTER NUCLEAR V.2026 ENGAGED for ' + language.name + '.' }]);
    setInputBuffer([]);
    setCurrentInput('');
    setIsCollecting(false);
    setErrorLines([]);
  }, [language]);

  // Debounced Web Preview
  useEffect(() => {
    if (language.id === 'web') {
      const timer = setTimeout(() => {
        runWebPreview();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [webCode]);

  function runWebPreview() {
    const combined = '<!DOCTYPE html><html><head><style>' + webCode.css + '</style></head><body>' + webCode.html + '<script>' + webCode.js + '</script></body></html>';
    setPreviewDoc(combined);
  }

  const handleRun = async () => {
    if (language.id === 'web') {
      runWebPreview();
      toast.success('Nuclear Preview Updated!');
      return;
    }

    let count = 0;
    language.inputKeywords.forEach(kw => {
      const escapedKw = kw.replace('(', '\\(');
      const regex = new RegExp('\\b' + escapedKw, 'g');
      const matches = code.match(regex);
      if (matches) count += matches.length;
    });

    if (count > 0 && inputBuffer.length < count) {
      setIsCollecting(true);
      setTerminalLines(prev => [
        ...prev, 
        { type: 'system', content: '[v.2026 INTERACTIVE]: Program butuh ' + count + ' baris input.' },
        { type: 'error', content: '>>> Input data ke-' + (inputBuffer.length + 1) + ' di terminal ($).' }
      ]);
      return;
    }

    setIsRunning(true);
    setIsCollecting(false);
    setErrorLines([]);
    setTerminalLines(prev => [...prev, { type: 'system', content: '> V-CODE NUCLEAR executing ' + language.name + '... ' }]);
    
    try {
      // ⚛️ NUCLEAR OPTIONS: PURE STERILE
      const cleanHeaders = {
        'Content-Type': 'application/json'
      };

      const cleanPayload = {
        language: language.pistonLang,
        version: "*", // Nuclear wildcard
        files: [{ content: code }],
        stdin: inputBuffer.join('\n') || ""
      };

      // 🧤 BUKTI STERILITAS
      console.log('--- PENGIRIMAN STERIL ---', { headers: cleanHeaders });
      console.log('--- PAYLOAD NUCLEAR ---', cleanPayload);

      // 🛰️ DIRECT WINDOW.FETCH CALL (BYPASS ALL INTERCEPTORS)
      const response = await window.fetch('https://emkc.org/api/v2/piston/execute', {
        method: 'POST',
        headers: cleanHeaders,
        body: JSON.stringify(cleanPayload)
      });

      if (response.status === 401 || response.status === 403) {
        setTerminalLines(prev => [...prev, { 
          type: 'error', 
          content: '[SISTEM]: Headers kodingan lo masih kotor, Bro! Bersihin dulu!' 
        }]);
        toast.error('Headers Kotor Detected!');
        return;
      }

      if (!response.ok) {
        throw new Error('API Response Not OK');
      }

      const data = await response.json();
      
      if (!data.run) {
          throw new Error('Invalid Engine Output');
      }

      const stdout = data.run.stdout;
      const stderr = data.run.stderr;

      if (stdout) setTerminalLines(prev => [...prev, { type: 'output', content: stdout }]);
      
      if (stderr) {
        const lineRegex = /line (\d+)/i;
        const match = stderr.match(lineRegex);
        const lineNum = match ? parseInt(match[1]) : null;
        if (lineNum) setErrorLines(prev => [...prev, lineNum]);
        
        setTerminalLines(prev => [...prev, { 
          type: 'error', 
          content: '[MONSTER ERROR LOG]:\n' + stderr,
          lineLink: lineNum || undefined
        }]);
      }
    } catch (error) {
       console.error('Monster Engine Fallout:', error);
       setTerminalLines(prev => [...prev, { type: 'error', content: '>>> Engine Refused Connection. (Server down or rate limited).' }]);
       toast.error('Nuclear Execution Failed!');
    } finally {
      setIsRunning(false);
    }
  };

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentInput.trim() === '' && currentInput !== '') return;
    
    setTerminalLines(prev => [...prev, { type: 'input', content: currentInput }]);
    setInputBuffer(prev => [...prev, currentInput]);
    setCurrentInput('');
  }

  const jumpToLine = (line: number) => {
    setBlinkLine(line);
    setTimeout(() => setBlinkLine(null), 1500);
  };

  const handleEditorScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const safeHighlight = (codeStr: string) => {
    const prismLang = language.id === 'web' 
       ? (activeTab === 'js' ? 'javascript' : activeTab === 'css' ? 'css' : 'html')
       : language.prismLang;
    const lang = Prism.languages[prismLang];
    if (!lang) return codeStr;
    try {
      return Prism.highlight(codeStr, lang, prismLang);
    } catch (e) {
      return codeStr;
    }
  };

  const currentCodeContent = language.id === 'web' ? webCode[activeTab] : code;
  const linesArray = currentCodeContent.split('\n');

  const renderIDEContent = () => (
    <>
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
          "bg-[#030712] overflow-hidden flex flex-col shadow-2xl transition-all duration-500",
          (isMaximized && isDesktop) ? "fixed inset-0 m-auto w-[95vw] h-[85vh] z-[999999] rounded-3xl ring-1 ring-sky-500/30" : "w-full h-full rounded-2xl border border-white/5"
        )}
      >
        <div className="bg-[#0f172a]/95 backdrop-blur-xl px-4 py-3 flex items-center justify-between border-b border-sky-500/20 shrink-0 z-[60]">
          <div className="flex items-center gap-1.5 sm:gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 rounded-full text-slate-400 hover:text-white hover:bg-white/5 transition-all">
              <ChevronLeft size={18} />
            </Button>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <Zap size={10} className="text-amber-400 fill-amber-400 animate-pulse" />
                <h1 className={cn(
                  "text-[10px] sm:text-[11px] font-black text-white italic tracking-tighter uppercase font-mono truncate max-w-[80px] sm:max-w-none text-left"
                )}>
                  {isMaximized ? 'V-CODE MONSTER NUCLEAR [BYPASS]' : 'V-CODE CLOUD'}
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <Select value={language.id} onValueChange={(val) => setLanguage(LANGUAGES.find(l => l.id === val) || LANGUAGES[0])}>
              <SelectTrigger className={cn(
                "bg-black/40 border-white/10 text-[9px] font-black uppercase tracking-widest text-sky-400 rounded-md focus:ring-0",
                isMaximized ? "w-[130px] h-7" : "w-[90px] h-7"
              )}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" className="bg-[#0f172a] border-sky-500/20 rounded-xl z-[999999]">
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.id} value={lang.id} className="text-[10px] font-bold uppercase py-2 text-slate-300 focus:text-sky-400">
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isDesktop && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsMaximized(!isMaximized)}
                className="h-7 w-7 rounded-md text-slate-400 hover:text-white hover:bg-white/5"
              >
                {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </Button>
            )}
          </div>
        </div>

        {language.id === 'web' && (
          <div className="bg-[#0d1117] px-4 py-2 flex items-center gap-2 border-b border-white/5 overflow-x-auto no-scrollbar">
            <button 
              onClick={() => setActiveTab('html')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all",
                activeTab === 'html' ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" : "text-slate-500 hover:text-white"
              )}
            >
              <CodeIcon size={12} /> HTML
            </button>
            <button 
              onClick={() => setActiveTab('css')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all",
                activeTab === 'css' ? "bg-sky-500/20 text-sky-400 border border-sky-500/30" : "text-slate-500 hover:text-white"
              )}
            >
              <Palette size={12} /> CSS
            </button>
            <button 
              onClick={() => setActiveTab('js')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all",
                activeTab === 'js' ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "text-slate-500 hover:text-white"
              )}
            >
              <FileCode size={12} /> JS
            </button>
            <div className="flex-1" />
            <div className="flex items-center gap-1.5 px-3 py-1 bg-sky-500/10 rounded-full border border-sky-500/10">
              <Globe size={10} className="text-sky-400 animate-spin-slow" />
              <span className="text-[8px] font-black text-sky-400/80 uppercase">Nuclear Web Factory</span>
            </div>
          </div>
        )}

        <div className={cn(
          "flex-1 flex overflow-hidden",
          (isMaximized && isDesktop) ? "flex-row" : "flex-col"
        )}>
          <div className={cn(
            "flex bg-[#010409] relative overflow-hidden group border-white/5",
            isMaximized ? "flex-1 border-r" : "h-[65%] border-b"
          )}>
            <div ref={gutterRef} className="w-10 bg-[#0d1117] border-r border-white/5 pt-[17px] select-none overflow-hidden shrink-0">
              {linesArray.map((_, i) => (
                <div key={i} className={cn(
                  "text-[9px] font-mono leading-[21px] flex items-center justify-center transition-colors",
                  errorLines.includes(i + 1) ? "text-rose-500 font-bold bg-rose-500/10" : "text-slate-700"
                )}>
                  {i + 1}
                </div>
              ))}
            </div>

            <div 
              ref={editorScrollRef}
              onScroll={handleEditorScroll}
              className="flex-1 relative overflow-auto ide-custom-scrollbar"
            >
              <Editor
                value={language.id === 'web' ? webCode[activeTab] : code}
                onValueChange={newVal => {
                  if (language.id === 'web') {
                    setWebCode(prev => ({ ...prev, [activeTab]: newVal }));
                  } else {
                    setCode(newVal);
                  }
                }}
                highlight={safeHighlight}
                padding={16}
                className="font-mono text-[13px] min-h-full"
                style={{
                  fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                  backgroundColor: 'transparent',
                  color: '#f8fafc',
                  lineHeight: '21px',
                }}
              />
              
              {errorLines.map(lineNum => (
                <div 
                  key={lineNum} 
                  className="absolute left-0 right-0 h-[21px] pointer-events-none"
                  style={{ top: (lineNum - 1) * 21 + 16 }}
                >
                  <div className="w-full h-full bg-rose-500/10 border-l-2 border-rose-500" />
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] opacity-80" 
                       style={{ background: "radial-gradient(circle, #f43f5e 1px, transparent 1px)", backgroundSize: "4px 4px" }} 
                  />
                </div>
              ))}

              {blinkLine && (
                <motion.div 
                   initial={{ opacity: 0 }} animate={{ opacity: [0, 0.4, 0] }} transition={{ duration: 1.5 }}
                   className="absolute left-0 right-0 h-[21px] bg-sky-500 pointer-events-none"
                   style={{ top: (blinkLine - 1) * 21 + 16 }}
                />
              )}
            </div>
          </div>

          <div className={cn(
            "bg-black relative overflow-hidden flex flex-col transition-all",
            isMaximized ? "w-[35%]" : "flex-1"
          )}>
            <div className="px-3 py-1.5 bg-[#0f172a]/40 flex items-center justify-between border-b border-white/5 shrink-0">
              <div className="flex items-center gap-1.5">
                <TerminalIcon size={10} className="text-sky-500" />
                <span className="text-[8px] font-black text-sky-500/50 uppercase tracking-widest">
                  {language.id === 'web' ? 'Nuclear Preview' : 'Nuclear Console Output'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                 <button onClick={() => {if (language.id !== 'web') setInputBuffer([]); setTerminalLines([]); toast.success('Cleared!');}} className="p-1 text-slate-600 hover:text-rose-500 transition-colors"><RotateCcw size={10} /></button>
                 <button onClick={() => setTerminalLines([])} className="p-1 text-slate-600 hover:text-sky-500 transition-colors"><Trash2 size={10} /></button>
              </div>
            </div>

            {language.id === 'web' ? (
              <div className="flex-1 bg-white relative overflow-hidden">
                <iframe 
                  srcDoc={previewDoc}
                  title="Web Preview"
                  className="w-full h-full border-none"
                  sandbox="allow-scripts"
                />
              </div>
            ) : (
              <ScrollArea viewportRef={terminalScrollRef} className="flex-1 p-3 bg-[#010101]/80">
                <div className="space-y-1.5 font-mono text-[11px] pb-6">
                  {terminalLines.map((line, i) => (
                    <div key={i} className={cn(
                      "whitespace-pre-wrap leading-relaxed animate-in fade-in slide-in-from-left-2",
                      line.type === 'input' ? "text-amber-400 italic" : 
                      line.type === 'error' ? "text-rose-400 font-bold bg-rose-900/20 p-2 rounded-lg border border-rose-500/10" : 
                      line.type === 'system' ? "text-sky-500/60 lowercase" : "text-white/90"
                    )}>
                      {line.type === 'input' && <span className="text-amber-500/30 mr-2">$</span>}
                      {line.content}
                      {line.lineLink && (
                        <button onClick={() => jumpToLine(line.lineLink!)} className="ml-2 px-2 py-0.5 bg-sky-500/10 text-sky-400 rounded-full text-[9px] border border-sky-500/20 hover:bg-sky-500/20 transition-all">Go L{line.lineLink}</button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {language.id !== 'web' && (
              <form onSubmit={handleTerminalSubmit} className="bg-[#050505] px-4 py-2.5 flex items-center gap-3 border-t border-white/5">
                <span className={cn("text-[12px] font-black", isCollecting ? "text-rose-500 animate-pulse" : "text-sky-500")}>
                  {isCollecting ? 'REQD >' : '$'}
                </span>
                <input 
                  type="text" 
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.currentTarget.value)}
                  disabled={isRunning}
                  className="flex-1 bg-transparent border-none outline-none text-[12px] font-mono text-white placeholder:text-slate-800"
                  placeholder={isCollecting ? "Lengkapi input..." : "Ketik komando..."}
                />
              </form>
            )}
          </div>
        </div>

        <div className={cn(
          "bg-[#010409] flex items-center gap-3 shrink-0 z-50 border-t border-white/10",
          isMaximized ? "px-6 py-4 gap-6" : "px-3 py-2 gap-2"
        )}>
          <Button 
            onClick={handleRun}
            disabled={isRunning}
            className={cn(
              "flex-1 rounded-xl font-black uppercase tracking-widest text-[11px] transition-all duration-300 transform active:scale-95",
              isMaximized ? "h-12 text-[12px] rounded-2xl" : "h-9 text-[10px]",
              "bg-sky-600 hover:bg-sky-500 text-white shadow-[0_0_50px_rgba(56,189,248,0.2)] hover:shadow-sky-500/50 ring-1 ring-white/10"
            )}
          >
            {isRunning ? <Loader2 size={14} className="animate-spin mr-2" /> : (language.id === 'web' ? <Zap size={14} className="mr-2" /> : <Play size={14} className="mr-2 fill-current" />)}
            {isCollecting ? 'SUBMIT INPUT' : (language.id === 'web' ? 'RUN PREVIEW' : (isMaximized ? 'NUCLEAR EXECUTION' : 'RUN CODE'))}
          </Button>
          
          {isMaximized && (
            <div className="hidden md:flex items-center gap-4 px-5 h-12 bg-white/5 rounded-2xl border border-white/5">
              <Smartphone size={14} className="text-sky-400 animate-bounce" />
              <div className="flex flex-col">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nuclear v.2026 Audit</span>
                 <span className="text-[8px] text-sky-500/70 font-bold uppercase tracking-tighter">Bypass Active</span>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );

  return (
    <>
      {isMaximized ? createPortal(renderIDEContent(), document.body) : renderIDEContent()}
    </>
  );
};

export default IDEView;
