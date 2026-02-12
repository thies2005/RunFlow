'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, MessageSquare, Trash2, MoreVertical, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface ChatSession {
    id: string;
    title: string;
    updatedAt: string;
}

interface ChatSidebarProps {
    sessionId?: string;
    className?: string;
    onCloseMobile?: () => void;
    onNewChat?: () => void;
}

export default function ChatSidebar({ sessionId, className = '', onCloseMobile, onNewChat }: ChatSidebarProps) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Fetch sessions
    const { data: sessionsData, isLoading } = useQuery({
        queryKey: ['chat-sessions'],
        queryFn: async () => {
            const res = await fetch('/api/ai/chat/sessions');
            if (!res.ok) throw new Error('Failed to fetch sessions');
            return res.json();
        },
    });

    const sessions = (sessionsData?.sessions || []) as ChatSession[];

    // Delete session
    const deleteSession = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/ai/chat/sessions?sessionId=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete session');
            return res.json();
        },
        onSuccess: (_, deletedId) => {
            queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
            if (sessionId === deletedId) {
                router.push('/chat'); // Redirect to new chat if current deleted
            }
        },
        onSettled: () => setDeletingId(null),
    });

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm('Delete this chat?')) {
            setDeletingId(id);
            deleteSession.mutate(id);
        }
    };

    return (
        <div className={`flex flex-col h-full bg-[#1c1c1e] border-r border-white/5 ${className}`}>
            <div className="p-4">
                <button
                    onClick={() => {
                        if (onNewChat) {
                            onNewChat();
                        } else {
                            router.push('/chat');
                        }
                        if (onCloseMobile) onCloseMobile();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-purple-900/20"
                >
                    <Plus className="w-5 h-5" />
                    <span className="font-medium">New Chat</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 space-y-1">
                {isLoading ? (
                    <div className="flex justify-center p-4">
                        <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="text-center text-gray-500 p-4 text-sm">
                        No recent chats
                    </div>
                ) : (
                    sessions.map((session) => (
                        <Link
                            key={session.id}
                            href={`/chat?sessionId=${session.id}`}
                            onClick={onCloseMobile}
                            className={`group flex items-center justify-between px-3 py-3 rounded-lg text-sm transition-colors ${sessionId === session.id
                                ? 'bg-white/10 text-white'
                                : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                                }`}
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <MessageSquare className={`w-4 h-4 flex-shrink-0 ${sessionId === session.id ? 'text-purple-400' : 'text-gray-500'
                                    }`} />
                                <span className="truncate">{session.title}</span>
                            </div>

                            <button
                                onClick={(e) => handleDelete(e, session.id)}
                                className={`opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-md transition-all ${deletingId === session.id ? 'opacity-100 text-red-400' : ''
                                    }`}
                            >
                                {deletingId === session.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                )}
                            </button>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}
