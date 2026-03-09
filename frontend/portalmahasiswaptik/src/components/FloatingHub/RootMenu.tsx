import React from 'react';
import { motion } from 'framer-motion';
import { Bot, Code2, MessageSquare, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RootMenuProps {
  onSelect: (view: 'CHAT' | 'AI' | 'IDE') => void;
  unreadCount: number;
}

export const RootMenu: React.FC<RootMenuProps> = ({ onSelect, unreadCount }) => {
  const menuItems = [
    {
      id: 'AI' as const,
      label: 'AI Assistant',
      desc: 'Tanya apa saja tentang perkuliahan',
      icon: <Bot className="w-6 h-6 text-cyan-400" />,
      color: 'from-cyan-500/20 to-cyan-500/5',
      borderColor: 'group-hover:border-cyan-500/50',
      glowColor: 'group-hover:shadow-cyan-500/20',
    },
    {
      id: 'IDE' as const,
      label: 'Web IDE',
      desc: 'Coba coding langsung di portal',
      icon: <Code2 className="w-6 h-6 text-emerald-400" />,
      color: 'from-emerald-500/20 to-emerald-500/5',
      borderColor: 'group-hover:border-emerald-500/50',
      glowColor: 'group-hover:shadow-emerald-500/20',
    },
    {
      id: 'CHAT' as const,
      label: 'Chat Angkatan',
      desc: 'Ngobrol bareng teman angkatan',
      icon: <MessageSquare className="w-6 h-6 text-blue-400" />,
      color: 'from-blue-500/20 to-blue-500/5',
      borderColor: 'group-hover:border-blue-500/50',
      glowColor: 'group-hover:shadow-blue-500/20',
      badge: unreadCount > 0 ? unreadCount : null,
    },
  ];

  return (
    <div className="flex flex-col h-full p-4 space-y-4">
      <div className="mb-2">
        <h3 className="text-xl font-black tracking-tight text-slate-800 dark:text-slate-100 italic uppercase">Super Hub</h3>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pilih Layanan Portal</p>
      </div>

      <div className="space-y-3">
        {menuItems.map((item) => (
          <motion.div
            key={item.id}
            whileHover={{ scale: 1.02, x: 5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(item.id)}
            className={cn(
              "group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 p-4 cursor-pointer transition-all duration-300",
              "bg-gradient-to-br bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl",
              item.color,
              item.borderColor,
              "hover:shadow-lg",
              item.glowColor
            )}
          >
            <div className="flex items-center gap-4 relative z-10">
              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-white/5 transition-transform group-hover:rotate-12">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-sm text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                    {item.label}
                  </h4>
                  {item.badge && (
                    <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-lg animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                  {item.desc}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-700 group-hover:text-slate-500 transition-colors" />
            </div>
            
            {/* Decorative background element */}
            <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-white/5 dark:bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors" />
          </motion.div>
        ))}
      </div>

      <div className="mt-auto pt-4 border-t border-slate-100 dark:border-white/5">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] text-center">PTIK Web Portal v2.0</p>
      </div>
    </div>
  );
};
