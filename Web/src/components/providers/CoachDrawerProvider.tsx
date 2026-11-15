'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, X } from 'lucide-react';
import AiChat from '@/components/AiChat';

export type CoachContextType = 'readiness' | 'nutrition' | 'insight' | 'workout' | 'activity' | 'general';

export interface OpenCoachOptions {
    title?: string;
    prompt?: string;
    autoSend?: boolean;
    activityId?: string;
    contextType?: CoachContextType;
}

interface CoachDrawerContextValue {
    isOpen: boolean;
    openCoach: (_options?: OpenCoachOptions) => void;
    closeCoach: () => void;
}

const noop = () => {};

const CoachDrawerContext = createContext<CoachDrawerContextValue>({
    isOpen: false,
    openCoach: noop,
    closeCoach: noop,
});

export function useCoachDrawer(): CoachDrawerContextValue {
    return useContext(CoachDrawerContext);
}

const CONTEXT_LABELS: Record<CoachContextType, string> = {
    readiness: 'Readiness & recovery',
    nutrition: 'Fueling & macros',
    insight: 'Weekly insight',
    workout: 'Today’s session',
    activity: 'Activity review',
    general: 'Training & nutrition',
};

export function CoachDrawerProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const dialogRef = useRef<HTMLDialogElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [requestNonce, setRequestNonce] = useState(0);
    const [options, setOptions] = useState<OpenCoachOptions>({});

    const openCoach = useCallback((nextOptions?: OpenCoachOptions) => {
        if (typeof document !== 'undefined') {
            previousFocusRef.current = document.activeElement as HTMLElement | null;
        }
        setOptions(nextOptions ?? {});
        setRequestNonce((n) => n + 1);
        setIsOpen(true);
    }, []);

    const closeCoach = useCallback(() => {
        setIsOpen(false);
    }, []);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        if (isOpen) {
            if (!dialog.open && typeof dialog.showModal === 'function') {
                dialog.showModal();
            }
            closeButtonRef.current?.focus();
        } else {
            if (dialog.open && typeof dialog.close === 'function') {
                dialog.close();
            }
            previousFocusRef.current?.focus?.();
            previousFocusRef.current = null;
        }
    }, [isOpen]);

    const handleDialogCancel = (e: React.SyntheticEvent<HTMLDialogElement>) => {
        e.preventDefault();
        closeCoach();
    };

    const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
        if (e.target === dialogRef.current) {
            closeCoach();
        }
    };

    const title = options.title || 'Coach';
    const contextLabel = options.contextType ? CONTEXT_LABELS[options.contextType] : CONTEXT_LABELS.general;

    return (
        <CoachDrawerContext.Provider value={{ isOpen, openCoach, closeCoach }}>
            {children}
            <dialog
                ref={dialogRef}
                aria-labelledby="coach-drawer-title"
                onCancel={handleDialogCancel}
                onClick={handleBackdropClick}
                {...({ closedby: 'any' } as Record<string, string>)}
                className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-full max-w-lg border-l border-line bg-background text-foreground p-0 open:flex open:flex-col backdrop:bg-black/50"
            >
                {isOpen && (
                    <div className="flex flex-col h-full min-h-0">
                        <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-line bg-background-secondary shrink-0">
                            <div className="flex items-center gap-2 min-w-0">
                                <MessageSquare className="w-4 h-4 text-accent-orange shrink-0" aria-hidden="true" />
                                <div className="min-w-0">
                                    <h2 id="coach-drawer-title" className="text-sm font-semibold text-foreground truncate">
                                        {title}
                                    </h2>
                                    <p className="text-[11px] font-mono text-foreground-muted truncate">
                                        {contextLabel}
                                    </p>
                                </div>
                            </div>
                            <button
                                ref={closeButtonRef}
                                type="button"
                                onClick={closeCoach}
                                aria-label="Close coach"
                                className="p-1.5 rounded-[3px] border border-line bg-background hover:bg-surface-hover text-foreground-muted hover:text-foreground transition-colors shrink-0"
                            >
                                <X className="w-4 h-4" aria-hidden="true" />
                            </button>
                        </header>

                        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                            <AiChat
                                key={requestNonce}
                                mode="drawer"
                                activityId={options.activityId}
                                initialPrompt={options.prompt}
                                autoSend={options.autoSend}
                                contextType={options.contextType}
                                hideInputActions
                                onOpenSettings={() => {
                                    closeCoach();
                                    router.push('/chat');
                                }}
                            />
                        </div>
                    </div>
                )}
            </dialog>
        </CoachDrawerContext.Provider>
    );
}
