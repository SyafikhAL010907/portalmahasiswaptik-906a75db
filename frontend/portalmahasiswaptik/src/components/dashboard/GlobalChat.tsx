import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MessageSquare, Send, X, Users, ArrowLeft, Search, CheckCheck, Loader2, Trash2, User as UserIcon, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import { format } from 'date-fns';
import { toast } from 'sonner';
import { UserProfileModal } from '@/components/dashboard/UserProfileModal';

interface Message {
    id: string;
    user_id: string;
    recipient_id: string | null;
    content: string;
    created_at: string;
    is_read: boolean;
    profiles: {
        full_name: string;
        avatar_url: string | null;
        nim: string;
        whatsapp: string | null;
        class_id: string | null;
        role: string | null;
    } | null;
}

interface MemberProfile {
    user_id: string;
    room_id: string; // Virtual property for grouping
    full_name: string;
    avatar_url: string | null;
    nim: string;
    class_id: string | null;
    role: string | null;
    last_message?: string | null;
    last_message_at?: string | null;
    unread_count?: number;
}

type ChatType = 'GROUP' | 'PRIVATE';

interface ActiveChat {
    id: string;
    room_id: string; // Virtual property for matching
    name: string;
    type: ChatType;
    avatar_url?: string | null;
    role?: string | null;
}

