'use client';

import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MoreHorizontal, Download, Upload, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface PlanActionsMenuProps {
    goalId: string;
    onImportCsv?: () => void;
    onExportCsv?: () => void;
}

export function PlanActionsMenu({ goalId, onImportCsv, onExportCsv }: PlanActionsMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const queryClient = useQueryClient();

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const deleteMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/plan-advanced/${goalId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete plan');
            return res.json();
        },
        onSuccess: () => {
            toast.success('Plan deleted');
            queryClient.invalidateQueries({ queryKey: ['plan-advanced'] });
            window.location.href = '/plan-advanced';
        },
        onError: () => {
            toast.error('Failed to delete plan');
        },
    });

    const actions = [
        {
            label: 'Export CSV',
            icon: Download,
            onClick: () => {
                setIsOpen(false);
                onExportCsv?.();
            },
        },
        {
            label: 'Import CSV',
            icon: Upload,
            onClick: () => {
                setIsOpen(false);
                onImportCsv?.();
            },
        },
        { separator: true },
        {
            label: 'Delete Plan',
            icon: Trash2,
            danger: true,
            onClick: () => {
                setIsOpen(false);
                deleteMutation.mutate();
            },
        },
    ] as const;

    return (
        <div className="relative" ref={menuRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                title="Plan actions"
            >
                <MoreHorizontal className="w-4 h-4" />
            </button>
            {isOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 py-1">
                    {actions.map((action, i) => {
                        if ('separator' in action) {
                            return <div key={i} className="border-t border-zinc-800 my-1" />;
                        }
                        const Icon = action.icon;
                        return (
                            <button
                                key={i}
                                type="button"
                                onClick={action.onClick}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
                                    'danger' in action && action.danger
                                        ? 'text-red-400 hover:bg-red-500/10'
                                        : 'text-zinc-300 hover:bg-zinc-800'
                                }`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {action.label}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
