'use client';

import { useQuery } from '@tanstack/react-query';
import { X, Calendar as CalendarIcon, Activity as ActivityIcon } from 'lucide-react';
import { format, subDays, isSameDay } from 'date-fns';

interface SupplementStatsModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetId: string | null; // Can be supplementId or stackId
    targetType: 'supplement' | 'stack' | null;
    targetName: string;
}

export function SupplementStatsModal({ isOpen, onClose, targetId, targetType, targetName }: SupplementStatsModalProps) {
    const daysToFetch = 30; // 30 day history

    const { data: statsData, isLoading } = useQuery({
        queryKey: ['supplement-stats', targetId, targetType],
        queryFn: async () => {
            if (!targetId || !targetType) return null;
            const paramName = targetType === 'stack' ? 'stackId' : 'supplementId';
            const res = await fetch(`/api/health/supplements/stats?${paramName}=${targetId}&days=${daysToFetch}`);
            if (!res.ok) throw new Error('Failed to fetch stats');
            return res.json();
        },
        enabled: isOpen && !!targetId && !!targetType,
    });

    if (!isOpen) return null;

    // Generate last 30 days array for the grid
    const today = new Date();
    const pastDays = Array.from({ length: daysToFetch }).map((_, i) => subDays(today, daysToFetch - 1 - i));

    const getDayStatus = (date: Date) => {
        if (!statsData?.logs) return false;
        return statsData.logs.some((log: any) => isSameDay(new Date(log.date), date) && log.taken);
    };

    return (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-black/60 backdrop-blur-sm sm:items-center sm:justify-center">
            <div className="bg-[#1c1c1e] w-full max-w-md rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[90vh] shadow-2xl overflow-hidden animate-in slide-in-from-bottom">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <ActivityIcon className="w-5 h-5 text-blue-400" />
                            Statistics
                        </h2>
                        <p className="text-xs text-gray-400 mt-0.5">{targetName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-white transition-colors" type="button">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 overflow-y-auto flex-1 space-y-6">
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <div className="w-8 h-8 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
                        </div>
                    ) : (
                        <>
                            {/* Hero Stat */}
                            <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-5 flex flex-col items-center justify-center text-center">
                                <span className="text-4xl font-black text-white mb-1">
                                    {statsData?.successRate || 0}<span className="text-xl text-blue-400">%</span>
                                </span>
                                <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">30-Day Adherence</span>
                            </div>

                            {/* Calendar Grid */}
                            <div>
                                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5">
                                    <CalendarIcon className="w-4 h-4 text-gray-400" /> Activity Map
                                </h3>
                                <div className="grid grid-cols-7 gap-1.5 p-3 bg-white/5 rounded-xl border border-white/10">
                                    {/* Days of week header (optional, keeping it simple without for now) */}
                                    {pastDays.map((date, i) => {
                                        const isTaken = getDayStatus(date);
                                        const isToday = isSameDay(date, today);

                                        return (
                                            <div
                                                key={i}
                                                title={format(date, 'MMM d, yyyy')}
                                                className={`
                                                    aspect-square rounded flex items-center justify-center text-[10px] font-medium transition-all
                                                    ${isTaken ? 'bg-green-500 text-green-950 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'bg-white/5 text-transparent border border-white/5'}
                                                    ${isToday && !isTaken ? 'ring-2 ring-white/20' : ''}
                                                `}
                                            >
                                                {/* Optional: Show day number inside the squares if they are big enough */}
                                                {/* {format(date, 'd')} */}
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 justify-end">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-3 h-3 rounded bg-white/5 border border-white/5" /> Missed
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-3 h-3 rounded bg-green-500" /> Taken
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
