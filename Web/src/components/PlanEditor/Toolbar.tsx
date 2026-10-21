'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Pencil, Check, MessageSquare, ArrowLeft, Sparkles } from 'lucide-react';
import { UndoRedoButtons } from '@/app/plan-advanced/[goalId]/components/Toolbar/UndoRedoButtons';
import { ViewModeToggle } from '@/app/plan-advanced/[goalId]/components/Toolbar/ViewModeToggle';
import { ModeToggle } from '@/app/plan-advanced/[goalId]/components/Toolbar/ModeToggle';
import { PlanActionsMenu } from '@/app/plan-advanced/[goalId]/components/Toolbar/PlanActionsMenu';
import { EngineGenerateModal } from './EngineGenerateModal';
import type { PlanCreationMode } from '@/app/plan-advanced/[goalId]/hooks/usePlanMode';

export interface ToolbarProps {
    goalId: string;
    planName: string;
    mode: PlanCreationMode;
    onModeChange: (_mode: PlanCreationMode) => void;
    onNameChange?: (_name: string) => void;
    onImportCsv?: () => void;
    onImportZwo?: () => void;
    onExportCsv?: () => void;
    viewMode?: 'calendar' | 'analysis';
    onViewModeChange?: (_mode: 'calendar' | 'analysis') => void;
    onToggleChat?: () => void;
    chatOpen?: boolean;
    isPremium?: boolean;
    sport?: string | null;
    raceType?: string | null;
    raceDate?: Date | null;
    currentVdot?: number | null;
}

export function Toolbar({
    goalId,
    planName,
    mode,
    onModeChange,
    onNameChange,
    onImportCsv,
    onImportZwo,
    onExportCsv,
    viewMode = 'calendar',
    onViewModeChange,
    onToggleChat,
    chatOpen,
    isPremium,
    sport,
    raceType,
    raceDate,
    currentVdot,
}: ToolbarProps) {
    const [isEditingName, setIsEditingName] = useState(false);
    const [editName, setEditName] = useState(planName);
    const [isEngineModalOpen, setIsEngineModalOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();
    const queryClient = useQueryClient();

    useEffect(() => {
        setEditName(planName);
    }, [planName]);

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
        <>
            <div className="h-14 border-b border-glass-border flex items-center px-4 gap-3 shrink-0 bg-background-secondary/50 backdrop-blur-sm">
                <button
                    type="button"
                    onClick={() => router.push('/')}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors"
                    title="Back to Dashboard"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Dashboard</span>
                </button>

                <div className="w-px h-6 bg-background-tertiary shrink-0" />

                <UndoRedoButtons goalId={goalId} />

                <ModeToggle mode={mode} onModeChange={onModeChange} isPremium={isPremium} />

                {/* Plan Name Center Block */}
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

                {/* Engine Generate / Adapt Button */}
                <button
                    type="button"
                    onClick={() => setIsEngineModalOpen(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-workout-tempo/15 hover:bg-workout-tempo/25 text-workout-tempo border border-workout-tempo/30 transition-colors shadow-sm"
                    title="Generate / Adapt with Engine"
                >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Engine Generator</span>
                </button>

                {onToggleChat && (
                    <button
                        type="button"
                        onClick={onToggleChat}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${
                            chatOpen
                                ? 'bg-workout-long-run/15 text-workout-long-run border-workout-long-run/30'
                                : 'bg-workout-long-run/10 text-workout-long-run hover:bg-workout-long-run/15 border-workout-long-run/30'
                        }`}
                    >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">AI Chat</span>
                    </button>
                )}

                {/* Calendar / Analysis view toggle */}
                <ViewModeToggle
                    value={viewMode}
                    onChange={onViewModeChange ?? (() => {})}
                    isPremium={isPremium}
                />

                <PlanActionsMenu
                    goalId={goalId}
                    planName={planName}
                    onImportCsv={onImportCsv}
                    onImportZwo={onImportZwo}
                    onExportCsv={onExportCsv}
                />
            </div>

            <EngineGenerateModal
                isOpen={isEngineModalOpen}
                onClose={() => setIsEngineModalOpen(false)}
                goalId={goalId}
                initialSport={sport}
                initialRaceType={raceType}
                initialRaceDate={raceDate}
                initialVdot={currentVdot}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['plan-advanced', goalId] });
                    queryClient.invalidateQueries({ queryKey: ['plan-advanced', goalId, 'planned-fitness'] });
                    queryClient.invalidateQueries({ queryKey: ['goals'] });
                    queryClient.invalidateQueries({ queryKey: ['plan'] });
                }}
            />
        </>
    );
}

export default Toolbar;
