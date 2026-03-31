'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, Utensils, Zap, Play, Square } from 'lucide-react';
import { differenceInMinutes, differenceInSeconds } from 'date-fns';

export function FastingWidget() {
    const queryClient = useQueryClient();
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    const { data, isLoading } = useQuery({
        queryKey: ['fasting-state'],
        queryFn: async () => {
            const res = await fetch('/api/health/fasting');
            if (!res.ok) throw new Error('Failed to fetch fasting state');
            return res.json();
        }
    });

    const actionMutation = useMutation({
        mutationFn: async (action: 'start' | 'end' | 'cancel') => {
            const res = await fetch('/api/health/fasting', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action })
            });
            if (!res.ok) throw new Error('Failed fasting action');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fasting-state'] });
        }
    });

    if (isLoading) {
        return (
            <div className="glass-card border border-glass-border rounded-2xl p-5 flex items-center justify-center h-[200px]">
                <div className="animate-pulse text-gray-500 flex flex-col items-center">
                    <Clock className="w-6 h-6 mb-2 opacity-50" />
                    <span className="text-xs">Loading Timer...</span>
                </div>
            </div>
        );
    }

    const isEnabled = data?.enabled;
    if (!isEnabled) return null; // Don't render if disabled in settings

    const currentSession = data?.currentSession;
    const isFasting = !!currentSession;
    const goalHours = data?.goalHours || 16;
    const goalMinutes = goalHours * 60;

    let elapsedMinutes = 0;
    let elapsedSeconds = 0;
    let progressPct = 0;
    let remainingMinutes = goalMinutes;

    if (isFasting && currentSession?.startTime) {
        const start = new Date(currentSession.startTime);
        elapsedSeconds = differenceInSeconds(now, start);
        elapsedMinutes = Math.floor(elapsedSeconds / 60);
        remainingMinutes = Math.max(0, goalMinutes - elapsedMinutes);
        progressPct = Math.min(100, (elapsedMinutes / goalMinutes) * 100);
    }

    const formatTime = (totalSeconds: number) => {
        const h = Math.floor(Math.abs(totalSeconds) / 3600);
        const m = Math.floor((Math.abs(totalSeconds) % 3600) / 60);
        const s = Math.abs(totalSeconds) % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Calculate stroke dash array for SVG circle
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progressPct / 100) * circumference;

    return (
        <div className="glass-card border border-glass-border rounded-2xl p-5 relative overflow-hidden group">
            {/* Background effects */}
            <div className={`absolute inset-0 bg-gradient-to-br transition-colors duration-1000 opacity-10 z-0 ${isFasting ? 'from-blue-500 to-indigo-500' : 'from-orange-500 to-red-500'}`} />
            
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-white font-bold text-sm">
                        {isFasting ? <Zap className="w-4 h-4 text-blue-400" /> : <Utensils className="w-4 h-4 text-orange-400" />}
                        {isFasting ? 'Fasting' : 'Eating Window'}
                    </div>
                     <div className="text-xs font-semibold text-gray-400 bg-white/5 px-2 py-0.5 rounded-md">
                        {goalHours}h Goal
                    </div>
                </div>

                <div className="flex items-center justify-between mt-4">
                    {/* Circle Timer */}
                    <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                        {isFasting ? (
                            <>
                                <svg className="transform -rotate-90 w-28 h-28 absolute inset-0">
                                    <circle cx="56" cy="56" r="50" stroke="rgba(255,255,255,0.1)" strokeWidth="6" fill="transparent" />
                                    <circle
                                        cx="56"
                                        cy="56"
                                        r="50"
                                        stroke={progressPct >= 100 ? '#4ade80' : '#3b82f6'}
                                        strokeWidth="6"
                                        fill="transparent"
                                        strokeDasharray={circumference}
                                        strokeDashoffset={strokeDashoffset}
                                        strokeLinecap="round"
                                        className="transition-all duration-1000 ease-in-out"
                                    />
                                </svg>
                                <div className="text-center">
                                    <span className="block text-xl font-bold text-white tracking-tight tabular-nums mt-1">
                                        {formatTime(elapsedSeconds)}
                                    </span>
                                    <span className={`block text-[10px] font-bold uppercase mt-0.5 ${progressPct >= 100 ? 'text-green-400' : 'text-gray-400'}`}>
                                        {progressPct >= 100 ? 'Goal Reached' : 'Elapsed'}
                                    </span>
                                </div>
                            </>
                        ) : (
                            <div className="w-24 h-24 rounded-full border-4 border-dashed border-orange-500/30 flex items-center justify-center bg-orange-500/5">
                                <Utensils className="w-8 h-8 text-orange-400/50" />
                            </div>
                        )}
                    </div>

                    {/* Controls */}
                    <div className="flex-1 flex flex-col items-end justify-center space-y-3 pl-4">
                        {isFasting ? (
                            <>
                                <div className="text-right mb-1">
                                    <div className="text-xs text-gray-400 font-medium">Remaining</div>
                                    <div className="text-sm font-bold text-white tabular-nums">
                                        {remainingMinutes > 0 ? `${Math.floor(remainingMinutes / 60)}h ${remainingMinutes % 60}m` : '0h 0m'}
                                    </div>
                                </div>
                                
                                <button
                                    onClick={() => actionMutation.mutate('end')}
                                    disabled={actionMutation.isPending}
                                    className="w-full bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30 font-bold py-2 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 text-xs"
                                >
                                    <Square className="w-3.5 h-3.5 fill-current" /> End Fast
                                </button>
                                
                                <button 
                                    onClick={() => actionMutation.mutate('cancel')}
                                    disabled={actionMutation.isPending}
                                    className="text-[10px] text-gray-500 hover:text-red-400 transition-colors uppercase font-bold tracking-wider"
                                >
                                    Cancel
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="text-right mb-2">
                                    <div className="text-sm text-gray-300 leading-tight">Ready to begin your<br/>next fast?</div>
                                </div>
                                <button
                                    onClick={() => actionMutation.mutate('start')}
                                    disabled={actionMutation.isPending}
                                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-1.5 text-xs"
                                >
                                    <Play className="w-3.5 h-3.5 fill-current" /> Start Fasting
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
