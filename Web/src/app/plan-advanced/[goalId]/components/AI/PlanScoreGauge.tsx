'use client';

interface PlanScoreGaugeProps {
    score: number;
}

function getScoreColor(score: number): string {
    if (score < 40) return '#ef4444';
    if (score < 60) return '#f97316';
    if (score < 75) return '#eab308';
    return '#22c55e';
}

function getScoreLabel(score: number): string {
    if (score < 40) return 'Needs Work';
    if (score < 60) return 'Fair';
    if (score < 75) return 'Good';
    return 'Excellent';
}

export function PlanScoreGauge({ score }: PlanScoreGaugeProps) {
    const clampedScore = Math.max(0, Math.min(100, score));
    const color = getScoreColor(clampedScore);
    const label = getScoreLabel(clampedScore);

    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const progress = (clampedScore / 100) * circumference;
    const dashOffset = circumference - progress;

    return (
        <div className="flex flex-col items-center">
            <div className="relative w-32 h-32">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
                    <circle
                        cx="64"
                        cy="64"
                        r={radius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-zinc-800"
                    />
                    <circle
                        cx="64"
                        cy="64"
                        r={radius}
                        fill="none"
                        stroke={color}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={dashOffset}
                        className="transition-all duration-700 ease-out"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-zinc-100">{Math.round(clampedScore)}</span>
                    <span className="text-[10px] text-zinc-500">/ 100</span>
                </div>
            </div>
            <span className="text-xs font-medium mt-1" style={{ color }}>{label}</span>
            <span className="text-[10px] text-zinc-600">Plan Quality</span>
        </div>
    );
}
