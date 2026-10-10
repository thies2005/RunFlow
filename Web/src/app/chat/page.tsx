'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Menu, X, Book, ArrowLeft } from 'lucide-react';

const AiChat = dynamic(() => import('@/components/AiChat'), { ssr: false, loading: () => <div className="flex-1 bg-background" /> });
const AiSettingsModal = dynamic(() => import('@/components/AiSettingsModal'), { ssr: false, loading: () => null });
const ChatSidebar = dynamic(() => import('@/components/ChatSidebar'), { ssr: false, loading: () => null });

function ChatContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const sessionId = searchParams.get('sessionId') || undefined;
    const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isPromptLibraryOpen, setIsPromptLibraryOpen] = useState(false);
    const [resetKey, setResetKey] = useState(0);

    const handleNewChat = () => {
        if (!sessionId) {
            setResetKey(prev => prev + 1);
        } else {
            router.push('/chat');
        }
    };

    return (
        <div className="flex h-[100dvh] bg-background overflow-hidden">
            {/* Desktop Sidebar */}
            <aside className="hidden md:block w-[260px] flex-shrink-0">
                <ChatSidebar sessionId={sessionId} onNewChat={handleNewChat} />
            </aside>

            {/* Mobile Sidebar Drawer */}
            {isMobileSidebarOpen && (
                <div className="fixed inset-0 z-50 md:hidden flex">
                    <div className="fixed inset-0 bg-black/[var(--modal-backdrop-opacity)]" onClick={() => setIsMobileSidebarOpen(false)} />
                    <aside className="relative w-[280px] bg-background-secondary h-full border-r border-line animate-slide-in">
                        <div className="absolute top-2 right-2 z-10">
                            <button onClick={() => setIsMobileSidebarOpen(false)} className="p-2 text-foreground-muted hover:text-foreground">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <ChatSidebar sessionId={sessionId} onCloseMobile={() => setIsMobileSidebarOpen(false)} onNewChat={handleNewChat} />
                    </aside>
                </div>
            )}

            {/* Main Chat Area */}
            <main className="flex-1 flex flex-col min-w-0 bg-background">
                {/* Desktop Header */}
                <header className="topbar hidden md:flex items-center justify-between px-6 py-3 sticky top-0 z-50">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/')}
                            className="topbar-btn flex items-center gap-2 text-sm"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Dashboard
                        </button>
                    </div>
                </header>

                {/* Mobile Header */}
                <header className="topbar md:hidden flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))] sticky top-0 z-50">
                    <button
                        onClick={() => setIsMobileSidebarOpen(true)}
                        className="topbar-btn p-2 -ml-2"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <span className="font-semibold">AI Coach</span>
                    <button
                        onClick={() => setIsPromptLibraryOpen(true)}
                        className="topbar-btn p-2 -mr-2"
                    >
                        <Book className="w-5 h-5" />
                    </button>
                </header>

                <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                    <AiChat
                        key={resetKey}
                        sessionId={sessionId}
                        onOpenSettings={() => setIsAiSettingsOpen(true)}
                        isPromptLibraryOpen={isPromptLibraryOpen}
                        onClosePromptLibrary={() => setIsPromptLibraryOpen(false)}
                        onOpenPromptLibrary={() => setIsPromptLibraryOpen(true)}
                    />
                </div>
            </main>

            <AiSettingsModal
                isOpen={isAiSettingsOpen}
                onClose={() => setIsAiSettingsOpen(false)}
            />
        </div>
    );
}

export default function ChatPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-background text-foreground-muted">Loading chat...</div>}>
            <ChatContent />
        </Suspense>
    );
}
