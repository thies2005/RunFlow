'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Undo2, Redo2, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface UndoRedoButtonsProps {
    goalId: string;
}

export function UndoRedoButtons({ goalId }: UndoRedoButtonsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const queryClient = useQueryClient();

    const { data: snapshots } = useQuery({
        queryKey: ['plan-advanced', goalId, 'snapshots'],
        queryFn: async () => {
            const res = await fetch(`/api/plan-advanced/${goalId}`);
            if (!res.ok) throw new Error('Failed to fetch plan');
            const data = await res.json();
            return data.plan?.snapshots || [];
        },
    });

    const undoMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/plan-advanced/${goalId}/undo`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
            if (!res.ok) throw new Error('Undo failed');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plan-advanced', goalId] });
        },
    });

    const revertMutation = useMutation({
        mutationFn: async (snapshotId: string) => {
            const res = await fetch(`/api/plan-advanced/${goalId}/undo`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ snapshotId }),
            });
            if (!res.ok) throw new Error('Revert failed');
            return res.json();
        },
        onSuccess: () => {
            setIsOpen(false);
            queryClient.invalidateQueries({ queryKey: ['plan-advanced', goalId] });
        },
    });

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const canUndo = (snapshots?.length ?? 0) > 0;

    return (
        <div className="relative flex items-center gap-1" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => undoMutation.mutate()}
                disabled={!canUndo || undoMutation.isPending}
                className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Undo"
            >
                <Undo2 className="w-4 h-4" />
            </button>
            <button
                type="button"
                disabled
                className="p-1.5 rounded-md text-zinc-600 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Redo (coming soon)"
            >
                <Redo2 className="w-4 h-4" />
            </button>
            {snapshots && snapshots.length > 0 && (
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setIsOpen(!isOpen)}
                        className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                    >
                        <ChevronDown className="w-3 h-3" />
                    </button>
                    {isOpen && (
                        <div className="absolute left-0 top-full mt-1 w-64 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 py-1 max-h-48 overflow-y-auto">
                            {snapshots.map((s: { id: string; description: string; createdAt: string }) => (
                                <div
                                    key={s.id}
                                    className="px-3 py-2 text-xs text-zinc-400 hover:bg-zinc-800 cursor-pointer"
                                    onClick={() => revertMutation.mutate(s.id)}
                                >
                                    <span className="text-zinc-300">{s.description}</span>
                                    <span className="block text-zinc-600 mt-0.5">
                                        {new Date(s.createdAt).toLocaleString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
