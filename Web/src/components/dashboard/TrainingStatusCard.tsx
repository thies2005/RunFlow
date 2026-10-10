import { TrendingUp, Activity, Gauge } from 'lucide-react';
import { useUserMetrics } from '../providers/UserMetricsProvider';
import { interpretTsb } from '@/lib/metrics/fitness';
import { useState } from 'react';

export default function TrainingStatusCard() {
    const {
        marathonShape,
        effectiveVO2max,
        correctionFactor,
        ctl,
        atl,
        tsb,
        workloadRatio,
        easyTrimp,
        maxCtl,
        maxAtl,
        ctlPercent,
        atlPercent
    } = useUserMetrics();

    const [showAbsoluteAtl, setShowAbsoluteAtl] = useState(false);
    const [showAbsoluteCtl, setShowAbsoluteCtl] = useState(false);

    const shapePercent = marathonShape?.shape || 0;

    const workloadStatus = (ratio: number) => {
        if (ratio <= 0) return { label: 'No Data', color: 'text-foreground-muted', bg: 'bg-foreground-muted' };
        if (ratio < 0.8) return { label: 'Recovery', color: 'text-accent-cyan', bg: 'bg-accent-cyan' };
        if (ratio <= 1.3) return { label: 'Optimal', color: 'text-positive', bg: 'bg-positive' };
        if (ratio <= 1.5) return { label: 'Caution', color: 'text-workout-tempo', bg: 'bg-workout-tempo' };
        return { label: 'Overload', color: 'text-negative', bg: 'bg-negative' };
    };

    const status = workloadStatus(workloadRatio);
    // Linear mapping: 0.0 -> 0%, 2.0 -> 100%
    const markerPos = Math.min(100, (workloadRatio / 2) * 100);

    // Check for empty data
    const hasData = ctl > 0 || atl > 0 || effectiveVO2max > 0;

    if (!hasData) {
        return (
            <div className="glass-card p-6 h-full flex flex-col items-center justify-center min-h-[400px] text-center">
                <div className="w-16 h-16 bg-background-tertiary rounded-full flex items-center justify-center mb-4">
                    <Activity className="w-8 h-8 text-foreground-muted" />
                </div>
                <h3 className="text-lg font-semibold text-foreground-muted mb-2">No Training Data</h3>
                <p className="text-sm text-foreground-muted max-w-[200px]">
                    Sync your activities to see your training status and fitness metrics.
                </p>
            </div>
        );
    }

    const tsbStatus = interpretTsb(tsb);

    return (
        <div className="glass-card p-6 h-full flex flex-col justify-between min-h-[400px]">
            <h2 className="text-lg font-semibold text-foreground-muted mb-6 shrink-0">Training Status</h2>

            {/* Top Metrics Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8 shrink-0">
                {/* Marathon Shape */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-workout-recovery/15 flex items-center justify-center shrink-0">
                        <TrendingUp className="w-5 h-5 text-workout-recovery" />
                    </div>
                    <div>
                        <p className="text-xs text-foreground-muted font-semibold leading-tight">Shape</p>
                        <p className="text-2xl font-mono tabular-nums font-semibold text-foreground leading-tight">{shapePercent}%</p>
                    </div>
                </div>

                {/* Effective VO2max */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-accent-cyan/15 flex items-center justify-center shrink-0">
                        <Activity className="w-5 h-5 text-accent-cyan" />
                    </div>
                    <div className="flex-1">
                        <p className="text-xs text-foreground-muted font-semibold leading-tight">VO2max</p>
                        <div className="flex items-baseline justify-between">
                            <p className="text-2xl font-mono tabular-nums font-semibold text-foreground leading-tight">
                                {effectiveVO2max > 0 ? effectiveVO2max.toFixed(1) : '-'}
                            </p>
                            {correctionFactor !== 1.0 && (
                                <span className="text-xs font-mono tabular-nums text-accent-cyan font-semibold bg-accent-cyan/10 px-1 py-0.5 rounded leading-none shrink-0 border border-accent-cyan/20">
                                    {correctionFactor.toFixed(1)}x
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Workload Balance Diagram */}
            <div className="bg-background-tertiary rounded-md p-4 mb-8 border border-line relative overflow-hidden shrink-0">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Gauge className={`w-3.5 h-3.5 ${status.color}`} />
                        <span className="text-xs text-foreground-muted font-semibold">Workload Balance</span>
                    </div>
                    <span className={`text-xs font-semibold ${status.color} px-2 py-0.5 rounded-full bg-background-secondary border border-line`}>
                        {status.label}
                    </span>
                </div>

                <div className="relative h-2 w-full bg-background-secondary rounded-full mb-3">
                    {/* Zones (Scale 0 - 2.0) */}
                    <div className="absolute left-0 w-[40%] h-full bg-background-secondary rounded-l-full border-r border-line" />
                    <div className="absolute left-[40%] w-[25%] h-full bg-positive/20" />
                    <div className="absolute left-[65%] w-[10%] h-full bg-workout-tempo/20" />
                    <div className="absolute left-[75%] w-[25%] h-full bg-negative/20 rounded-r-full border-l border-line" />

                    {/* Sweet Spot Guide */}
                    <div className="absolute left-[40%] -top-1 w-[25%] h-4 border-x border-line pointer-events-none" />

                    {/* Marker */}
                    <div
                        className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-background-secondary rounded-full border-2 ${status.bg} z-20 transition-all duration-1000`}
                        style={{ left: `calc(${markerPos}% - 8px)` }}
                    />
                </div>

                <div className="flex justify-between text-xs text-foreground-muted font-semibold px-1">
                    <span>Low</span>
                    <span className="text-positive/70 font-semibold absolute left-[35%] -translate-x-1/2">Sweet Spot (0.8 - 1.3)</span>
                    <span className="font-mono tabular-nums">{workloadRatio > 2 ? workloadRatio.toFixed(2) : '2.0+'}</span>
                </div>
            </div>

            {/* Metrics List (Runalyze Style) */}
            <div className="space-y-5 flex-1 flex flex-col justify-center border-t border-line pt-6">
                {/* Fatigue (ATL) */}
                <div
                    className="flex items-center gap-3 cursor-pointer group"
                    title={`${Math.round(atlPercent)}% (Abs: ${atl} / Max: ${maxAtl})`}
                    onClick={() => setShowAbsoluteAtl(!showAbsoluteAtl)}
                >
                    <div className="w-32 text-xs text-foreground-muted font-semibold truncate">Fatigue (ATL)</div>
                    <div className="flex-1 h-1.5 bg-background-tertiary rounded-full overflow-hidden">
                        <div className="h-full bg-negative transition-all duration-500" style={{ width: `${Math.min(100, atlPercent)}%` }} />
                    </div>
                    <div className="w-14 text-right text-sm font-mono tabular-nums font-semibold text-negative">
                        {atl > 0 ? (showAbsoluteAtl ? atl : `${Math.round(atlPercent)}%`) : '-'}
                    </div>
                </div>

                {/* Fitness (CTL) */}
                <div
                    className="flex items-center gap-3 cursor-pointer group"
                    title={`${Math.round(ctlPercent)}% (Abs: ${ctl} / Max: ${maxCtl})`}
                    onClick={() => setShowAbsoluteCtl(!showAbsoluteCtl)}
                >
                    <div className="w-32 text-xs text-foreground-muted font-semibold truncate">Fitness (CTL)</div>
                    <div className="flex-1 h-1.5 bg-background-tertiary rounded-full overflow-hidden">
                        <div className="h-full bg-accent-blue transition-all duration-500" style={{ width: `${Math.min(100, ctlPercent)}%` }} />
                    </div>
                    <div className="w-14 text-right text-sm font-mono tabular-nums font-semibold text-accent-blue">
                        {ctl > 0 ? (showAbsoluteCtl ? ctl : `${Math.round(ctlPercent)}%`) : '-'}
                    </div>
                </div>

                {/* Stress Balance (TSB) */}
                <div className="flex items-center gap-3">
                    <div className="w-32 text-xs text-foreground-muted font-semibold truncate">Stress Balance</div>
                    <div className="flex-1 h-1.5 bg-background-tertiary rounded-full overflow-hidden relative">
                        <div className="absolute left-1/2 w-[1px] h-full bg-line" />
                        <div
                            className={`h-full ${tsb >= 0 ? 'bg-positive' : 'bg-workout-tempo'} absolute transition-all duration-500`}
                            style={{
                                width: `${Math.min(50, Math.abs(tsb))}%`,
                                left: tsb >= 0 ? '50%' : `${50 - Math.min(50, Math.abs(tsb))}%`
                            }}
                        />
                    </div>
                    <div className={`w-14 text-right text-sm font-mono tabular-nums font-semibold ${tsbStatus.color}`}>
                        {tsb >= 0 ? `+${tsb}` : tsb}
                    </div>
                </div>

                {/* Weekly TRIMP */}
                <div className="flex items-center gap-3">
                    <div className="w-32 text-xs text-foreground-muted font-semibold truncate">Weekly TRIMP</div>
                    <div className="flex-1 h-1.5 bg-background-tertiary rounded-full overflow-hidden">
                        <div className="h-full bg-workout-long-run transition-all duration-500" style={{ width: `${Math.min(100, easyTrimp / 5)}%` }} />
                    </div>
                    <div className="w-14 text-right text-sm font-mono tabular-nums font-semibold text-workout-long-run underline decoration-workout-long-run/30 underline-offset-2">
                        {easyTrimp > 0 ? easyTrimp : '-'}
                    </div>
                </div>
            </div>
        </div>
    );
}
