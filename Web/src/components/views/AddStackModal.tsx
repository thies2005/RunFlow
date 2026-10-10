'use client';

import { useState, useEffect } from 'react';
import { X, Save, Clock } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/Input';
import useConfirmAction from '@/hooks/useConfirmAction';

interface AddStackModalProps {
    isOpen: boolean;
    onClose: () => void;
    stackToEdit?: any | null; // Pass a stack object if editing
}

const TIME_OPTIONS = [
    { label: 'Morning', value: 'MORNING' },
    { label: 'Noon', value: 'NOON' },
    { label: 'Evening', value: 'EVENING' },
    { label: 'Any', value: '' }
];

export function AddStackModal({ isOpen, onClose, stackToEdit }: AddStackModalProps) {
    const queryClient = useQueryClient();
    const { confirm, ConfirmDialog } = useConfirmAction();

    const [name, setName] = useState('');
    const [timeOfDay, setTimeOfDay] = useState('MORNING');

    useEffect(() => {
        if (stackToEdit) {
            setName(stackToEdit.name);
            setTimeOfDay(stackToEdit.timeOfDay || '');
        } else {
            resetForm();
        }
    }, [stackToEdit, isOpen]);

    const submitMutation = useMutation({
        mutationFn: async () => {
            const payload = { name, timeOfDay: timeOfDay === '' ? null : timeOfDay };
            const method = stackToEdit ? 'PUT' : 'POST';
            if (stackToEdit) Object.assign(payload, { id: stackToEdit.id });

            const res = await fetch('/api/health/supplements/stacks', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error(`Failed to ${stackToEdit ? 'update' : 'add'} stack`);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['supplement-stacks'] });
            resetForm();
            onClose();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/health/supplements/stacks?id=${stackToEdit.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete stack');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['supplement-stacks'] });
            queryClient.invalidateQueries({ queryKey: ['supplements'] }); // Invalidate so standalone updates
            resetForm();
            onClose();
        }
    });

    const resetForm = () => {
        setName('');
        setTimeOfDay('MORNING');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-black/60 sm:items-center sm:justify-center">
            <div className="bg-background-secondary border border-line w-full max-w-md rounded-t-md sm:rounded-md flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-line shrink-0">
                    <h2 className="text-lg font-semibold text-foreground">{stackToEdit ? 'Edit Stack' : 'Create Stack'}</h2>
                    <button onClick={onClose} className="p-2 -mr-2 text-foreground-muted hover:text-foreground transition-colors" type="button">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 overflow-y-auto flex-1 space-y-6">
                    {/* Name */}
                    <div>
                        <Input
                            label="Stack Name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Brain Stack, Pre-workout"
                            className="!bg-background-tertiary border-line"
                        />
                    </div>

                    {/* Time of Day */}
                    <div>
                        <label className="flex items-center gap-1.5 text-xs text-foreground-muted mb-2 font-medium">
                            <Clock className="w-3.5 h-3.5" /> Time Drop
                        </label>
                        <div className="flex bg-background-tertiary p-1 rounded-md border border-line overflow-x-auto no-scrollbar">
                            {TIME_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setTimeOfDay(opt.value)}
                                    className={`flex-none px-4 py-1.5 text-sm font-medium rounded-sm transition-colors ${timeOfDay === opt.value ? 'bg-glass-bg text-foreground' : 'text-foreground-muted hover:text-foreground-muted'}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-line bg-background-secondary shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom))] flex gap-3">
                    {stackToEdit && (
                        <button
                            onClick={async () => {
                                const isConfirmed = await confirm({
                                    title: 'Delete Stack',
                                    message: 'Delete this stack? The supplements will remain but become standalone.',
                                    confirmText: 'Delete',
                                    isDestructive: true
                                });
                                if (isConfirmed) {
                                    deleteMutation.mutate();
                                }
                            }}
                            disabled={deleteMutation.isPending}
                            className="px-4 py-3 bg-negative/10 text-negative font-semibold rounded-md flex items-center justify-center hover:bg-negative/20 disabled:opacity-50 transition-colors"
                        >
                            Delete
                        </button>
                    )}
                    <button
                        onClick={() => submitMutation.mutate()}
                        disabled={!name.trim() || submitMutation.isPending}
                        className="flex-1 py-3 bg-accent-orange text-white font-semibold rounded-md flex items-center justify-center gap-2 hover:bg-accent-orange/90 disabled:opacity-50 transition-colors"
                    >
                        {submitMutation.isPending ? 'Saving...' : <><Save className="w-4 h-4" /> Save Stack</>}
                    </button>
                </div>
            </div>
            <ConfirmDialog />
        </div>
    );
}
