import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  ChevronLeft,
  Sparkles,
  Send,
  Maximize2,
  Minimize2,
  Copy,
  Code as CodeIcon,
  Loader2,
  Terminal,
  Cpu,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
// @ts-ignore
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';

interface AIViewProps {
  onBack: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const AIView: React.FC<AIViewProps> = ({ onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>("gemini-1.5-flash");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isSynchronizing, setIsSynchronizing] = useState(false);
  const [aiStatus, setAiStatus] = useState<'online' | 'offline' | 'limited'>('online');
  const { user } = useAuth();

  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (force = false) => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      
      if (force || isAtBottom) {
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: force ? 'smooth' : 'auto'
        });
      }
    }
  };

  useEffect(() => {
    scrollToBottom(messages.length <= 1);
  }, [messages, streamingText]);

  useEffect(() => {
    Prism.highlightAll();
  }, [messages, streamingText]);

  useEffect(() => {
    checkAvailableModels();
  }, []);

  const checkAvailableModels = async () => {
    setIsSynchronizing(true);
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    try {
      console.log('--- MEMULAI DIAGNOSA MODEL GOOGLE ---');
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      const data = await response.json();
      
      if (data.models) {
        console.table(data.models.map((m: any) => ({ name: m.name, version: m.version, displayName: m.displayName })));
        const names = data.models.map((m: any) => m.name.replace('models/', ''));
        setAvailableModels(names);
        
        // Auto-Selector Logic
        const hasFlash = names.find(n => n.includes('gemini-1.5-flash'));
        const hasPro = names.find(n => n.includes('gemini-pro'));
        
        if (hasFlash) {
          setSelectedModel(hasFlash);
          console.log('✅ AUTO-SELECTED: Gemini 1.5 Flash');
        } else if (hasPro) {
          setSelectedModel(hasPro);
          console.log('⚠️ FALLBACK: Gemini Pro selected');
        } else if (names.length > 0) {
          setSelectedModel(names[0]);
          console.log(`⚠️ EMERGENCY FALLBACK: ${names[0]} selected`);
        }
      }
    } catch (error) {
      console.error('❌ Gagal sinkronisasi model:', error);
    } finally {
      setIsSynchronizing(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setIsLoading(true);

    if (!history.includes(userMessage.substring(0, 30))) {
      setHistory(prev => [userMessage.substring(0, 30) + '...', ...prev].slice(0, 10));
    }

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      
      const callGemini = async (model: string) => {
        // Use v1 for stable generation, fallback to v1beta if needed
        const endpointV1 = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
        const endpointV1Beta = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        
        const systemInstruction = "Asisten  PTIK 2025 yang jago koding, ahli jaringan, dan asik diajak diskusi soal tugas kuliah. Gunakan bahasa yang santai tapi profesional, sering panggil 'Bro'. Fokus pada solusi teknis yang akurat.";

        console.log(`--- MENCOBA CALL GOOGLE V1 (${model}) ---`);
        let response = await fetch(endpointV1.trim(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemInstruction}\n\nUser: ${userMessage}` }] }]
          })
        });

        // If v1 fails with 404, try v1beta
        if (!response.ok && response.status === 404) {
          console.log(`--- V1 GAGAL (404), MENCOBA V1BETA (${model}) ---`);
          response = await fetch(endpointV1Beta.trim(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${systemInstruction}\n\nUser: ${userMessage}` }] }]
            })
          });
        }

        return response;
      };

      let response = await callGemini(selectedModel);

      // 🕵️ DEEP-RECOVERY: Jika gagal total, siklus lewat SEMUA model yang tersedia
      if (!response.ok && (response.status === 429 || response.status === 404 || response.status === 400)) {
        console.warn(`[RECOVERY]: ${selectedModel} gagal (${response.status}). Memulai siklus model cadangan...`);
        setAiStatus('limited');
        
        for (const modelCandidate of availableModels) {
          if (modelCandidate === selectedModel) continue;
          console.log(`--- MENCOBA MODEL CADANGAN: ${modelCandidate} ---`);
          response = await callGemini(modelCandidate);
          if (response.ok) {
            setSelectedModel(modelCandidate);
            break;
          }
        }
      }

      if (!response.ok) {
        setAiStatus('offline');
        const errorText = await response.text();
        console.error('--- CURHATAN GOOGLE (RESPONSE) ---', errorText);
        
        if (response.status === 429) {
          toast.error('Semua jalur kuota abis Bro! Google bener-bener nyuruh istirahat.');
          throw new Error('QUOTA_EXHAUSTED');
        }
        throw new Error(`API Error: ${response.status}`);
      }

      setAiStatus('online');
      const data = await response.json();
      
      // Safety Filter Check
      if (data.promptFeedback?.blockReason) {
        console.warn('⚠️ Google me-blokir pesan karena safety filter:', data.promptFeedback.blockReason);
      }

      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 
                        (data.promptFeedback?.blockReason ? "Waduh Bro, jawaban ini dilarang sama sensor Google (Safety Filter). Coba tanya yang lain ya!" : "Aduh Bro, otak gue lagi nge-hang sebentar. Coba lagi ya!");

      // Streaming Effect Logic
      let currentText = "";
      const words = aiResponse.split(" ");
      for (let i = 0; i < words.length; i++) {
        currentText += words[i] + " ";
        setStreamingText(currentText);
        await new Promise(resolve => setTimeout(resolve, 30));
      }

      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
      setStreamingText('');

    } catch (error: any) {
      console.error('Gemini Error:', error);
      if (error.message !== 'QUOTA_EXHAUSTED') {
        toast.error('Gagal nembak Gemini, Bro! Cek Console buat detailnya.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const copyToIDE = (codeSnippet: string) => {
    // Dispatch custom event for IDEView to catch
    window.dispatchEvent(new CustomEvent('monster-ide-copy', { detail: codeSnippet }));
    toast.success('Kode terkirim ke Monster IDE, Bro!');
  };

  const renderAIInterface = () => (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className={cn(
        "shadow-2xl transition-all duration-500",
        isMaximized 
          ? "fixed inset-x-0 bottom-0 top-auto sm:inset-0 m-0 sm:m-auto w-full h-[92vh] sm:w-[95vw] sm:h-[85vh] z-[999999] ring-1 ring-cyan-500/30 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-[0_-10px_40px_rgba(0,0,0,0.4)]" 
          : "w-full h-full rounded-2xl border border-white/5"
      )}>
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
      <div className={cn(
        "flex flex-col h-full bg-white dark:bg-[#030712] transition-colors duration-300",
        isMaximized && "rounded-none sm:rounded-3xl"
      )}>
        {/* Header */}
        <div className="h-14 px-4 sm:px-6 flex items-center justify-between border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-black/80 backdrop-blur-xl z-[60] shrink-0 transition-colors duration-300">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all">
              <ChevronLeft size={18} />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                <Bot className="w-4 h-4 text-cyan-500" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-[11px] font-black text-slate-800 dark:text-white italic tracking-tighter uppercase font-mono">
                  AI Asisten PTIK
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMaximized(!isMaximized)}
              className="h-8 w-8 rounded-md text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
            >
              {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="h-8 w-8 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all sm:hidden"
            >
              <X size={18} />
            </Button>
          </div>
        </div>

      {/* Main Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col relative bg-slate-50 dark:bg-[#010409] transition-colors duration-300">
          <ScrollArea viewportRef={scrollRef} className="flex-1 p-3 sm:p-6 custom-scrollbar">
            <div className="max-w-3xl mx-auto space-y-6 pb-20">
              {messages.length === 0 && (
                <div className="h-[50vh] flex flex-col items-center justify-center text-center space-y-4">
                  <div className="p-6 bg-cyan-500/5 rounded-full border border-cyan-500/10 animate-pulse">
                    <Sparkles className="w-10 h-10 text-cyan-500" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-lg font-black text-slate-800 dark:text-white tracking-tighter uppercase italic">Halo Bro!</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[280px]">Gue AI Asisten PTIK 2026. Ada yang bisa gue bantu soal kodingan atau tugas lo hari ini?</p>
                  </div>
                </div>
              )}

              {isSynchronizing && (
                <div className="flex justify-center my-4">
                  <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-full px-4 py-1.5 flex items-center gap-2">
                    <Loader2 className="w-3 h-3 text-cyan-500 animate-spin" />
                    <span className="text-[10px] text-cyan-500 font-bold uppercase tracking-wider">
                      [SISTEM]: Sedang sinkronisasi otak AI dengan Google...
                    </span>
                  </div>
                </div>
              )}

              {messages.map((msg, index) => (
                <div key={index} className={cn(
                  "flex flex-col gap-2 max-w-[85%]",
                  msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                )}>
                    <div className={cn(
                      "max-w-[90%] sm:max-w-[85%] rounded-2xl p-4 text-sm sm:text-base leading-relaxed shadow-sm transition-all",
                      msg.role === 'user' 
                        ? "bg-sky-600 text-white rounded-tr-none ml-auto" 
                        : "bg-slate-100 dark:bg-white/5 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-200/50 dark:border-white/5"
                    )}>
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm prose-slate dark:prose-invert max-w-none">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code({ node, inline, className, children, ...props }: any) {
                              const match = /language-(\w+)/.exec(className || '');
                              const codeString = String(children).replace(/\n$/, '');
                              
                              return !inline ? (
                                <div className="group relative my-4">
                                  <div className="flex items-center justify-between px-4 py-1.5 bg-slate-100 dark:bg-black/40 border-b border-slate-200 dark:border-white/5 rounded-t-xl">
                                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">{match ? match[1] : 'code'}</span>
                                    <div className="flex gap-2">
                                      <button 
                                        onClick={() => {
                                          navigator.clipboard.writeText(codeString);
                                          toast.success('Kopi aman, Bro!');
                                        }}
                                        className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors"
                                      >
                                        <Copy size={12} />
                                      </button>
                                      <button 
                                        onClick={() => copyToIDE(codeString)}
                                        className="p-1 text-slate-400 hover:text-cyan-500 transition-colors"
                                        title="Kirim ke IDE"
                                      >
                                        <Cpu size={12} />
                                      </button>
                                    </div>
                                  </div>
                                  <pre className="m-0 p-4 bg-[#0d1117] text-slate-200 rounded-b-xl overflow-x-auto text-[12px] leading-relaxed">
                                    <code className={className} {...props}>
                                      {children}
                                    </code>
                                  </pre>
                                </div>
                              ) : (
                                <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-indigo-600 dark:text-cyan-400 font-bold" {...props}>
                                  {children}
                                </code>
                              );
                            }
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : msg.content}
                  </div>
                  <span className="text-[8px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest px-1">
                    {msg.role === 'user' ? 'Gue' : 'AI Asisten'}
                  </span>
                </div>
              ))}

              {streamingText && (
                <div className="flex flex-col gap-2 max-w-[85%] mr-auto items-start">
                  <div className="px-4 py-3 rounded-2xl text-sm sm:text-base leading-relaxed bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100 backdrop-blur-xl rounded-tl-none">
                    <div className="prose prose-sm sm:prose-base prose-slate dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingText}</ReactMarkdown>
                    </div>
                  </div>
                  <span className="text-[8px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest px-1 flex items-center gap-1.5">
                    <span className="w-1 h-1 bg-cyan-500 rounded-full animate-ping"></span>
                    Mengetik...
                  </span>
                </div>
              )}

              {isLoading && !streamingText && (
                <div className="flex gap-2 items-center text-cyan-500 text-[10px] font-black uppercase tracking-widest animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Lagi Mikir, Bro...
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 bg-white dark:bg-[#0d1117] border-t border-slate-200 dark:border-white/5 transition-colors duration-300">
            <div className="max-w-3xl mx-auto flex gap-2 p-1.5 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl shadow-inner transition-all">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Tanya soal koding atau tugas PTIK lo..."
                className="flex-1 bg-transparent px-3 py-2 text-[13px] text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none"
              />
              <Button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl h-10 w-10 p-0 shadow-lg shadow-indigo-500/20 active:scale-90 transition-all"
              >
                <Send size={18} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </motion.div>
);

  return (
    <>
      <AnimatePresence>
        {isMaximized && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[999998]"
          />
        )}
      </AnimatePresence>

      {isMaximized ? createPortal(renderAIInterface(), document.body) : renderAIInterface()}
    </>
  );
};

export default AIView;
