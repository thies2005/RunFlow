'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, Utensils, Zap, Play, Square } from 'lucide-react';
import { differenceInSeconds } from 'date-fns';

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
            <div className="glass-card p-5 flex items-center justify-center h-[200px]">
                <div className="text-foreground-muted flex flex-col items-center">
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
        <div className="glass-card p-5 relative overflow-hidden">
            <div>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
                        {isFasting ? <Zap className="w-4 h-4 text-accent-blue" /> : <Utensils className="w-4 h-4 text-accent-orange" />}
                        {isFasting ? 'Fasting' : 'Eating Window'}
                    </div>
                     <div className="text-xs font-semibold font-mono text-foreground-muted bg-background-tertiary px-2 py-0.5 rounded-md">
                        {goalHours}h Goal
                    </div>
                </div>

                <div className="flex items-center justify-between mt-4">
                    {/* Circle Timer */}
                    <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                        {isFasting ? (
                            <>
                                <svg className="transform -rotate-90 w-28 h-28 absolute inset-0">
                                    <circle cx="56" cy="56" r="50" stroke="var(--line)" strokeWidth="6" fill="transparent" />
                                    <circle
                                        cx="56"
                                        cy="56"
                                        r="50"
                                        stroke={progressPct >= 100 ? 'var(--positive)' : 'var(--accent-blue)'}
                                        strokeWidth="6"
                                        fill="transparent"
                                        strokeDasharray={circumference}
                                        strokeDashoffset={strokeDashoffset}
                                        strokeLinecap="round"
                                        className="transition-all duration-1000 ease-in-out"
                                    />
                                </svg>
                                <div className="text-center">
                                    <span className="block text-xl font-semibold font-mono tabular-nums text-foreground mt-1">
                                        {formatTime(elapsedSeconds)}
                                    </span>
                                    <span className={`block text-[10px] font-semibold mt-0.5 ${progressPct >= 100 ? 'text-positive' : 'text-foreground-muted'}`}>
                                        {progressPct >= 100 ? 'Goal Reached' : 'Elapsed'}
                                    </span>
                                </div>
                            </>
                        ) : (
                            <div className="w-24 h-24 rounded-full border-4 border-dashed border-accent-orange/30 flex items-center justify-center bg-accent-orange/5">
                                <Utensils className="w-8 h-8 text-accent-orange/50" />
                            </div>
                        )}
                    </div>

                    {/* Controls */}
                    <div className="flex-1 flex flex-col items-end justify-center space-y-3 pl-4">
                        {isFasting ? (
                            <>
                                <div className="text-right mb-1">
                                    <div className="text-xs text-foreground-muted font-medium">Remaining</div>
                                    <div className="text-sm font-semibold font-mono tabular-nums text-foreground">
                                        {remainingMinutes > 0 ? `${Math.floor(remainingMinutes / 60)}h ${remainingMinutes % 60}m` : '0h 0m'}
                                    </div>
                                </div>

                                <button
                                    onClick={() => actionMutation.mutate('end')}
                                    disabled={actionMutation.isPending}
                                    className="w-full bg-accent-orange/10 hover:bg-accent-orange/20 text-accent-orange border border-accent-orange/30 font-semibold py-2 rounded-md transition-colors flex items-center justify-center gap-1.5 text-xs"
                                >
                                    <Square className="w-3.5 h-3.5 fill-current" /> End Fast
                                </button>

                                <button
                                    onClick={() => actionMutation.mutate('cancel')}
                                    disabled={actionMutation.isPending}
                                    className="text-[10px] text-foreground-muted hover:text-negative transition-colors font-semibold"
                                >
                                    Cancel
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="text-right mb-2">
                                    <div className="text-sm text-foreground-muted leading-tight">Ready to begin your<br/>next fast?</div>
                                </div>
                                <button
                                    onClick={() => actionMutation.mutate('start')}
                                    disabled={actionMutation.isPending}
                                    className="w-full bg-accent-orange hover:bg-accent-orange/90 text-white font-semibold py-2 rounded-md transition-colors flex items-center justify-center gap-1.5 text-xs"
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
