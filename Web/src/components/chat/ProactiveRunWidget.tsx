'use client';

import React from 'react';
import { TrendingUp } from 'lucide-react';

export interface RecentActivity {
    id: string;
    name: string;
    type: string;
    distance: number;
    movingTime: number;
    startDate: string;
    averageHr?: number;
}

function getTimeAgo(dateString: string) {
    const activityDate = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - activityDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 60) return `${diffMins} mins ago`;
    if (diffHours === 1) return `1 hour ago`;
    return `${diffHours} hours ago`;
}

interface ProactiveRunWidgetProps {
    activity: RecentActivity;
    onAutoFillChat: (_text: string) => void;
}

export default function ProactiveRunWidget({ activity, onAutoFillChat }: ProactiveRunWidgetProps) {
    if (!activity) return null;

    const distanceKm = (activity.distance / 1000).toFixed(1);
    const paceSeconds = activity.distance > 0 ? activity.movingTime / (activity.distance / 1000) : 0;
    const paceMin = Math.floor(paceSeconds / 60);
    const paceSec = Math.floor(paceSeconds % 60).toString().padStart(2, '0');

    return (
        <div className="bg-background-secondary border border-line rounded-md p-4 hover:bg-surface-hover transition-colors group relative overflow-hidden">
            <div className="flex items-start justify-between mb-5">
                <div>
                    <h4 className="text-lg font-bold text-foreground mb-1">{activity.name}</h4>
                    <span className="text-sm text-foreground-muted">{getTimeAgo(activity.startDate)}</span>
                </div>
                <div className="w-10 h-10 rounded-md bg-background-tertiary flex items-center justify-center border border-line">
                    <TrendingUp className="w-5 h-5 text-accent-blue" />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-6">
                <div>
                    <p className="text-[10px] font-bold text-foreground-muted mb-1">Distance</p>
                    <p className="text-lg font-bold font-mono tabular-nums text-foreground">{distanceKm} <span className="text-sm text-foreground-muted font-normal">km</span></p>
                </div>
                <div>
                    <p className="text-[10px] font-bold text-foreground-muted mb-1">Avg Pace</p>
                    <p className="text-lg font-bold font-mono tabular-nums text-foreground">{paceMin}:{paceSec} <span className="text-sm text-foreground-muted font-normal">/km</span></p>
                </div>
                <div>
                    <p className="text-[10px] font-bold text-foreground-muted mb-1">Avg HR</p>
                    <p className="text-lg font-bold font-mono tabular-nums text-negative">
                        {activity.averageHr ? Math.round(activity.averageHr) : '-'} <span className="text-sm text-foreground-muted font-normal">bpm</span>
                    </p>
                </div>
            </div>

            <button
                onClick={() => onAutoFillChat(`Can you analyze my pacing and heart rate for my recent run "${activity.name}"?`)}
                className="w-full flex items-center justify-center py-3 px-4 rounded-md bg-accent-blue/10 hover:bg-accent-blue/20 border border-accent-blue/30 text-accent-blue text-sm font-semibold transition-colors"
            >
                Ask AI to analyze pacing
            </button>
        </div>
    );
}
