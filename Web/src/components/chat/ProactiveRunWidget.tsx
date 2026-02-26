'use client';

import React, { useEffect, useState } from 'react';
import { Activity, Loader2, Sparkles } from 'lucide-react';

interface ProactiveRunWidgetProps {
    onAutoFillChat: (text: string) => void;
}

interface RecentActivity {
    id: string;
    name: string;
    type: string;
    distance: number;
    movingTime: number;
    startDate: string;
    averageHr?: number;
}

export default function ProactiveRunWidget({ onAutoFillChat }: ProactiveRunWidgetProps) {
    const [activity, setActivity] = useState<RecentActivity | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchRecentActivity() {
            try {
                // Fetch recent activities (fallback approach as planned)
                const res = await fetch('/api/activities?limit=5');
                if (!res.ok) throw new Error('Failed to fetch');
                const data = await res.json();

                if (data.activities && data.activities.length > 0) {
                    const mostRecent = data.activities[0];
                    // Check if it's from today
                    const activityDate = new Date(mostRecent.startDate);
                    const today = new Date();

                    if (
                        activityDate.getDate() === today.getDate() &&
                        activityDate.getMonth() === today.getMonth() &&
                        activityDate.getFullYear() === today.getFullYear()
                    ) {
                        setActivity(mostRecent);
                    }
                }
            } catch (err) {
                console.error('Error fetching proactive run data:', err);
            } finally {
                setIsLoading(false);
            }
        }

        fetchRecentActivity();
    }, []);

    if (isLoading) {
        return (
            <div className="glass-card p-4 rounded-xl flex justify-center items-center">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
        );
    }

    if (!activity) return null;

    const distanceKm = (activity.distance / 1000).toFixed(2);
    const paceSeconds = activity.distance > 0 ? activity.movingTime / (activity.distance / 1000) : 0;
    const paceMin = Math.floor(paceSeconds / 60);
    const paceSec = Math.floor(paceSeconds % 60).toString().padStart(2, '0');

    return (
        <div className="glass-card p-4 rounded-xl border border-blue-500/20 shadow-lg shadow-blue-500/5 hover-card relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-50" />

            <div className="relative z-10">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <Activity className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-xs text-blue-400/80 font-medium uppercase tracking-wider">You just finished</p>
                            <h4 className="text-sm font-semibold text-white">{activity.name}</h4>
                        </div>
                    </div>
                    <span className="text-xs text-gray-400 truncate max-w-[80px]">Today</span>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-black/20 rounded-lg p-2 text-center">
                        <p className="text-xs text-gray-400 mb-1">Distance</p>
                        <p className="text-sm font-bold text-white">{distanceKm} <span className="text-xs text-gray-500 font-normal">km</span></p>
                    </div>
                    <div className="bg-black/20 rounded-lg p-2 text-center">
                        <p className="text-xs text-gray-400 mb-1">Avg Pace</p>
                        <p className="text-sm font-bold text-white">{paceMin}:{paceSec} <span className="text-xs text-gray-500 font-normal">/km</span></p>
                    </div>
                    <div className="bg-black/20 rounded-lg p-2 text-center">
                        <p className="text-xs text-gray-400 mb-1">Avg HR</p>
                        <p className="text-sm font-bold text-white">
                            {activity.averageHr ? Math.round(activity.averageHr) : '-'} <span className="text-xs text-gray-500 font-normal">bpm</span>
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => onAutoFillChat(`Can you analyze my pacing and heart rate for my recent run "${activity.name}"?`)}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 text-sm font-medium transition-colors"
                >
                    <Sparkles className="w-4 h-4" />
                    Ask AI to analyze pacing
                </button>
            </div>
        </div>
    );
}
