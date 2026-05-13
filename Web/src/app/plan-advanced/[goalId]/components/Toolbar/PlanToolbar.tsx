'use client';

import { UndoRedoButtons } from './UndoRedoButtons';
import { ViewModeToggle } from './ViewModeToggle';
import { ModeToggle } from './ModeToggle';
import { PlanActionsMenu } from './PlanActionsMenu';
import { Pencil, Check, Brain } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { PlanCreationMode } from '../../hooks/usePlanMode';

interface PlanToolbarProps {
    goalId: string;
    planName: string;
    mode: PlanCreationMode;
    onModeChange: (mode: PlanCreationMode) => void;
    onNameChange?: (name: string) => void;
    onImportCsv?: () => void;
    onExportCsv?: () => void;
    onAnalyzePlan?: () => void;
}

export function PlanToolbar({ goalId, planName, mode, onModeChange, onNameChange, onImportCsv, onExportCsv, onAnalyzePlan }: PlanToolbarProps) {
    const [isEditingName, setIsEditingName] = useState(false);
    const [editName, setEditName] = useState(planName);
    const inputRef = useRef<HTMLInputElement>(null);

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
        <div className="h-14 border-b border-zinc-800 flex items-center px-4 gap-3 shrink-0">
            <UndoRedoButtons goalId={goalId} />

            <ModeToggle mode={mode} onModeChange={onModeChange} />

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
                            className="bg-zinc-900 border border-zinc-600 rounded-md px-2 py-1 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-500 max-w-xs"
                            maxLength={100}
                        />
                        <button
                            type="button"
                            onClick={handleNameSubmit}
                            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
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
                        <h1 className="text-sm font-semibold text-zinc-100 truncate">{planName}</h1>
                        <Pencil className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />
                    </button>
                )}
            </div>

            {onAnalyzePlan && (
                <button
                    type="button"
                    onClick={onAnalyzePlan}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20 transition-colors"
                >
                    <Brain className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Analyze Plan</span>
                </button>
            )}

            <ViewModeToggle value="calendar" onChange={() => {}} />

            <PlanActionsMenu goalId={goalId} onImportCsv={onImportCsv} onExportCsv={onExportCsv} />
        </div>
    );
}
