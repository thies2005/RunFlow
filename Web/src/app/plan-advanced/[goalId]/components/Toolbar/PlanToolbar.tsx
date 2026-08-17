'use client';

import { UndoRedoButtons } from './UndoRedoButtons';
import { ViewModeToggle } from './ViewModeToggle';
import { ModeToggle } from './ModeToggle';
import { PlanActionsMenu } from './PlanActionsMenu';
import { Pencil, Check, MessageSquare, ArrowLeft } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { PlanCreationMode } from '../../hooks/usePlanMode';

interface PlanToolbarProps {
    goalId: string;
    planName: string;
    mode: PlanCreationMode;
    onModeChange: (_mode: PlanCreationMode) => void;
    onNameChange?: (_name: string) => void;
    onImportCsv?: () => void;
    onExportCsv?: () => void;
    /** Replaces the old onAnalyzePlan — drives the Calendar/Analysis view toggle */
    viewMode?: 'calendar' | 'analysis';
    onViewModeChange?: (_mode: 'calendar' | 'analysis') => void;
    onToggleChat?: () => void;
    chatOpen?: boolean;
    isPremium?: boolean;
}

export function PlanToolbar({
    goalId,
    planName,
    mode,
    onModeChange,
    onNameChange,
    onImportCsv,
    onExportCsv,
    viewMode = 'calendar',
    onViewModeChange,
    onToggleChat,
    chatOpen,
    isPremium,
}: PlanToolbarProps) {
    const [isEditingName, setIsEditingName] = useState(false);
    const [editName, setEditName] = useState(planName);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    useEffect(() => {
        if (isEditingName) inputRef.current?.focus();
    }, [isEditingName]);

    const handleNameSubmit = () => {
        const trimmed = editName.trim();
        if (trimmed && trimmed !== planName) {
            onNameChange?.(trimmed);
        } else {
            setEditName(planName);
        }
        setIsEditingName(false);
    };

    return (
        <div className="h-14 border-b border-glass-border flex items-center px-4 gap-3 shrink-0">
            <button
                type="button"
                onClick={() => router.push('/plan-advanced')}
                className="p-1.5 rounded-md text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors"
                title="Back to Plans"
            >
                <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="w-px h-6 bg-background-tertiary shrink-0" />

            <UndoRedoButtons goalId={goalId} />

            <ModeToggle mode={mode} onModeChange={onModeChange} isPremium={isPremium} />

            <div className="flex-1 flex items-center justify-center min-w-0">
                {isEditingName ? (
                    <div className="flex items-center gap-1.5">
                        <input
                            ref={inputRef}
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleNameSubmit();
                                if (e.key === 'Escape') {
                                    setEditName(planName);
                                    setIsEditingName(false);
                                }
                            }}
                            className="bg-background-secondary border border-foreground/25 rounded-md px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-foreground-muted max-w-xs"
                            maxLength={100}
                        />
                        <button
                            type="button"
                            onClick={handleNameSubmit}
                            className="p-1 rounded hover:bg-background-tertiary text-foreground-secondary hover:text-foreground transition-colors"
                        >
                            <Check className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => setIsEditingName(true)}
                        className="flex items-center gap-1.5 group max-w-xs"
                    >
                        <h1 className="text-sm font-semibold text-foreground truncate">{planName}</h1>
                        <Pencil className="w-3 h-3 text-foreground-muted group-hover:text-foreground-secondary transition-colors shrink-0" />
                    </button>
                )}
            </div>

            {onToggleChat && (
                <button
                    type="button"
                    onClick={onToggleChat}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${
                        chatOpen
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                            : 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border-purple-500/20'
                    }`}
                >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">AI Chat</span>
                </button>
            )}

            {/* Calendar / Analysis view toggle — always visible, gated inside handler */}
            <ViewModeToggle
                value={viewMode}
                onChange={onViewModeChange ?? (() => {})}
                isPremium={isPremium}
            />

            <PlanActionsMenu goalId={goalId} onImportCsv={onImportCsv} onExportCsv={onExportCsv} />
        </div>
    );
}
