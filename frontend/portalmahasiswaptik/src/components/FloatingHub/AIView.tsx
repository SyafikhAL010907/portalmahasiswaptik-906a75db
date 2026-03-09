import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  ChevronLeft,
  Sparkles,
  Send,
  Trash2,
  Maximize2,
  Minimize2,
  Copy,
  Code as CodeIcon,
  Sidebar as SidebarIcon,
  Loader2,
  Terminal,
  Cpu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [history, setHistory] = useState<string[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>("gemini-1.5-flash");
  const [isSynchronizing, setIsSynchronizing] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
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
        
        // Auto-Selector Logic
        const hasFlash = data.models.find((m: any) => m.name.includes('gemini-1.5-flash'));
        const hasPro = data.models.find((m: any) => m.name.includes('gemini-pro'));
        
        if (hasFlash) {
          setSelectedModel(hasFlash.name.replace('models/', ''));
          console.log('✅ AUTO-SELECTED: Gemini 1.5 Flash');
        } else if (hasPro) {
          setSelectedModel(hasPro.name.replace('models/', ''));
          console.log('⚠️ FALLBACK: Gemini Pro selected');
        } else if (data.models.length > 0) {
          setSelectedModel(data.models[0].name.replace('models/', ''));
          console.log(`⚠️ EMERGENCY FALLBACK: ${data.models[0].name} selected`);
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
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;

      const systemInstruction = "Asisten Senior PTIK 2025 yang jago koding, ahli jaringan, dan asik diajak diskusi soal tugas kuliah. Gunakan bahasa yang santai tapi profesional, sering panggil 'Bro'. Fokus pada solusi teknis yang akurat.";

      console.log('--- MONSTER BRAIN DEBUG V.7 (DIAGNOSTIC AUTO-SELECTOR) ---');
      console.log('Model Active:', selectedModel);

      const response = await fetch(endpoint.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemInstruction}\n\nUser: ${userMessage}` }] }]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('--- CURHATAN GOOGLE (RESPONSE) ---', errorText);
        
        let errorData;
        try { errorData = JSON.parse(errorText); } catch(e) {}

        if (response.status === 429) {
          toast.error('Gawat Bro, Quota Limit! Google bilang istirahat dulu (429). Coba lagi semenit lagi ya!');
          throw new Error('QUOTA_EXHAUSTED');
        }
        
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "Aduh Bro, otak gue lagi nge-hang sebentar. Coba lagi ya!";

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

  const renderMessageContent = (content: string) => {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');
            return match ? (
              <div className="relative group my-4">
                <div className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 bg-black/50 backdrop-blur-md text-sky-400 hover:text-sky-300"
                    onClick={() => copyToIDE(codeString)}
                  >
                    <Terminal size={14} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 bg-black/50 backdrop-blur-md text-white/50 hover:text-white"
                    onClick={() => {
                      navigator.clipboard.writeText(codeString);
                      toast.success('Disalin ke clipboard!');
                    }}
                  >
                    <Copy size={14} />
                  </Button>
                </div>
                <div className="bg-[#0d1117] rounded-xl border border-white/10 overflow-hidden">
                  <div className="px-4 py-1.5 bg-white/5 border-b border-white/5 flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-sky-500/50 tracking-widest">{match[1]}</span>
                  </div>
                  <pre className={cn("p-4 text-xs font-mono overflow-x-auto", className)}>
                    <code>{children}</code>
                  </pre>
                </div>
              </div>
            ) : (
              <code className="bg-sky-500/10 text-sky-400 px-1.5 py-0.5 rounded-md font-mono text-[11px]" {...props}>
                {children}
              </code>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    );
  };

  const renderAIInterface = () => (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className={cn(
        "bg-[#030712] overflow-hidden flex flex-col shadow-2xl transition-all duration-500",
        isMaximized ? "fixed inset-0 m-auto w-[95vw] h-[85vh] z-[999999] rounded-3xl ring-1 ring-cyan-500/30" : "w-full h-full rounded-2xl border border-white/5"
      )}
    >
      {/* Header */}
      <div className="bg-[#0f172a]/95 backdrop-blur-xl px-4 py-3 flex items-center justify-between border-b border-cyan-500/20 shrink-0 z-[60]">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 rounded-full text-slate-400 hover:text-white hover:bg-white/5 transition-all">
            <ChevronLeft size={18} />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
              <Bot className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-[11px] font-black text-white italic tracking-tighter uppercase font-mono">
                AI Asisten PTIK
              </h1>
              <p className="text-[8px] font-bold text-cyan-500/60 uppercase tracking-widest flex items-center gap-1">
                <span className="w-1 h-1 bg-cyan-500 rounded-full animate-pulse"></span>
                AI Asisten PTIK
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={cn("h-7 w-7 rounded-md text-slate-400 hover:text-white hover:bg-white/5", isSidebarOpen && "text-cyan-400")}
          >
            <SidebarIcon size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMaximized(!isMaximized)}
            className="h-7 w-7 rounded-md text-slate-400 hover:text-white hover:bg-white/5"
          >
            {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </Button>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar History */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 220, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-r border-white/5 bg-black/20 hidden md:flex flex-col"
            >
              <div className="p-4 flex flex-col gap-4">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Chat History</span>
                <ScrollArea className="h-[calc(85vh-150px)]">
                  <div className="space-y-2 pr-4">
                    {history.map((h, i) => (
                      <div key={i} className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-[10px] text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer transition-all line-clamp-2">
                        {h}
                      </div>
                    ))}
                    {history.length === 0 && (
                      <p className="text-[9px] text-slate-600 italic">Belum ada obrolan...</p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col relative bg-[#010409]">
          <ScrollArea viewportRef={scrollRef} className="flex-1 p-4 sm:p-6">
            <div className="max-w-3xl mx-auto space-y-6 pb-20">
              {messages.length === 0 && (
                <div className="h-[50vh] flex flex-col items-center justify-center text-center space-y-4">
                  <div className="p-6 bg-cyan-500/5 rounded-full border border-cyan-500/10 animate-pulse">
                    <Sparkles className="w-10 h-10 text-cyan-500" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-lg font-black text-white tracking-tighter uppercase italic">Halo Bro!</h2>
                    <p className="text-xs text-slate-500 max-w-[280px]">Gue AI Asisten PTIK 2026. Ada yang bisa gue bantu soal kodingan atau tugas lo hari ini?</p>
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
                    "px-4 py-3 rounded-2xl text-[13px] leading-relaxed",
                    msg.role === 'user'
                      ? "bg-cyan-600 text-white rounded-tr-none shadow-[0_0_20px_rgba(8,145,178,0.2)]"
                      : "bg-white/5 border border-white/10 text-slate-100 backdrop-blur-xl rounded-tl-none"
                  )}>
                    {msg.role === 'assistant' ? renderMessageContent(msg.content) : msg.content}
                  </div>
                  <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest px-1">
                    {msg.role === 'user' ? 'Gue' : 'AI Asisten'}
                  </span>
                </div>
              ))}

              {streamingText && (
                <div className="flex flex-col gap-2 max-w-[85%] mr-auto items-start">
                  <div className="px-4 py-3 rounded-2xl text-[13px] leading-relaxed bg-white/5 border border-white/10 text-slate-100 backdrop-blur-xl rounded-tl-none">
                    {renderMessageContent(streamingText)}
                  </div>
                  <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest px-1 flex items-center gap-1.5">
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
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#010409] to-transparent z-50">
            <div className="max-w-3xl mx-auto flex gap-2 p-1.5 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-2xl ring-1 ring-white/5 shadow-2xl">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Tanya soal koding atau tugas PTIK lo..."
                className="flex-1 bg-transparent px-3 py-2 text-[13px] text-white placeholder:text-slate-600 outline-none"
              />
              <Button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl h-10 w-10 p-0 shadow-lg shadow-cyan-500/20 active:scale-90 transition-all"
              >
                <Send size={18} />
              </Button>
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
