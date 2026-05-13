'use client';

import { TrendingUp, TrendingDown, Minus, Target } from 'lucide-react';

interface RaceReadinessCardProps {
    predictedTime: number | null;
    confidence: number;
    trajectory: string;
    targetTime?: number;
}

function formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.round(seconds % 60);
    if (h > 0) {
        return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${m}:${String(s).padStart(2, '0')}`;
}

const TRAJECTORY_CONFIG: Record<string, { label: string; color: string; icon: typeof TrendingUp }> = {
    on_track: { label: 'On Track', color: 'text-green-400', icon: TrendingUp },
    at_risk: { label: 'At Risk', color: 'text-amber-400', icon: TrendingDown },
    behind: { label: 'Behind', color: 'text-red-400', icon: Minus },
};

export function RaceReadinessCard({ predictedTime, confidence, trajectory, targetTime }: RaceReadinessCardProps) {
    const config = TRAJECTORY_CONFIG[trajectory] || TRAJECTORY_CONFIG.at_risk;
    const TrajectoryIcon = config.icon;

    const diff = predictedTime != null && targetTime != null ? predictedTime - targetTime : null;
    let diffLabel: string | null = null;
    if (diff != null) {
        if (diff > 0) diffLabel = formatTime(diff) + ' slower';
        else if (diff < 0) diffLabel = formatTime(Math.abs(diff)) + ' faster';
        else diffLabel = 'On target';
    }
    let diffColor = '';
    if (diff != null) {
        if (diff > 0) diffColor = 'text-red-400';
        else if (diff < 0) diffColor = 'text-green-400';
        else diffColor = 'text-zinc-400';
    }

    return (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5" />
                    Race Readiness
                </h4>
                <span className={`flex items-center gap-1 text-[11px] font-medium ${config.color}`}>
                    <TrajectoryIcon className="w-3 h-3" />
                    {config.label}
                </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <p className="text-[10px] text-zinc-600 uppercase tracking-wide">Predicted</p>
                    <p className="text-lg font-bold text-zinc-100">
                        {predictedTime != null ? formatTime(predictedTime) : '--:--'}
                    </p>
                </div>
                {targetTime != null && (
                    <div>
                        <p className="text-[10px] text-zinc-600 uppercase tracking-wide">Target</p>
                        <p className="text-lg font-bold text-zinc-100">{formatTime(targetTime)}</p>
                    </div>
                )}
            </div>

            {diffLabel && (
                <div className="flex items-center justify-center">
                    <span className={`text-[11px] font-medium ${diffColor}`}>{diffLabel}</span>
                </div>
            )}

            <div>
                <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-zinc-500">Confidence</span>
                    <span className="text-[10px] text-zinc-400">{Math.round(confidence)}%</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                            width: `${Math.min(100, confidence)}%`,
                            backgroundColor: confidence >= 70 ? '#22c55e' : confidence >= 40 ? '#eab308' : '#ef4444',
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
