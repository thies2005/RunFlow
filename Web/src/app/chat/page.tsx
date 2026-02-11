'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import AiChat from '@/components/AiChat';
import AiSettingsModal from '@/components/AiSettingsModal';

export default function ChatPage() {
    const router = useRouter();
    const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false);

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header for Desktop view - Mobile view uses MobileLayout which has its own header */}
            <header className="border-b border-glass-border backdrop-blur-md bg-background/80 sticky top-0 z-50 pt-[env(safe-area-inset-top)] hidden md:block">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => router.back()}
                                className="p-2 text-foreground-muted hover:text-foreground transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <h1 className="text-xl font-bold text-foreground">AI Coach</h1>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 w-full mx-auto h-[calc(100dvh-64px)] overflow-hidden flex flex-col">
                <div className="flex-1 bg-background overflow-hidden relative">
                    <AiChat onOpenSettings={() => setIsAiSettingsOpen(true)} />
                </div>
            </main>

            <AiSettingsModal
                isOpen={isAiSettingsOpen}
                onClose={() => setIsAiSettingsOpen(false)}
            />
        </div>
    );
}
