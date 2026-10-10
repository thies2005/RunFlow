'use client';

import { useState, useEffect } from 'react';
import { X, Save, Clock, CalendarDays } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import useConfirmAction from '@/hooks/useConfirmAction';

interface AddSupplementModalProps {
    isOpen: boolean;
    onClose: () => void;
    supplementToEdit?: any | null;
}

const DAYS = [
    { label: 'S', value: 0 }, { label: 'M', value: 1 }, { label: 'T', value: 2 },
    { label: 'W', value: 3 }, { label: 'T', value: 4 }, { label: 'F', value: 5 }, { label: 'S', value: 6 }
];

const TIME_OPTIONS = [
    { label: 'Morning', value: 'MORNING' },
    { label: 'Noon', value: 'NOON' },
    { label: 'Evening', value: 'EVENING' }
];

export function AddSupplementModal({ isOpen, onClose, supplementToEdit }: AddSupplementModalProps) {
    const queryClient = useQueryClient();

    const [name, setName] = useState('');
    const [amount, setAmount] = useState('1');
    const [unit, setUnit] = useState('pill(s)');
    const [timeOfDay, setTimeOfDay] = useState('MORNING');
    const [daysOfWeek, setDaysOfWeek] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
    const [stackId, setStackId] = useState<string>('');

    const { confirm, ConfirmDialog } = useConfirmAction();

    const { data: stacks } = useQuery({
        queryKey: ['supplement-stacks'],
        queryFn: async () => {
            const res = await fetch('/api/health/supplements/stacks');
            if (!res.ok) throw new Error('Failed to fetch stacks');
            return res.json();
        }
    });

    useEffect(() => {
        if (supplementToEdit) {
            setName(supplementToEdit.name);
            setAmount(supplementToEdit.amount.toString());
            setUnit(supplementToEdit.unit);
            setTimeOfDay(supplementToEdit.timeOfDay);
            setDaysOfWeek(supplementToEdit.daysOfWeek || [0, 1, 2, 3, 4, 5, 6]);
            setStackId(supplementToEdit.stackId || '');
        } else {
            resetForm();
        }
    }, [supplementToEdit, isOpen]);

    const submitMutation = useMutation({
        mutationFn: async () => {
            const payload: any = {
                name,
                amount,
                unit,
                timeOfDay,
                daysOfWeek,
                stackId: stackId === '' ? null : stackId
            };
            const method = supplementToEdit ? 'PUT' : 'POST';
            if (supplementToEdit) payload.id = supplementToEdit.id;

            const res = await fetch('/api/health/supplements', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error(`Failed to ${supplementToEdit ? 'update' : 'add'} supplement`);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['supplements'] });
            queryClient.invalidateQueries({ queryKey: ['supplement-stacks'] });
            resetForm();
            onClose();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/health/supplements?id=${supplementToEdit.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete supplement');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['supplements'] });
            queryClient.invalidateQueries({ queryKey: ['supplement-stacks'] });
            resetForm();
            onClose();
        }
    });

    const resetForm = () => {
        setName('');
        setAmount('1');
        setUnit('pill(s)');
        setTimeOfDay('MORNING');
        setDaysOfWeek([0, 1, 2, 3, 4, 5, 6]);
        setStackId('');
    };

    const toggleDay = (dayValue: number) => {
        setDaysOfWeek(prev =>
            prev.includes(dayValue)
                ? prev.filter(d => d !== dayValue)
                : [...prev, dayValue].sort()
        );
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-black/60 sm:items-center sm:justify-center">
                <div
                    className="bg-background-secondary border border-line w-full max-w-md rounded-t-md sm:rounded-md flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-line shrink-0">
                        <h2 className="text-lg font-semibold text-foreground">{supplementToEdit ? 'Edit Supplement' : 'Add Supplement'}</h2>
                        <button
                            onClick={onClose}
                            className="p-2 -mr-2 text-foreground-muted hover:text-foreground transition-colors"
                            type="button"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-4 overflow-y-auto flex-1 space-y-6">
                        {/* Name */}
                        <div>
                            <Input
                                label="Name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Vitamin D3, Omega-3"
                                className="!bg-background-tertiary border-line"
                            />
                        </div>

                        {/* Stack Dropdown */}
                        <div>
                            <Select
                                label="Stack (Optional)"
                                value={stackId}
                                onChange={(e) => setStackId(e.target.value)}
                                className="!bg-background-tertiary border-line"
                            >
                                <option value="">None (Standalone)</option>
                                {stacks?.map((stack: any) => (
                                    <option key={stack.id} value={stack.id}>{stack.name}</option>
                                ))}
                            </Select>
                        </div>

                        {/* Dosage */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Input
                                    label="Amount"
                                    type="number"
                                    step="any"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="!bg-background-tertiary border-line"
                                />
                            </div>
                            <div>
                                <Select
                                    label="Unit"
                                    value={unit}
                                    onChange={(e) => setUnit(e.target.value)}
                                    className="!bg-background-tertiary border-line"
                                >
                                    <option value="pill(s)">pill(s)</option>
                                    <option value="mg">mg</option>
                                    <option value="g">g</option>
                                    <option value="ml">ml</option>
                                    <option value="scoop(s)">scoop(s)</option>
                                    <option value="gummy">gummy</option>
                                </Select>
                            </div>
                        </div>

                        {/* Time of Day */}
                        <div>
                            <label className="flex items-center gap-1.5 text-xs text-foreground-muted mb-2 font-medium">
                                <Clock className="w-3.5 h-3.5" /> Time of Day
                            </label>
                            <div className="flex bg-background-tertiary p-1 rounded-md border border-line">
                                {TIME_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setTimeOfDay(opt.value)}
                                        className={`flex-1 py-1.5 text-sm font-medium rounded-sm transition-colors ${timeOfDay === opt.value ? 'bg-glass-bg text-foreground' : 'text-foreground-muted hover:text-foreground-muted'}`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Days of Week */}
                        <div>
                            <label className="flex items-center gap-1.5 text-xs text-foreground-muted mb-2 font-medium">
                                <CalendarDays className="w-3.5 h-3.5" /> Days (Selected: {daysOfWeek.length})
                            </label>
                            <div className="flex justify-between gap-1">
                                {DAYS.map(day => {
                                    const isSelected = daysOfWeek.includes(day.value);
                                    return (
                                        <button
                                            key={day.value}
                                            type="button"
                                            onClick={() => toggleDay(day.value)}
                                            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${isSelected ? 'bg-accent-blue/10 text-accent-blue border border-accent-blue/30' : 'bg-background-tertiary text-foreground-muted border border-transparent'}`}
                                        >
                                            {day.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-line bg-background-secondary shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom))] flex gap-3">
                        {supplementToEdit && (
                            <button
                                onClick={async () => {
                                    const isConfirmed = await confirm({
                                        title: 'Delete Supplement',
                                        message: 'Are you sure you want to delete this supplement entirely?',
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
                            {submitMutation.isPending ? (
                                'Saving...'
                            ) : (
                                <>
                                    <Save className="w-4 h-4" /> Save Supplement
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
            <ConfirmDialog />
        </>
    );
}
