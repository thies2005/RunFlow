'use client';

import { useState } from 'react';
import { Trash2, Move, ArrowUpDown, Scissors, CalendarDays, X } from 'lucide-react';
import { useSelection } from './SelectionOverlay';
import { BulkDeleteDialog } from './BulkDeleteDialog';
import { BulkMoveDialog } from './BulkMoveDialog';
import { BulkTypeChangeDialog } from './BulkTypeChangeDialog';
import { BulkScaleDialog } from './BulkScaleDialog';
import { TemplateApplyDialog } from './TemplateApplyDialog';

interface MassEditToolbarProps {
    goalId: string;
    onOperationComplete: () => void;
}

export function MassEditToolbar({ goalId, onOperationComplete }: MassEditToolbarProps) {
    const { selectedIds, clearSelection } = useSelection();
    const [activeDialog, setActiveDialog] = useState<string | null>(null);

    const selectedCount = selectedIds.size;
    if (selectedCount === 0) return null;

    const closeDialog = () => setActiveDialog(null);

    return (
        <>
            <div className="h-12 border-t border-zinc-800 flex items-center justify-between px-4 shrink-0 bg-zinc-900/95 backdrop-blur-sm z-20">
                <span className="text-xs text-zinc-400">
                    {selectedCount} workout{selectedCount !== 1 ? 's' : ''} selected
                </span>
                <div className="flex items-center gap-1">
                    <ToolbarButton icon={<Trash2 className="w-3 h-3" />} label="Delete" onClick={() => setActiveDialog('delete')} />
                    <ToolbarButton icon={<Move className="w-3 h-3" />} label="Move" onClick={() => setActiveDialog('move')} />
                    <ToolbarButton icon={<ArrowUpDown className="w-3 h-3" />} label="Change Type" onClick={() => setActiveDialog('type')} />
                    <ToolbarButton icon={<Scissors className="w-3 h-3" />} label="Scale" onClick={() => setActiveDialog('scale')} />
                    <ToolbarButton icon={<CalendarDays className="w-3 h-3" />} label="Template" onClick={() => setActiveDialog('template')} />
                    <button
                        type="button"
                        onClick={clearSelection}
                        className="ml-2 flex items-center gap-1 px-2 py-1 rounded-md text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                    >
                        <X className="w-3 h-3" />
                        Clear
                    </button>
                </div>
            </div>

            {activeDialog === 'delete' && (
                <BulkDeleteDialog
                    goalId={goalId}
                    workoutIds={Array.from(selectedIds)}
                    onClose={closeDialog}
                    onComplete={() => {
                        closeDialog();
                        clearSelection();
                        onOperationComplete();
                    }}
                />
            )}
            {activeDialog === 'move' && (
                <BulkMoveDialog
                    goalId={goalId}
                    workoutIds={Array.from(selectedIds)}
                    onClose={closeDialog}
                    onComplete={() => {
                        closeDialog();
                        clearSelection();
                        onOperationComplete();
                    }}
                />
            )}
            {activeDialog === 'type' && (
                <BulkTypeChangeDialog
                    goalId={goalId}
                    workoutIds={Array.from(selectedIds)}
                    onClose={closeDialog}
                    onComplete={() => {
                        closeDialog();
                        clearSelection();
                        onOperationComplete();
                    }}
                />
            )}
            {activeDialog === 'scale' && (
                <BulkScaleDialog
                    goalId={goalId}
                    workoutIds={Array.from(selectedIds)}
                    onClose={closeDialog}
                    onComplete={() => {
                        closeDialog();
                        clearSelection();
                        onOperationComplete();
                    }}
                />
            )}
            {activeDialog === 'template' && (
                <TemplateApplyDialog
                    goalId={goalId}
                    onClose={closeDialog}
                    onComplete={() => {
                        closeDialog();
                        clearSelection();
                        onOperationComplete();
                    }}
                />
            )}
        </>
    );
}

function ToolbarButton({
    icon,
    label,
    onClick,
}: {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
            {icon}
            {label}
        </button>
    );
}
