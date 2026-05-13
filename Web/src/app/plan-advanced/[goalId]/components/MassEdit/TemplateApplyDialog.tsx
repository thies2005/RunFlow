'use client';

import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Loader2, FileDown } from 'lucide-react';
import { toast } from 'sonner';

interface TemplateApplyDialogProps {
    goalId: string;
    onClose: () => void;
    onComplete: () => void;
}

export function TemplateApplyDialog({ goalId, onClose, onComplete }: TemplateApplyDialogProps) {
    const queryClient = useQueryClient();
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [startWeek, setStartWeek] = useState(1);
    const [endWeek, setEndWeek] = useState(1);

    const { data: templates } = useQuery({
        queryKey: ['plan-advanced', goalId, 'templates'],
        queryFn: async () => {
            const res = await fetch(`/api/plan-advanced/${goalId}`);
            if (!res.ok) return [];
            const data = await res.json();
            return data.plan?.templates || [];
        },
    });

    const mutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/plan-advanced/${goalId}/workouts/bulk`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    operation: 'APPLY_TEMPLATE',
                    params: {
                        templateId: selectedTemplateId,
                        startWeek,
                        endWeek,
                    },
                }),
            });
            if (!res.ok) throw new Error('Template apply failed');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plan-advanced', goalId] });
            toast.success('Template applied');
            onComplete();
        },
        onError: () => {
            toast.error('Failed to apply template');
        },
    });

    const weekCount = Math.max(0, endWeek - startWeek + 1);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />
            <div className="relative bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
                <h3 className="text-sm font-semibold text-zinc-100 mb-4 flex items-center gap-2">
                    <FileDown className="w-4 h-4 text-zinc-400" />
                    Apply Template
                </h3>

                <div className="space-y-4 mb-4">
                    <div>
                        <label className="block text-xs text-zinc-500 mb-1">Template</label>
                        {templates && templates.length > 0 ? (
                            <select
                                value={selectedTemplateId}
                                onChange={(e) => setSelectedTemplateId(e.target.value)}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2.5 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                            >
                                <option value="">Select a template...</option>
                                {templates.map((t: { id: string; name: string }) => (
                                    <option key={t.id} value={t.id}>
                                        {t.name}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <p className="text-xs text-zinc-600 italic">No templates available</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-zinc-500 mb-1">Start Week</label>
                            <input
                                type="number"
                                min={1}
                                value={startWeek}
                                onChange={(e) => {
                                    const v = Math.max(1, Number(e.target.value));
                                    setStartWeek(v);
                                    if (endWeek < v) setEndWeek(v);
                                }}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2.5 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-zinc-500 mb-1">End Week</label>
                            <input
                                type="number"
                                min={startWeek}
                                value={endWeek}
                                onChange={(e) => setEndWeek(Math.max(startWeek, Number(e.target.value)))}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2.5 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                            />
                        </div>
                    </div>

                    {selectedTemplateId && weekCount > 0 && (
                        <div className="p-2 rounded-md bg-zinc-800/50 border border-zinc-800">
                            <span className="text-xs text-zinc-500">
                                Template will be applied to {weekCount} week{weekCount !== 1 ? 's' : ''}
                                {' '}(Week {startWeek}{startWeek !== endWeek ? ` - ${endWeek}` : ''})
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-3 py-1.5 rounded-md bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => mutation.mutate()}
                        disabled={mutation.isPending || !selectedTemplateId}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-zinc-700 text-zinc-200 text-xs hover:bg-zinc-600 disabled:opacity-50 transition-colors"
                    >
                        {mutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                        Apply
                    </button>
                </div>
            </div>
        </div>
    );
}
