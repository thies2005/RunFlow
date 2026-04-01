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
        <div className="bg-gray-900/80 border border-gray-700/50 rounded-2xl p-4 shadow-lg hover:bg-gray-800/80 transition-colors group relative overflow-hidden">
            <div className="flex items-start justify-between mb-5">
                <div>
                    <h4 className="text-lg font-bold text-white mb-1">{activity.name}</h4>
                    <span className="text-sm text-gray-400">{getTimeAgo(activity.startDate)}</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                    <TrendingUp className="w-5 h-5 text-blue-400" />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-6">
                <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Distance</p>
                    <p className="text-lg font-bold text-white">{distanceKm} <span className="text-sm text-gray-400 font-normal">km</span></p>
                </div>
                <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Avg Pace</p>
                    <p className="text-lg font-bold text-white">{paceMin}:{paceSec} <span className="text-sm text-gray-400 font-normal">/km</span></p>
                </div>
                <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Avg HR</p>
                    <p className="text-lg font-bold text-red-400">
                        {activity.averageHr ? Math.round(activity.averageHr) : '-'} <span className="text-sm text-gray-400 font-normal">bpm</span>
                    </p>
                </div>
            </div>

            <button
                onClick={() => onAutoFillChat(`Can you analyze my pacing and heart rate for my recent run "${activity.name}"?`)}
                className="w-full flex items-center justify-center py-3 px-4 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-sm font-semibold transition-colors"
            >
                Ask AI to analyze pacing
            </button>
        </div>
    );
}
