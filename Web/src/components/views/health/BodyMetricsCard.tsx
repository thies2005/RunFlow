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
                        className="glass-card glass-card-hover p-4 text-left"
                    >
                        <div className="flex items-center gap-2 text-positive font-medium mb-2">
                            <ActivitySquare className="w-4 h-4" /> <span className="text-xs text-foreground-muted">Steps</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-semibold font-mono tabular-nums text-foreground">{dailyHealth?.steps || 0}</span>
                        </div>
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => onOpenTrend('weight')}
                    className={`glass-card glass-card-hover p-4 text-left ${!showSteps ? 'col-span-1' : ''}`}
                >
                    <div className="flex items-center gap-2 text-accent-blue font-medium mb-2">
                        <Activity className="w-4 h-4" /> <span className="text-xs text-foreground-muted">Weight</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-semibold font-mono tabular-nums text-foreground">{dailyHealth?.weight != null ? dailyHealth.weight.toFixed(1) : '--'}</span>
                        <span className="text-xs text-foreground-muted font-medium">kg</span>
                    </div>
                    <p className="text-[11px] text-foreground-muted mt-2">{weightLabel}</p>
                </button>
            </div>

            {targetData?.waterTrackingEnabled && (
                <div className="glass-card p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-semibold text-foreground-muted flex items-center gap-1.5">
                            <Droplets className="w-4 h-4 text-accent-blue" />
                            Water
                        </h4>
                        <span className="text-xs font-semibold font-mono tabular-nums text-accent-blue">
                            {((dailyHealth?.waterIntake || 0) / 1000).toFixed(1)}L / {((targetData?.waterGoalMl || 2500) / 1000).toFixed(1)}L
                        </span>
                    </div>
                    <div className="h-2 w-full bg-background-tertiary rounded-full mb-3 overflow-hidden">
                        <div
                            className="h-full rounded-full bg-accent-blue transition-all duration-500"
                            style={{ width: `${Math.min(100, ((dailyHealth?.waterIntake || 0) / (targetData?.waterGoalMl || 2500)) * 100)}%` }}
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => onAdjustWater(-250)}
                            disabled={waterMutationPending || (dailyHealth?.waterIntake || 0) <= 0}
                            aria-label="Remove one glass of water"
                            className="w-10 h-10 rounded-full border border-line hover:bg-background-tertiary flex items-center justify-center disabled:opacity-30 transition-colors"
                        >
                            <Minus className="w-4 h-4 text-foreground" />
                        </button>
                        <button
                            type="button"
                            onClick={() => onAdjustWater(250)}
                            disabled={waterMutationPending}
                            className="flex-1 py-2 rounded-md bg-accent-blue/10 hover:bg-accent-blue/20 border border-accent-blue/30 text-accent-blue text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
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
