'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import AiChat from '@/components/AiChat';
import AiSettingsModal from '@/components/AiSettingsModal';
import ChatSidebar from '@/components/ChatSidebar';

function ChatContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const sessionId = searchParams.get('sessionId') || undefined;
    const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    return (
        <div className="flex h-[100dvh] bg-background overflow-hidden">
            {/* Desktop Sidebar */}
            <aside className="hidden md:block w-[260px] flex-shrink-0">
                <ChatSidebar sessionId={sessionId} />
            </aside>

            {/* Mobile Sidebar Drawer */}
            {isMobileSidebarOpen && (
                <div className="fixed inset-0 z-50 md:hidden flex">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileSidebarOpen(false)} />
                    <aside className="relative w-[280px] bg-[#1c1c1e] h-full shadow-2xl animate-in slide-in-from-left duration-200">
                        <div className="absolute top-2 right-2 z-10">
                            <button onClick={() => setIsMobileSidebarOpen(false)} className="p-2 text-gray-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <ChatSidebar sessionId={sessionId} onCloseMobile={() => setIsMobileSidebarOpen(false)} />
                    </aside>
                </div>
            )}

            {/* Main Chat Area */}
            <main className="flex-1 flex flex-col min-w-0 bg-[#212121]">
                {/* Mobile Header */}
                <header className="md:hidden flex items-center justify-between p-4 border-b border-white/5 bg-[#1c1c1e]">
                    <button
                        onClick={() => setIsMobileSidebarOpen(true)}
                        className="p-2 -ml-2 text-gray-400 hover:text-white"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <span className="font-semibold text-white">AI Coach</span>
                    <div className="w-6" /> {/* Spacer for centering */}
                </header>

                <div className="flex-1 relative">
                    <AiChat
                        sessionId={sessionId}
                        onOpenSettings={() => setIsAiSettingsOpen(true)}
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
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-background text-muted-foreground">Loading chat...</div>}>
            <ChatContent />
        </Suspense>
    );
}
