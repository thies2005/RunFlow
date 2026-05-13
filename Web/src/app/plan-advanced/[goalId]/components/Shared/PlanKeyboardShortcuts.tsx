'use client';

import { useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelection } from '../MassEdit/SelectionOverlay';

interface PlanKeyboardShortcutsProps {
    goalId: string;
    workouts: { id: string }[];
    onClosePanel?: () => void;
}

export function PlanKeyboardShortcuts({ goalId, workouts, onClosePanel }: PlanKeyboardShortcutsProps) {
    const { selectedIds, clearSelection, selectAllInWeek } = useSelection();
    const queryClient = useQueryClient();

    const undoMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/plan-advanced/${goalId}/undo`, { method: 'POST' });
            if (!res.ok) throw new Error('Undo failed');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plan-advanced', goalId] });
        },
    });

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const isInput =
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.tagName === 'SELECT' ||
                target.isContentEditable;

            if (isInput) return;

            const isMod = e.ctrlKey || e.metaKey;

            if (isMod && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undoMutation.mutate();
                return;
            }

            if (isMod && e.key === 'a') {
                e.preventDefault();
                selectAllInWeek(workouts as any);
                return;
            }

            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.size > 0) {
                e.preventDefault();
                const ids = Array.from(selectedIds);
                void fetch(`/api/plan-advanced/${goalId}/workouts/bulk`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ operation: 'DELETE', workoutIds: ids }),
                }).then(() => {
                    queryClient.invalidateQueries({ queryKey: ['plan-advanced', goalId] });
                    clearSelection();
                });
                return;
            }

            if (e.key === 'Escape') {
                if (selectedIds.size > 0) {
                    clearSelection();
                } else if (onClosePanel) {
                    onClosePanel();
                }
            }
        },
        [goalId, selectedIds, clearSelection, selectAllInWeek, workouts, onClosePanel, undoMutation, queryClient],
    );

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    return null;
}
