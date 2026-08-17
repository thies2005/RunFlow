import { Activity, ActivitySquare, Droplets, Minus } from 'lucide-react';
import { formatUtcDayKey } from '@/lib/health/dates';

interface Props {
    showSteps: boolean;
    dailyHealth: { steps?: number; weight?: number | null; activeCalories?: number | null; isWeightCarriedForward?: boolean; weightMeasurementDate?: string; waterIntake?: number } | null;
    targetData: { dailyCalories: number; waterGoalMl?: number; waterTrackingEnabled?: boolean } | null;
    waterMutationPending: boolean;
    onOpenTrend: (_metric: 'steps' | 'weight') => void;
    onAdjustWater: (_amount: number) => void;
}

export function BodyMetricsCard({
    showSteps,
    dailyHealth,
    targetData,
    waterMutationPending,
    onOpenTrend,
    onAdjustWater,
}: Props) {
    const weightLabel = dailyHealth?.isWeightCarriedForward && dailyHealth?.weightMeasurementDate
        ? `Latest from ${formatUtcDayKey(dailyHealth.weightMeasurementDate, { month: 'short', day: 'numeric' })}`
        : dailyHealth?.weight != null
            ? 'Today'
            : 'No weight logged';

    return (
        <>
            <div className={`grid gap-4 ${showSteps ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {showSteps && (
                    <button
                        type="button"
                        onClick={() => onOpenTrend('steps')}
                        className="glass-card border border-glass-border rounded-2xl p-4 text-left transition-all hover:bg-foreground/10 active:scale-[0.98]"
                    >
                        <div className="flex items-center gap-2 text-green-400 font-medium mb-2">
                            <ActivitySquare className="w-4 h-4" /> <span className="text-xs uppercase tracking-widest text-foreground-muted">Steps</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-foreground">{dailyHealth?.steps || 0}</span>
                        </div>
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => onOpenTrend('weight')}
                    className={`glass-card border border-glass-border rounded-2xl p-4 text-left transition-all hover:bg-foreground/10 active:scale-[0.98] ${!showSteps ? 'col-span-1' : ''}`}
                >
                    <div className="flex items-center gap-2 text-blue-400 font-medium mb-2">
                        <Activity className="w-4 h-4" /> <span className="text-xs uppercase tracking-widest text-foreground-muted">Weight</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-foreground">{dailyHealth?.weight != null ? dailyHealth.weight.toFixed(1) : '--'}</span>
                        <span className="text-xs text-foreground-muted font-medium">kg</span>
                    </div>
                    <p className="text-[11px] text-foreground-muted mt-2">{weightLabel}</p>
                </button>
            </div>

            {targetData?.waterTrackingEnabled && (
                <div className="glass-card border border-glass-border rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-foreground-muted flex items-center gap-1.5">
                            <Droplets className="w-4 h-4 text-blue-400" />
                            Water
                        </h4>
                        <span className="text-xs text-blue-400 font-semibold">
                            {((dailyHealth?.waterIntake || 0) / 1000).toFixed(1)}L / {((targetData?.waterGoalMl || 2500) / 1000).toFixed(1)}L
                        </span>
                    </div>
                    <div className="h-2 w-full bg-foreground/10 rounded-full mb-3 overflow-hidden">
                        <div
                            className="h-full rounded-full bg-blue-500 transition-all duration-500"
                            style={{ width: `${Math.min(100, ((dailyHealth?.waterIntake || 0) / (targetData?.waterGoalMl || 2500)) * 100)}%` }}
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => onAdjustWater(-250)}
                            disabled={waterMutationPending || (dailyHealth?.waterIntake || 0) <= 0}
                            aria-label="Remove one glass of water"
                            className="w-10 h-10 rounded-full border border-foreground/10 hover:bg-foreground/10 flex items-center justify-center disabled:opacity-30 transition-colors"
                        >
                            <Minus className="w-4 h-4 text-foreground" />
                        </button>
                        <button
                            type="button"
                            onClick={() => onAdjustWater(250)}
                            disabled={waterMutationPending}
                            className="flex-1 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                        >
                            <Droplets className="w-4 h-4" />
                            {waterMutationPending ? 'Updating...' : '+1 glass (250ml)'}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
