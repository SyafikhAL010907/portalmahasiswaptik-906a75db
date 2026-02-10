import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Users, ArrowLeft, Search, RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { UserProfileModal } from '@/components/dashboard/UserProfileModal';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Message {
    id: string;
    user_id: string;
    content: string;
    created_at: string;
    profiles: {
        full_name: string;
        avatar_url: string | null;
        nim: string;
        whatsapp: string | null;
        class_id: string | null;
    } | null;
}

interface MemberProfile {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
    nim: string;
    class_id: string | null;
}

export function GlobalChat() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'chat' | 'members'>('chat');
    const [messages, setMessages] = useState<Message[]>([]);
    const [members, setMembers] = useState<MemberProfile[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [hasNewMessage, setHasNewMessage] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen && viewMode === 'chat') {
            scrollToBottom();
        }
    }, [isOpen, viewMode, messages]);

    useEffect(() => {
        if (!user) return;

        if (isOpen) {
            fetchMessages();
            fetchMembers();
        }

        // REAL-TIME SUBSCRIPTION
        console.log('🔄 Initializing real-time subscription...');
        const channel = supabase
            .channel('global_chat_channel')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'public_chat_messages' },
                async (payload) => {
                    console.log('📢 New message event:', payload.new);

                    // Supaya tidak nunggu fetch profile yang lama, kita bisa fetch spesifik
                    const { data: newMessageData, error: fetchError } = await (supabase
                        .from('public_chat_messages' as any)
                        .select(`
                            id,
                            user_id,
                            content,
                            created_at,
                            profiles ( * )
                        `)
                        .eq('id', payload.new.id)
                        .single() as any);

                    if (!fetchError && newMessageData) {
                        setMessages((prev) => {
                            if (prev.some(m => m.id === newMessageData.id)) return prev;
                            const newMsgs = [...prev, newMessageData];
                            // Sort by date to be safe
                            return newMsgs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                        });

                        if (!isOpen) {
                            setHasNewMessage(true);
                        }

                        // Auto scroll saat pesan baru masuk
                        setTimeout(scrollToBottom, 100);
                    } else {
                        console.error('❌ Error fetching detail realtime message:', fetchError);
                        // Fallback: fetch ulang semua pesan jika satu pesan gagal di-fetch (jarang terjadi)
                        fetchMessages();
                    }
                }
            )
            .subscribe((status) => {
                console.log('📡 Realtime status:', status);
                if (status !== 'SUBSCRIBED') {
                    console.warn('⚠️ Realtime subscription status is not SUBSCRIBED:', status);
                }
            });

        return () => {
            console.log('🔌 Unsubscribing from realtime...');
            supabase.removeChannel(channel);
        };
    }, [user, isOpen]);

    const fetchMessages = async () => {
        setIsLoading(true);
        setErrorMsg(null);
        try {
            const { data, error } = await (supabase
                .from('public_chat_messages' as any)
                .select(`
          id,
          user_id,
          content,
          created_at,
          profiles ( * )
        `)
                .order('created_at', { ascending: true })
                .limit(50) as any);

            if (error) throw error;
            setMessages(data as any[] || []);
        } catch (err: any) {
            console.error('❌ Fetch Error:', err);
            setErrorMsg(err.message || 'Gagal memuat pesan');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchMembers = async () => {
        try {
            const { data, error } = await (supabase
                .from('profiles')
                .select('user_id, full_name, avatar_url, nim, class_id')
                .order('full_name') as any);

            if (error) throw error;
            setMembers(data as any[] || []);
        } catch (err: any) {
            console.error('❌ Members Error:', err);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const content = newMessage.trim();
        if (!content || !user || isSending) return;

        setIsSending(true);
        try {
            // 1. Insert & Fetch Detail dalam SATU trip ke DB
            // Ini akan mengembalikan data pesan lengkap beserta profile pengirim
            const { data: fullMessage, error } = await (supabase
                .from('public_chat_messages' as any)
                .insert([{ user_id: user.id, content }])
                .select(`
                    id,
                    user_id,
                    content,
                    created_at,
                    profiles ( * )
                `)
                .single() as any);

            if (error) throw error;

            if (fullMessage) {
                // Update state instan (Optimistic Update)
                setMessages((prev) => {
                    // Cek duplikasi ID (siapa tau realtime dateng duluan, meski jarang)
                    if (prev.some(m => m.id === fullMessage.id)) return prev;
                    const updated = [...prev, fullMessage];
                    // Sort by date agar urutan tetap konsisten
                    return updated.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                });
            }

            // Bersihkan input dan scroll instan
            setNewMessage('');
            setTimeout(scrollToBottom, 50);
        } catch (err: any) {
            console.error('❌ Error sending message:', err);
            toast.error('Gagal kirim: ' + err.message);
        } finally {
            setIsSending(false);
        }
    };

    const filteredMembers = members.filter(m =>
        m.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.nim?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!user) return null;

    return (
        <>
            <div className="fixed bottom-6 right-6 z-[100]">
                <Button
                    onClick={() => {
                        setIsOpen(!isOpen);
                        setHasNewMessage(false);
                        if (!isOpen) setViewMode('chat');
                    }}
                    className={cn(
                        "w-14 h-14 rounded-full shadow-2xl p-0 flex items-center justify-center transition-all duration-300",
                        "bg-gradient-to-r from-blue-500 to-purple-600 hover:scale-110 active:scale-95",
                        hasNewMessage && "animate-pulse ring-4 ring-blue-400/50"
                    )}
                >
                    {isOpen ? <X className="w-6 h-6 text-white" /> : <MessageSquare className="w-6 h-6 text-white" />}
                    {hasNewMessage && !isOpen && (
                        <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white" />
                    )}
                </Button>
            </div>

            {isOpen && (
                <div className={cn(
                    "fixed bottom-24 right-6 w-[350px] sm:w-[400px] h-[550px] max-h-[75vh] z-[100] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300",
                    "border border-slate-200 dark:border-white/10 shadow-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl"
                )}>
                    {/* Header */}
                    <div
                        onClick={() => viewMode === 'chat' && setViewMode('members')}
                        className={cn(
                            "p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-600/20 dark:to-purple-600/20 border-b border-slate-100 dark:border-white/10 flex items-center justify-between",
                            viewMode === 'chat' && "cursor-pointer hover:bg-slate-100/50 dark:hover:bg-white/5 transition-colors"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            {viewMode === 'members' ? (
                                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setViewMode('chat'); }} className="w-8 h-8 rounded-full">
                                    <ArrowLeft size={18} />
                                </Button>
                            ) : (
                                <div className="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                                    <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                            )}
                            <div>
                                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">
                                    {viewMode === 'chat' ? 'Grup Angkatan 2025' : 'Daftar Anggota'}
                                </h3>
                                <p className="text-[10px] text-slate-500 dark:text-blue-300 font-bold">
                                    {viewMode === 'chat' ? 'Aktif dalam 24 Jam' : `${members.length} Mahasiswa`}
                                </p>
                            </div>
                        </div>
                        {viewMode === 'chat' && (
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); fetchMessages(); }} className="text-slate-400">
                                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                            </Button>
                        )}
                    </div>

                    {viewMode === 'chat' ? (
                        <>
                            <ScrollArea className="flex-1 p-4" viewportRef={scrollRef}>
                                <div className="space-y-4">
                                    {errorMsg && (
                                        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-red-500 flex flex-col items-center gap-2">
                                            <AlertCircle size={24} />
                                            <p className="text-[10px] font-bold text-center leading-tight">{errorMsg}</p>
                                            <Button variant="outline" size="sm" onClick={() => fetchMessages()} className="h-7 text-[9px] font-black border-red-500/50 hover:bg-red-500/10">COBA LAGI</Button>
                                        </div>
                                    )}

                                    {messages.map((msg) => {
                                        const isOwn = msg.user_id === user.id;
                                        return (
                                            <div key={msg.id} className={cn("flex items-end gap-2", isOwn ? "flex-row-reverse" : "flex-row")}>
                                                {!isOwn && (
                                                    <button onClick={() => setSelectedUserId(msg.user_id)} className="transition-transform hover:scale-110 active:scale-90 mb-1">
                                                        <Avatar className="w-8 h-8 border border-slate-100 dark:border-white/10 ring-2 ring-blue-500/10">
                                                            <AvatarImage src={msg.profiles?.avatar_url || ''} className="object-cover" />
                                                            <AvatarFallback className="bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-blue-600">
                                                                {msg.profiles?.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?'}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                    </button>
                                                )}

                                                <div className={cn(
                                                    "max-w-[80%] px-4 py-2.5 rounded-2xl text-[13px] relative shadow-sm",
                                                    isOwn
                                                        ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-tr-none text-right"
                                                        : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-200/50 dark:border-white/5 text-left"
                                                )}>
                                                    {!isOwn && (
                                                        <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 mb-1 uppercase tracking-tighter">
                                                            {msg.profiles?.full_name || 'Anonymous'}
                                                        </p>
                                                    )}
                                                    <p className="leading-relaxed font-medium break-words">{msg.content}</p>
                                                    <p className={cn("text-[8px] mt-1 font-bold opacity-50", isOwn ? "text-right" : "text-left")}>
                                                        {format(new Date(msg.created_at), 'HH:mm')}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                    {!isLoading && messages.length === 0 && !errorMsg && (
                                        <div className="flex flex-col items-center justify-center min-h-[300px] opacity-20 grayscale py-10">
                                            <MessageSquare size={48} className="mb-4" />
                                            <p className="text-xs font-black uppercase tracking-widest">Belum Ada Sapaan</p>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>

                            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/50">
                                <div className="flex gap-2">
                                    <Input
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage(e as any);
                                            }
                                        }}
                                        placeholder="Tulis sesuatu..."
                                        className="bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 h-11 rounded-2xl text-sm"
                                    />
                                    <Button type="submit" disabled={!newMessage.trim() || isSending} className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl w-11 h-11 p-0 flex shadow-lg">
                                        <Send size={18} className="text-white" />
                                    </Button>
                                </div>
                            </form>
                        </>
                    ) : (
                        <>
                            <div className="p-4 border-b border-slate-100 dark:border-white/10">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input placeholder="Cari teman..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 h-10 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-sm" />
                                </div>
                            </div>
                            <ScrollArea className="flex-1">
                                <div className="p-2 space-y-1">
                                    {filteredMembers.map((member) => (
                                        <button
                                            key={member.user_id}
                                            onClick={() => setSelectedUserId(member.user_id)}
                                            className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-100/50 dark:hover:bg-white/5 transition-all text-left group"
                                        >
                                            <Avatar className="w-10 h-10 border border-slate-100 dark:border-white/10">
                                                <AvatarImage src={member.avatar_url || ''} className="object-cover" />
                                                <AvatarFallback className="bg-slate-100 dark:bg-slate-800 text-xs font-black text-blue-600 uppercase">
                                                    {member.full_name?.split(' ').map((n: any) => n[0]).join('').substring(0, 2) || '?'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-black text-slate-800 dark:text-white truncate group-hover:text-blue-600 transition-colors uppercase">{member.full_name}</p>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase">{member.nim}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </ScrollArea>
                        </>
                    )}
                </div>
            )}

            <UserProfileModal userId={selectedUserId} isOpen={!!selectedUserId} onClose={() => setSelectedUserId(null)} />
        </>
    );
}
