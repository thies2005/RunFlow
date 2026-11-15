'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, MessageSquare, Trash2, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

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
    const [confirmTarget, setConfirmTarget] = useState<
        | { type: 'single'; id: string; title: string }
        | { type: 'all' }
        | null
    >(null);
    const [isDeletingAll, setIsDeletingAll] = useState(false);

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
            setConfirmTarget(null);
            if (sessionId === deletedId) {
                router.push('/chat'); // Redirect to new chat if current deleted
            }
        },
        onError: () => {
            toast.error('Failed to delete chat');
        },
        onSettled: () => setDeletingId(null),
    });

    const handleDelete = (e: React.MouseEvent, session: ChatSession) => {
        e.preventDefault();
        e.stopPropagation();
        setConfirmTarget({ type: 'single', id: session.id, title: session.title });
    };

    const handleDeleteAll = () => {
        setConfirmTarget({ type: 'all' });
    };

    const handleConfirmDelete = async () => {
        if (!confirmTarget) return;
        if (confirmTarget.type === 'single') {
            setDeletingId(confirmTarget.id);
            deleteSession.mutate(confirmTarget.id);
            return;
        }
        setIsDeletingAll(true);
        try {
            const res = await fetch('/api/ai/chat/sessions?all=true', { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete history');
            queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
            setConfirmTarget(null);
            router.push('/chat');
        } catch {
            toast.error('Failed to delete history');
        } finally {
            setIsDeletingAll(false);
        }
    };

    return (
        <div className={`flex flex-col h-full bg-background-secondary border-r border-line ${className}`}>
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
                    className="w-full flex items-center gap-3 px-4 py-3 bg-accent-orange hover:bg-accent-orange/90 text-white rounded-md transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    <span className="font-medium">New Chat</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 space-y-1">
                {isLoading ? (
                    <div className="flex justify-center p-4">
                        <Loader2 className="w-6 h-6 text-foreground-muted animate-spin" />
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="text-center text-foreground-muted p-4 text-sm">
                        No recent chats
                    </div>
                ) : (
                    sessions.map((session) => (
                        <Link
                            key={session.id}
                            href={`/chat?sessionId=${session.id}`}
                            onClick={onCloseMobile}
                            className={`group flex items-center justify-between px-3 py-3 rounded-md text-sm transition-colors ${sessionId === session.id
                                ? 'bg-background-tertiary text-foreground'
                                : 'text-foreground-muted hover:bg-background-tertiary hover:text-foreground-secondary'
                                }`}
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <MessageSquare className={`w-4 h-4 flex-shrink-0 ${sessionId === session.id ? 'text-accent-orange' : 'text-foreground-muted'
                                    }`} />
                                <span className="truncate">{session.title}</span>
                            </div>

                            <button
                                type="button"
                                aria-label={`Delete chat ${session.title}`}
                                onClick={(e) => handleDelete(e, session)}
                                className={`opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 p-1.5 hover:bg-negative/10 hover:text-negative rounded-sm transition-colors ${deletingId === session.id ? 'opacity-100 text-negative' : ''
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

            <div className="p-4 border-t border-line">
                <button
                    type="button"
                    onClick={handleDeleteAll}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs text-negative hover:bg-negative/10 rounded-md transition-colors"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete All History</span>
                </button>
            </div>

            <ConfirmDialog
                open={confirmTarget !== null}
                onOpenChange={(open) => {
                    if (!open && !deleteSession.isPending && !isDeletingAll) {
                        setConfirmTarget(null);
                    }
                }}
                title={confirmTarget?.type === 'all' ? 'Delete all chat history?' : 'Delete this chat?'}
                description={
                    confirmTarget?.type === 'all'
                        ? 'All chat sessions and messages will be permanently removed. This cannot be undone.'
                        : confirmTarget?.title
                            ? `"${confirmTarget.title}" will be permanently deleted.`
                            : 'This chat will be permanently deleted.'
                }
                confirmLabel={confirmTarget?.type === 'all' ? 'Delete All' : 'Delete'}
                busy={deleteSession.isPending || isDeletingAll}
                onConfirm={handleConfirmDelete}
            />
        </div>
    );
}