export function GlobalChat() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<'LIST' | 'ROOM'>('LIST');
    const [activeChat, setActiveChat] = useState<ActiveChat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [recentChats, setRecentChats] = useState<MemberProfile[]>([]);
    const [searchResults, setSearchResults] = useState<MemberProfile[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingList, setIsLoadingList] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [hasNewMessage, setHasNewMessage] = useState(false);
    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
    const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
    const [isGroupMembersOpen, setIsGroupMembersOpen] = useState(false);
    const [allMembers, setAllMembers] = useState<MemberProfile[]>([]);
    const [isLoadingMembers, setIsLoadingMembers] = useState(false);
    const [groupUnreadCount, setGroupUnreadCount] = useState(0);
    const [lastActiveChatId, setLastActiveChatId] = useState<string | null>(null);
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

    const LS_GROUP_READ_KEY = `last_read_group_at_${user?.id}`;

    const scrollRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const readChatIds = useRef<Set<string>>(new Set());

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    };

    const totalUnread = useMemo(() => {
        const privateUnread = recentChats.reduce((sum, chat) => sum + (chat.unread_count || 0), 0);
        return privateUnread + groupUnreadCount;
    }, [recentChats, groupUnreadCount]);

    // ==========================================
    // PRESENCE: REAL-TIME ONLINE STATUS
    // ==========================================
    useEffect(() => {
        if (!user?.id) return;

        const presenceChannel = supabase.channel('online-users');

        presenceChannel
            .on('presence', { event: 'sync' }, () => {
                const newState = presenceChannel.presenceState();
                const onlineIds = new Set<string>();

                // Extract user_ids from presence state
                for (const key in newState) {
                    const users = newState[key];
                    if (Array.isArray(users)) {
                        users.forEach((u: any) => {
                            if (u.user_id) onlineIds.add(String(u.user_id));
                        });
                    }
                }
                setOnlineUsers(onlineIds);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await presenceChannel.track({ user_id: user.id });
                }
            });

        return () => {
            supabase.removeChannel(presenceChannel);
        };
    }, [user?.id]);

    // Fetch current user profile for input area
    useEffect(() => {
        if (user) {
            fetchCurrentUserProfile();
        }
    }, [user]);

    const fetchCurrentUserProfile = async () => {
        try {
            const { data } = await (supabase
                .from('profiles')
                .select('user_id, full_name, avatar_url, nim, class_id, role')
                .eq('user_id', user?.id)
                .single() as any);
            console.log('CURRENT USER ROLE (Explicit):', data?.role);
            setCurrentUserProfile(data);
        } catch (err) {
            console.error('Fetch current user profile error:', err);
        }
    };

    // Initial load: Fetch recent chats and refresh profile
    useEffect(() => {
        if (user && isOpen) {
            fetchCurrentUserProfile();
            // Hanya fetch saat pertama kali dibuka atau jika list kosong
            if (recentChats.length === 0 && !searchTerm) {
                fetchRecentChats();
            }
        }
        if (!isOpen) {
            setSearchTerm('');
            setSearchResults([]);
        }
    }, [user, isOpen]);

    // Search logic
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchTerm.trim()) {
                searchProfiles(searchTerm);
            } else {
                setSearchResults([]);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    // --- UPDATE LOGIC DISINI (Real-time listener) ---
    // ==========================================
    // UPDATE V16: REAL-TIME GLOBAL & AUTO-ADD CONTACT
    // ==========================================
    useEffect(() => {
        if (!user?.id) return;

        const globalChannel = supabase
            .channel('global-chat-sync') // Nama channel unik agar stabil
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages' },
                async (payload) => {
                    const newMsg = payload.new as any;
                    const isMe = String(newMsg.user_id) === String(user.id);

                    // Tentukan target lobi (Room ID)
                    const msgRoomId = newMsg.recipient_id === null
                        ? 'public-group'
                        : (newMsg.recipient_id === user.id ? newMsg.user_id : newMsg.recipient_id);

                    // 1. UPDATE LOBI SECARA INSTAN
                    setRecentChats(prev => {
                        const exists = prev.some(c => c.room_id === msgRoomId);

                        // JIKA ORANG BARU CHAT: Tarik data terbaru biar nama dia muncul di lobi
                        if (!exists && !isMe) {
                            fetchRecentChats(false); // Silent fetch
                            return prev;
                        }

                        // JIKA SUDAH ADA: Update teks dan angka notif
                        return prev.map(chat => {
                            if (chat.room_id === msgRoomId) {
                                const isRoomActive = (activeChat?.room_id === msgRoomId);
                                const shouldIncrement = !isMe && !isRoomActive;

                                return {
                                    ...chat,
                                    unread_count: shouldIncrement ? (chat.unread_count || 0) + 1 : (isMe ? chat.unread_count : 0),
                                    last_message: newMsg.message_type === 'image' ? '📷 Foto' : newMsg.content,
                                    last_message_at: newMsg.created_at
                                };
                            }
                            return chat;
                        }).sort((a, b) => {
                            // Selalu pindahkan chat terbaru ke urutan paling atas
                            const timeA = a.room_id === msgRoomId ? new Date().getTime() : new Date(a.last_message_at || 0).getTime();
                            const timeB = b.room_id === msgRoomId ? new Date().getTime() : new Date(b.last_message_at || 0).getTime();
                            return timeB - timeA;
                        });
                    });

                    // 2. Notifikasi Grup
                    if (msgRoomId === 'public-group' && !isMe && activeChat?.room_id !== 'public-group') {
                        setGroupUnreadCount(prev => prev + 1);
                    }

                    // 3. Trigger titik merah di tombol portal (Floating Button)
                    if (!isMe) setHasNewMessage(true);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(globalChannel);
        };
        // Dependency diperkecil agar koneksi tidak sering terputus
    }, [user?.id, activeChat?.room_id]);
    // ==========================================
    // V11: Polling Fallback (Backup WebSocket)
    useEffect(() => {
        if (!user || !isOpen) return;

        const interval = setInterval(() => {
            if (view === 'LIST') {
                fetchRecentChats(false);
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [user, isOpen, view]);

    useEffect(() => {
        if (!user || !isOpen || !activeChat || view !== 'ROOM') return;

        fetchMessages();

        const channel = supabase
            .channel(`chat_room_${activeChat.id}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages' },
                async (payload) => {
                    const newMsg = payload.new as any;
                    let isRelevant = false;

                    if (activeChat.type === 'GROUP') {
                        isRelevant = newMsg.recipient_id === null;
                    } else {
                        isRelevant = (newMsg.user_id === user.id && newMsg.recipient_id === activeChat.id) ||
                            (newMsg.user_id === activeChat.id && newMsg.recipient_id === user.id);
                    }

                    if (isRelevant) {
                        const { data: msgWithProfile } = await (supabase
                            .from('messages' as any)
                            .select('*, profiles(user_id, full_name, avatar_url, role, nim, class_id, whatsapp)')
                            .eq('id', newMsg.id)
                            .single() as any);

                        if (msgWithProfile) {
                            setMessages(prev => {
                                if (prev.some(m => m.id === msgWithProfile.id)) return prev;
                                return [...prev, msgWithProfile as any].sort((a, b) =>
                                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                                );
                            });
                            setTimeout(scrollToBottom, 50);
                        }
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'messages' },
                (payload) => {
                    setMessages((prev) => prev.filter((msg) => msg.id !== payload.old.id));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, isOpen, activeChat, view]);

    const fetchRecentChats = async (showLoading = true) => {
        if (!user) return;
        if (showLoading) setIsLoadingList(true);
        try {
            const lastReadGroup = localStorage.getItem(LS_GROUP_READ_KEY) || new Date(0).toISOString();
            const { count: gCount } = await (supabase
                .from('messages' as any)
                .select('*', { count: 'exact', head: true })
                .is('recipient_id', null)
                .neq('user_id', user.id)
                .gt('created_at', lastReadGroup) as any);
            setGroupUnreadCount(gCount || 0);

            const { data: sentMessages } = await (supabase
                .from('messages' as any)
                .select('recipient_id')
                .eq('user_id', user.id)
                .not('recipient_id', 'is', null) as any);

            const { data: receivedMessages } = await (supabase
                .from('messages' as any)
                .select('user_id')
                .eq('recipient_id', user.id) as any);

            const interactedIds = new Set([
                ...(sentMessages?.map((m: any) => m.recipient_id) || []),
                ...(receivedMessages?.map((m: any) => m.user_id) || [])
            ]);

            const uniqueIds = Array.from(interactedIds).filter(id => !!id);

            if (uniqueIds.length > 0) {
                const { data: profiles, error } = await (supabase
                    .from('profiles')
                    .select('user_id, full_name, avatar_url, role, nim, class_id')
                    .in('user_id', uniqueIds) as any);

                if (error) throw error;

                const enrichedProfiles = await Promise.all((profiles || []).map(async (p: any) => {
                    const { data: lastMsg } = await (supabase
                        .from('messages' as any)
                        .select('content, created_at, message_type, is_read')
                        .or(`and(user_id.eq.${user.id},recipient_id.eq.${p.user_id}),and(user_id.eq.${p.user_id},recipient_id.eq.${user.id})`)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single() as any);

                    const { count: unreadCount } = await (supabase
                        .from('messages' as any)
                        .select('*', { count: 'exact', head: true })
                        .eq('user_id', p.user_id)
                        .eq('recipient_id', user.id)
                        .eq('is_read', false)
                        .neq('user_id', user.id) as any);

                    const isRecentlyOpened = (lastActiveChatId && String(p.user_id) === String(lastActiveChatId)) ||
                        readChatIds.current.has(String(p.user_id));
                    const effectiveUnread = isRecentlyOpened ? 0 : (unreadCount || 0);

                    return {
                        ...p,
                        room_id: p.user_id,
                        last_message: lastMsg?.message_type === 'image' ? '📷 Foto' : lastMsg?.content,
                        last_message_at: lastMsg?.created_at,
                        unread_count: effectiveUnread
                    };
                }));

                const sorted = enrichedProfiles.sort((a, b) => {
                    const dateA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
                    const dateB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
                    return dateB - dateA;
                });

                setRecentChats(sorted);
            } else {
                setRecentChats([]);
            }
        } catch (err) {
            console.error('Fetch recent chats error:', err);
        } finally {
            setIsLoadingList(false);
        }
    };

    const searchProfiles = async (term: string) => {
        setIsLoadingList(true);
        try {
            const { data, error } = await (supabase
                .from('profiles')
                .select('user_id, full_name, avatar_url, role, nim, class_id')
                .or(`full_name.ilike.%${term}%,nim.ilike.%${term}%`)
                .limit(10) as any);

            if (error) throw error;
            const mappedResults = (data as any[] || []).map(p => ({
                ...p,
                room_id: p.user_id
            }));
            setSearchResults(mappedResults);
        } catch (err) {
            console.error('Search error:', err);
        } finally {
            setIsLoadingList(false);
        }
    };

    const fetchMessages = async () => {
        if (!activeChat || !user) return;
        setIsLoading(true);
        try {
            let query = (supabase
                .from('messages' as any)
                .select('*, profiles(user_id, full_name, avatar_url, role, nim, class_id, whatsapp)') as any);

            if (activeChat.type === 'GROUP') {
                query = query.is('recipient_id', null);
            } else {
                query = query.or(`and(user_id.eq.${user.id},recipient_id.eq.${activeChat.id}),and(user_id.eq.${activeChat.id},recipient_id.eq.${user.id})`);
                await markAsRead(activeChat.id);
            }

            const { data, error } = await (query.order('created_at', { ascending: true }).limit(100) as any);
            if (error) throw error;
            setMessages((data as any[]) || []);
            setTimeout(scrollToBottom, 50);
        } catch (err) {
            console.error('Fetch messages error:', err);
            toast.error('Gagal memuat pesan');
        } finally {
            setIsLoading(false);
        }
    };

    const markAsRead = async (partnerId: string) => {
        if (!user || !partnerId) return;

        setRecentChats(prev => prev.map(chat =>
            (String(chat.user_id) === String(partnerId) || String((chat as any).id) === String(partnerId))
                ? { ...chat, unread_count: 0 }
                : chat
        ));

        try {
            await (supabase
                .from('messages' as any)
                .update({ is_read: true })
                .eq('user_id', partnerId)
                .eq('recipient_id', user.id)
                .eq('is_read', false)
                .select() as any);
        } catch (err) {
            console.error('Mark as read exception:', err);
        }
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const content = newMessage.trim();
        if (!content || !user || !activeChat || isSending) return;

        setIsSending(true);
        try {
            const payload = {
                user_id: user.id,
                recipient_id: activeChat.type === 'GROUP' ? null : activeChat.id,
                content
            };

            const { data, error } = await (supabase
                .from('messages' as any)
                .insert([payload])
                .select('*, profiles(user_id, full_name, avatar_url, role, nim, class_id, whatsapp)')
                .single() as any);

            if (error) throw error;

            if (data) {
                setMessages(prev => [...prev, data]);
                setNewMessage('');
                setTimeout(scrollToBottom, 50);
            }
        } catch (err: any) {
            console.error('handleSendMessage error:', err);
            toast.error('Gagal mengirim pesan.');
        } finally {
            setIsSending(false);
        }
    };

    const deleteConversation = async (targetId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user) return;

        const confirmDelete = window.confirm('Hapus seluruh percakapan ini secara permanen?');
        if (!confirmDelete) return;

        try {
            const { error } = await (supabase
                .from('messages' as any)
                .delete()
                .or(`and(user_id.eq.${user.id},recipient_id.eq.${targetId}),and(user_id.eq.${targetId},recipient_id.eq.${user.id})`) as any);

            if (error) throw error;

            toast.success('Percakapan dihapus');
            setRecentChats(prev => prev.filter(c => c.user_id !== targetId));
            if (activeChat?.id === targetId) {
                setView('LIST');
                setActiveChat(null);
            }
        } catch (err) {
            console.error('Delete conversation error:', err);
            toast.error('Gagal menghapus percakapan');
        }
    };

    const openRoom = (chat: ActiveChat) => {
        const targetId = chat.id || (chat as any).user_id || (chat as any).participant_id;
        setLastActiveChatId(String(targetId));
        readChatIds.current.add(String(targetId));
        if (chat.room_id) readChatIds.current.add(String(chat.room_id));

        setRecentChats(prev => prev.map(item => {
            const currentChatItemId = item.user_id || (item as any).id || (item as any).participant_id;
            const isMatchUser = (targetId && currentChatItemId && String(targetId) === String(currentChatItemId));
            const isMatchRoom = (chat.room_id && item.room_id === chat.room_id);

            if (isMatchUser || isMatchRoom) {
                return { ...item, unread_count: 0 };
            }
            return item;
        }));

        if (chat.type === 'GROUP') {
            setGroupUnreadCount(0);
            localStorage.setItem(LS_GROUP_READ_KEY, new Date().toISOString());
        } else {
            markAsRead(chat.id);
        }

        setActiveChat(chat);
        setView('ROOM');
        setMessages([]);
        if (chat.type === 'GROUP') {
            fetchAllMembers();
        }
    };

    const fetchAllMembers = async () => {
        setIsLoadingMembers(true);
        try {
            const { data, error } = await (supabase
                .from('profiles')
                .select('user_id, full_name, avatar_url, nim, class_id, role')
                .order('full_name') as any);

            if (error) throw error;
            setAllMembers(data || []);
        } catch (err) {
            console.error('Error fetching group members:', err);
            toast.error('Gagal memuat daftar anggota');
        } finally {
            setIsLoadingMembers(false);
        }
    };

    const getUserRole = (role: string | null | undefined) => {
        const raw = (role || '').trim();
        const r = raw.toLowerCase();
        if (r === 'admin_kelas') return { label: 'ADMIN', color: 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 shadow-sm' };
        if (r === 'admin_dosen' || r === 'dosen') return { label: 'DOSEN', color: 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' };
        if (r === 'admin_dev') return { label: 'ADMINDEV', color: 'bg-red-700 text-white border border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)] font-black' };
        return { label: 'MAHASISWA', color: 'bg-blue-500/10 text-blue-500 border border-blue-500/20' };
    };

    const getRoleBadge = (role: string | null) => {
        const { label, color } = getUserRole(role);
        return (
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-black tracking-tighter uppercase", color)}>
                {label}
            </span>
        );
    };

    if (!user) return null;

    return (
        <>
            {!isOpen && (
                <div className="fixed bottom-6 right-6 z-[100]">
                    <Button
                        onClick={() => { setIsOpen(true); setHasNewMessage(false); }}
                        className={cn(
                            "w-14 h-14 rounded-full shadow-2xl p-0 flex items-center justify-center transition-all duration-300",
                            "bg-indigo-600 hover:bg-indigo-700 hover:scale-110 active:scale-95",
                            hasNewMessage && "animate-pulse ring-4 ring-indigo-400/50"
                        )}
                    >
                        <MessageSquare className="w-6 h-6 text-white" />
                        {totalUnread > 0 && (
                            <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black text-white shadow-lg animate-in zoom-in duration-300">
                                {totalUnread > 99 ? '99+' : totalUnread}
                            </span>
                        )}
                    </Button>
                </div>
            )}

            <Dialog open={isGroupMembersOpen} onOpenChange={setIsGroupMembersOpen}>
                <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden bg-white dark:bg-slate-950 border-white/10 shadow-2xl sm:rounded-3xl h-full sm:h-[500px] max-sm:max-w-none max-sm:w-full max-sm:rounded-none z-[1050] flex flex-col">
                    <div className="bg-white dark:bg-slate-900 px-6 py-5 flex items-center justify-between border-b border-slate-100 dark:border-white/5 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/10 rounded-xl">
                                <Users className="w-5 h-5 text-indigo-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black tracking-tight text-slate-800 dark:text-slate-100 uppercase">Anggota Grup</h3>
                                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{allMembers.length} Personel Terdaftar</p>
                            </div>
                        </div>
                    </div>
                    <ScrollArea className="flex-1 p-2">
                        <div className="space-y-1 p-2">
                            {isLoadingMembers ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3">
                                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Menghubungkan...</p>
                                </div>
                            ) : (
                                allMembers.map((member) => {
                                    const { label, color } = getUserRole(member.role);
                                    return (
                                        <div
                                            key={member.user_id}
                                            onClick={() => { setIsGroupMembersOpen(false); setSelectedProfileId(member.user_id); }}
                                            className="group flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-all active:scale-[0.98]"
                                        >
                                            <Avatar className="w-11 h-11 border-2 border-transparent group-hover:border-indigo-500/30 transition-all shadow-sm">
                                                <AvatarImage src={member.avatar_url || ''} className="object-cover" />
                                                <AvatarFallback className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-black uppercase">
                                                    {member.full_name?.substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <h4 className="font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors uppercase tracking-tight text-sm leading-tight">
                                                        {member.full_name}
                                                    </h4>
                                                    <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-black tracking-tighter uppercase", color)}>
                                                        {label}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-tight text-left">Available</p>
                                            </div>
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                <ChevronRight className="w-4 h-4 text-slate-300" />
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>

            {isOpen && (
                <div className={cn(
                    "fixed bottom-24 right-6 w-[350px] sm:w-[400px] h-[600px] max-h-[80vh] z-[100] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300",
                    "bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl backdrop-blur-xl",
                    "max-sm:right-0 max-sm:left-0 max-sm:mx-auto max-sm:w-full max-sm:h-[100dvh] max-sm:max-h-none max-sm:bottom-0 max-sm:rounded-none max-sm:border-none"
                )}>
                    {view === 'LIST' ? (
                        <div className="flex flex-col h-full">
                            <div className="bg-white dark:bg-slate-900 px-4 py-4 flex items-center justify-between border-b border-slate-100 dark:border-white/5 shrink-0">
                                <h3 className="text-xl font-black tracking-tight text-slate-800 dark:text-slate-100 italic">PORTAL CHAT</h3>
                                <div className="flex items-center gap-3">
                                    <Button
                                        variant="ghost" size="icon"
                                        className="h-8 w-8 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                                        onClick={() => { setIsOpen(false); setActiveChat(null); }}
                                    >
                                        <X size={20} />
                                    </Button>
                                </div>
                            </div>

                            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 flex items-center border-b border-slate-100 dark:border-white/5 shrink-0">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                                    <Input
                                        placeholder="Cari orang baru atau grup..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 h-11 bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-sm focus-visible:ring-indigo-500/50 placeholder:text-slate-500"
                                    />
                                </div>
                            </div>

                            <ScrollArea className="flex-1">
                                <div className="flex flex-col">
                                    {!searchTerm && (
                                        <div
                                            key="public-group"
                                            onClick={() => {
                                                setGroupUnreadCount(0);
                                                localStorage.setItem(LS_GROUP_READ_KEY, new Date().toISOString());
                                                openRoom({ id: 'public-group', room_id: 'public-group', name: 'Grup Angkatan 2025', type: 'GROUP' });
                                            }}
                                            className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-left group border-b border-slate-100 dark:border-white/5 cursor-pointer"
                                        >
                                            <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                                                <Users size={24} />
                                            </div>
                                            <div className="flex-1 min-w-0 pr-2">
                                                <div className="flex justify-between items-center mb-0.5">
                                                    <h4 className="font-bold text-slate-800 dark:text-slate-100 truncate uppercase tracking-tight">Grup Angkatan 2025</h4>
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-black">PUBLIC</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex-1">Saluran komunikasi utama angkatan</p>
                                                    {groupUnreadCount > 0 && (
                                                        <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-[10px] font-black text-white shadow-lg shadow-red-500/30 animate-in zoom-in duration-300 ml-2">
                                                            {groupUnreadCount}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {isLoadingList ? (
                                        <div className="p-10 flex flex-col items-center gap-2 text-slate-400 dark:text-slate-500">
                                            <Loader2 className="animate-spin w-8 h-8 text-indigo-500" />
                                            <p className="text-xs font-black uppercase tracking-widest">Searching Pulse...</p>
                                        </div>
                                    ) : (
                                        (searchTerm ? searchResults : recentChats).map((member, idx) => (
                                            <div
                                                key={member.user_id}
                                                onClick={() => {
                                                    markAsRead(member.user_id);
                                                    setRecentChats(prev => prev.map(c =>
                                                        (c.user_id === member.user_id || (c as any).id === member.user_id) ? { ...c, unread_count: 0 } : c
                                                    ));
                                                    openRoom({
                                                        id: member.user_id,
                                                        room_id: member.room_id,
                                                        name: member.full_name,
                                                        type: 'PRIVATE',
                                                        avatar_url: member.avatar_url,
                                                        role: member.role
                                                    });
                                                }}
                                                className={cn(
                                                    "w-full flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-left group cursor-pointer",
                                                    idx !== (searchTerm ? searchResults : recentChats).length - 1 && "border-b border-slate-100 dark:border-white/5"
                                                )}
                                            >
                                                <div onClick={(e) => { e.stopPropagation(); setSelectedProfileId(member.user_id); }} className="relative cursor-pointer">
                                                    <Avatar className="w-12 h-12 border border-slate-200 dark:border-white/10 group-hover:border-indigo-500/30 transition-colors">
                                                        <AvatarImage src={member.avatar_url || ''} className="object-cover" />
                                                        <AvatarFallback className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-xs">
                                                            {member.full_name?.substring(0, 2)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start mb-0.5">
                                                        <h4 className="font-bold text-slate-800 dark:text-slate-100 truncate uppercase tracking-tight text-sm leading-tight flex-1 pr-2">
                                                            {member.full_name}
                                                        </h4>
                                                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 whitespace-nowrap">
                                                            {member.last_message_at ? format(new Date(member.last_message_at), 'HH:mm') : ''}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-end">
                                                        <div className="flex-1 min-w-0 pr-2">
                                                            <p className={cn(
                                                                "text-xs truncate text-left transition-colors",
                                                                (member.unread_count && member.unread_count > 0)
                                                                    ? "text-slate-900 dark:text-slate-200 font-bold"
                                                                    : "text-slate-500 dark:text-slate-500 font-medium"
                                                            )}>
                                                                {member.last_message || 'Belum ada pesan'}
                                                            </p>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-1 shrink-0">
                                                            {member.unread_count && member.unread_count > 0 ? (
                                                                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-[10px] font-black text-white shadow-lg shadow-green-500/30 animate-in zoom-in duration-300">
                                                                    {member.unread_count}
                                                                </div>
                                                            ) : (
                                                                (() => {
                                                                    const { label, color } = getUserRole(member.role);
                                                                    return (
                                                                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-black tracking-tighter uppercase", color)}>
                                                                            {label}
                                                                        </span>
                                                                    );
                                                                })()
                                                            )}
                                                            {!searchTerm && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); deleteConversation(member.user_id, e); }}
                                                                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all -mb-1 -mr-1"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}

                                    {!isLoadingList && (searchTerm ? searchResults : recentChats).length === 0 && (
                                        <div className="p-10 text-center flex flex-col items-center gap-4">
                                            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-400 dark:text-slate-700">
                                                <UserIcon size={32} />
                                            </div>
                                            <p className="text-sm text-slate-500 dark:text-slate-500 font-medium italic">
                                                {searchTerm ? 'Agen tidak ditemukan' : 'Belum ada riwayat pesan'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
                            <div className="bg-white dark:bg-slate-900 p-2 sm:p-3 flex items-center gap-2 border-b border-slate-200 dark:border-white/10 shadow-sm shrink-0">
                                <Button
                                    variant="ghost" size="icon"
                                    className="text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full h-8 w-8 hover:text-indigo-600 dark:hover:text-white shrink-0"
                                    onClick={() => {
                                        setView('LIST');
                                        fetchRecentChats();
                                        setActiveChat(null);
                                    }}
                                >
                                    <ArrowLeft size={18} className="sm:w-5 sm:h-5" />
                                </Button>

                                <div
                                    onClick={() => {
                                        if (activeChat?.type === 'GROUP') { setIsGroupMembersOpen(true); }
                                        else { setSelectedProfileId(activeChat?.id || null); }
                                    }}
                                    className="flex items-center gap-2 cursor-pointer flex-1 min-w-0 group"
                                >
                                    <Avatar className="w-8 h-8 sm:w-10 sm:h-10 border border-slate-200 dark:border-white/10 group-hover:border-indigo-500/50 transition-colors shadow-sm shrink-0">
                                        {activeChat?.type === 'GROUP' ? (
                                            <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-bold uppercase text-[10px]">
                                                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                                            </div>
                                        ) : (
                                            <>
                                                <AvatarImage src={activeChat?.avatar_url || ''} className="object-cover" />
                                                <AvatarFallback className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase">
                                                    {activeChat?.name?.substring(0, 2)}
                                                </AvatarFallback>
                                            </>
                                        )}
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-black text-xs sm:text-sm text-slate-800 dark:text-slate-100 truncate uppercase tracking-tighter group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                {activeChat?.name}
                                            </h4>
                                            {activeChat?.type === 'PRIVATE' && getRoleBadge(activeChat.role || null)}
                                            {activeChat?.type === 'GROUP' && <Users size={12} className="text-indigo-500" />}
                                        </div>
                                        <p className={cn(
                                            "text-[8px] sm:text-[10px] font-black uppercase tracking-widest leading-none mt-1 flex items-center gap-1.5",
                                            (activeChat?.type === 'GROUP' || onlineUsers.has(activeChat?.id || ''))
                                                ? "text-green-500 dark:text-green-400"
                                                : "text-slate-400 dark:text-slate-500"
                                        )}>
                                            {(activeChat?.type === 'GROUP' || onlineUsers.has(activeChat?.id || '')) && (
                                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                            )}
                                            {activeChat?.type === 'GROUP'
                                                ? `${onlineUsers.size} Anggota Online`
                                                : (onlineUsers.has(activeChat?.id || '') ? 'Aktif Sekarang' : 'Offline')
                                            }
                                        </p>
                                    </div>
                                </div>

                                <Button
                                    variant="ghost" size="icon"
                                    className="h-8 w-8 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white shrink-0"
                                    onClick={() => { fetchRecentChats(); setIsOpen(false); setActiveChat(null); }}
                                >
                                    <X size={18} className="sm:w-5 sm:h-5" />
                                </Button>
                            </div>

                            <ScrollArea className="flex-1 p-3 sm:p-4" viewportRef={scrollRef}>
                                <div className="space-y-4 pb-4">
                                    {isLoading ? (
                                        <div className="flex justify-center p-4">
                                            <Loader2 className="animate-spin text-indigo-500 w-6 h-6" />
                                        </div>
                                    ) : (
                                        messages.map((msg) => {
                                            const isMe = msg.user_id === user.id;
                                            const isGroup = activeChat?.type === 'GROUP';
                                            return (
                                                <div key={msg.id} className={cn("flex animate-in fade-in slide-in-from-bottom-2 duration-300 gap-2", isMe ? "justify-end" : "justify-start items-end")}>
                                                    {isGroup && !isMe && (
                                                        <div onClick={() => setSelectedProfileId(msg.user_id)} className="shrink-0 mb-1 cursor-pointer hover:scale-110 transition-transform">
                                                            <Avatar className="w-8 h-8 border border-white/10 shadow-sm">
                                                                <AvatarImage src={msg.profiles?.avatar_url || ''} className="object-cover" />
                                                                <AvatarFallback className="bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold">
                                                                    {msg.profiles?.full_name?.substring(0, 2).toUpperCase()}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                        </div>
                                                    )}
                                                    <div className={cn(
                                                        "max-w-[75%] sm:max-w-[85%] px-4 py-2.5 rounded-2xl shadow-sm relative min-w-[80px] transition-all",
                                                        isMe ? "bg-indigo-600 text-white rounded-tr-none border border-indigo-500/50" : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200 dark:border-slate-700 shadow-sm"
                                                    )}>
                                                        {isGroup && !isMe && (
                                                            <div className="flex items-center gap-2 mb-1.5 border-b border-black/5 dark:border-white/5 pb-1">
                                                                <button onClick={() => setSelectedProfileId(msg.user_id)} className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:underline uppercase tracking-tighter">
                                                                    {msg.profiles?.full_name}
                                                                </button>
                                                                {getRoleBadge(msg.profiles?.role || null)}
                                                            </div>
                                                        )}
                                                        <p className="text-sm leading-relaxed pr-8 font-medium">{msg.content}</p>
                                                        <div className="flex items-center gap-1.5 absolute bottom-1.5 right-2">
                                                            <span className={cn("text-[8px] font-bold uppercase", isMe ? "text-white/40" : "text-slate-400 dark:text-slate-500")}>
                                                                {format(new Date(msg.created_at), 'HH:mm')}
                                                            </span>
                                                            {isMe && <CheckCheck size={11} className="text-indigo-300" />}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>
                            </ScrollArea>

                            <form
                                onSubmit={handleSendMessage}
                                className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-white/10 flex items-center gap-3 shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] dark:shadow-none sticky bottom-0"
                            >
                                <Avatar className="w-9 h-9 border border-slate-200 dark:border-white/10 hidden sm:block shrink-0">
                                    <AvatarImage src={currentUserProfile?.avatar_url || ''} className="object-cover" />
                                    <AvatarFallback className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold">ME</AvatarFallback>
                                </Avatar>
                                <Input
                                    className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-2xl h-11 focus-visible:ring-indigo-500/50 flex-1 placeholder:text-slate-500 text-sm px-4"
                                    placeholder="Enkripsi pesan..."
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                />
                                <Button
                                    type="submit"
                                    disabled={!newMessage.trim() || isSending}
                                    className="h-11 w-11 p-0 rounded-2xl bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20 text-white flex items-center justify-center shrink-0 border border-indigo-500/50 transition-all hover:scale-105 active:scale-95 disabled:scale-100"
                                >
                                    {isSending ? <Loader2 className="animate-spin w-5 h-5" /> : <Send className="w-5 h-5 ml-0.5" />}
                                </Button>
                            </form>
                        </div>
                    )}
                </div>
            )}
            <UserProfileModal userId={selectedProfileId} isOpen={!!selectedProfileId} onClose={() => setSelectedProfileId(null)} />
        </>
    );
}