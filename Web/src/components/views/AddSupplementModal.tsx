'use client';

import { useState } from 'react';
import { X, Save, Clock, CalendarDays } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface AddSupplementModalProps {
    isOpen: boolean;
    onClose: () => void;
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

export function AddSupplementModal({ isOpen, onClose }: AddSupplementModalProps) {
    const queryClient = useQueryClient();

    const [name, setName] = useState('');
    const [amount, setAmount] = useState('1');
    const [unit, setUnit] = useState('pill(s)');
    const [timeOfDay, setTimeOfDay] = useState('MORNING');
    const [daysOfWeek, setDaysOfWeek] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

    const createMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/health/supplements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    amount,
                    unit,
                    timeOfDay,
                    daysOfWeek
                })
            });
            if (!res.ok) throw new Error('Failed to add supplement');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['supplements'] });
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
        <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-black/60 backdrop-blur-sm sm:items-center sm:justify-center">
            <div
                className="bg-[#1c1c1e] w-full max-w-md rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[90vh] shadow-2xl overflow-hidden animate-in slide-in-from-bottom"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
                    <h2 className="text-lg font-bold text-white">Add Supplement</h2>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 text-gray-400 hover:text-white transition-colors"
                        type="button"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 overflow-y-auto flex-1 space-y-6">
                    {/* Name */}
                    <div>
                        <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1.5 font-medium">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Vitamin D3, Omega-3"
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50"
                        />
                    </div>

                    {/* Dosage */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1.5 font-medium">Amount</label>
                            <input
                                type="number"
                                step="any"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-red-500/50"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1.5 font-medium">Unit</label>
                            <select
                                value={unit}
                                onChange={(e) => setUnit(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-red-500/50 appearance-none"
                            >
                                <option value="pill(s)">pill(s)</option>
                                <option value="mg">mg</option>
                                <option value="g">g</option>
                                <option value="ml">ml</option>
                                <option value="scoop(s)">scoop(s)</option>
                                <option value="gummy">gummy</option>
                            </select>
                        </div>
                    </div>

                    {/* Time of Day */}
                    <div>
                        <label className="flex items-center gap-1.5 text-xs text-gray-400 uppercase tracking-widest mb-2 font-medium">
                            <Clock className="w-3.5 h-3.5" /> Time of Day
                        </label>
                        <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
                            {TIME_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setTimeOfDay(opt.value)}
                                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${timeOfDay === opt.value ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-gray-300'}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Days of Week */}
                    <div>
                        <label className="flex items-center gap-1.5 text-xs text-gray-400 uppercase tracking-widest mb-2 font-medium">
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
                                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${isSelected ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-white/5 text-gray-400 border border-transparent'}`}
                                    >
                                        {day.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 bg-[#1c1c1e] shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                    <button
                        onClick={() => createMutation.mutate()}
                        disabled={!name.trim() || createMutation.isPending}
                        className="w-full py-3 bg-white text-black font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 disabled:opacity-50 transition-colors"
                    >
                        {createMutation.isPending ? (
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
    );
}
