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
        if (ratio <= 0) return { label: 'No Data', color: 'text-gray-500', bg: 'bg-gray-500' };
        if (ratio < 0.8) return { label: 'Recovery', color: 'text-teal-400', bg: 'bg-teal-500' };
        if (ratio <= 1.3) return { label: 'Optimal', color: 'text-green-500', bg: 'bg-green-500' };
        if (ratio <= 1.5) return { label: 'Caution', color: 'text-orange-400', bg: 'bg-orange-500' };
        return { label: 'Overload', color: 'text-red-500', bg: 'bg-red-500' };
    };

    const status = workloadStatus(workloadRatio);
    // Linear mapping: 0.0 -> 0%, 2.0 -> 100%
    const markerPos = Math.min(100, (workloadRatio / 2) * 100);

    // Check for empty data
    const hasData = ctl > 0 || atl > 0 || effectiveVO2max > 0;

    if (!hasData) {
        return (
            <div className="glass-card p-6 h-full flex flex-col items-center justify-center min-h-[400px] text-center">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                    <Activity className="w-8 h-8 text-gray-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-300 mb-2">No Training Data</h3>
                <p className="text-sm text-gray-500 max-w-[200px]">
                    Sync your activities to see your training status and fitness metrics.
                </p>
            </div>
        );
    }

    const tsbStatus = interpretTsb(tsb);

    return (
        <div className="glass-card p-6 h-full flex flex-col justify-between min-h-[400px]">
            <h2 className="text-lg font-semibold text-gray-300 mb-6 shrink-0">Training Status</h2>

            {/* Top Metrics Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8 shrink-0">
                {/* Marathon Shape */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-900/20">
                        <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 uppercase tracking-widest font-bold leading-tight">Shape</p>
                        <p className="text-2xl font-black text-white leading-tight">{shapePercent}%</p>
                    </div>
                </div>

                {/* Effective VO2max */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shrink-0 shadow-lg shadow-teal-900/20">
                        <Activity className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                        <p className="text-xs text-gray-400 uppercase tracking-widest font-bold leading-tight">VO2max</p>
                        <div className="flex items-baseline justify-between">
                            <p className="text-2xl font-black text-white leading-tight">
                                {effectiveVO2max > 0 ? effectiveVO2max.toFixed(1) : '-'}
                            </p>
                            {correctionFactor !== 1.0 && (
                                <span className="text-xs text-accent-cyan font-bold bg-accent-cyan/10 px-1 py-0.5 rounded leading-none shrink-0 border border-accent-cyan/20">
                                    {correctionFactor.toFixed(1)}x
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Workload Balance Diagram */}
            <div className="bg-white/5 rounded-2xl p-4 mb-8 border border-white/5 relative group overflow-hidden shrink-0">
                <div className={`absolute -right-4 -top-4 w-16 h-16 rounded-full blur-2xl ${status.bg} opacity-10 transition-all duration-1000 group-hover:opacity-20`} />

                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Gauge className={`w-3.5 h-3.5 ${status.color}`} />
                        <span className="text-xs text-gray-400 uppercase tracking-widest font-bold">Workload Balance</span>
                    </div>
                    <span className={`text-xs font-black ${status.color} px-2 py-0.5 rounded-full bg-white/5 border border-white/10 uppercase tracking-tighter`}>
                        {status.label}
                    </span>
                </div>

                <div className="relative h-2 w-full bg-white/5 rounded-full mb-3 shadow-inner">
                    {/* Zones (Scale 0 - 2.0) */}
                    <div className="absolute left-0 w-[40%] h-full bg-gray-500/10 rounded-l-full border-r border-white/5" />
                    <div className="absolute left-[40%] w-[25%] h-full bg-green-500/20" />
                    <div className="absolute left-[65%] w-[10%] h-full bg-orange-500/20" />
                    <div className="absolute left-[75%] w-[25%] h-full bg-red-500/20 rounded-r-full border-l border-white/5" />

                    {/* Sweet Spot Guide */}
                    <div className="absolute left-[40%] -top-1 w-[25%] h-4 border-x border-white/10 pointer-events-none" />

                    {/* Marker */}
                    <div
                        className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 ${status.bg} shadow-[0_0_12px_rgba(255,255,255,0.4)] z-20 transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)]`}
                        style={{ left: `calc(${markerPos}% - 8px)` }}
                    />
                </div>

                <div className="flex justify-between text-xs text-gray-500 font-black uppercase tracking-widest px-1">
                    <span>Low</span>
                    <span className="text-green-500/60 font-black absolute left-[35%] -translate-x-1/2">Sweet Spot (0.8 - 1.3)</span>
                    <span>{workloadRatio > 2 ? workloadRatio.toFixed(2) : '2.0+'}</span>
                </div>
            </div>

            {/* Metrics List (Runalyze Style) */}
            <div className="space-y-5 flex-1 flex flex-col justify-center border-t border-white/5 pt-6">
                {/* Fatigue (ATL) */}
                <div
                    className="flex items-center gap-3 cursor-pointer group"
                    title={`${Math.round(atlPercent)}% (Abs: ${atl} / Max: ${maxAtl})`}
                    onClick={() => setShowAbsoluteAtl(!showAbsoluteAtl)}
                >
                    <div className="w-32 text-xs text-gray-400 uppercase tracking-tighter font-bold truncate group-hover:text-gray-300 transition-colors">Fatigue (ATL)</div>
                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${Math.min(100, atlPercent)}%` }} />
                    </div>
                    <div className="w-14 text-right text-sm font-black text-red-400">
                        {atl > 0 ? (showAbsoluteAtl ? atl : `${Math.round(atlPercent)}%`) : '-'}
                    </div>
                </div>

                {/* Fitness (CTL) */}
                <div
                    className="flex items-center gap-3 cursor-pointer group"
                    title={`${Math.round(ctlPercent)}% (Abs: ${ctl} / Max: ${maxCtl})`}
                    onClick={() => setShowAbsoluteCtl(!showAbsoluteCtl)}
                >
                    <div className="w-32 text-xs text-gray-400 uppercase tracking-tighter font-bold truncate group-hover:text-gray-300 transition-colors">Fitness (CTL)</div>
                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${Math.min(100, ctlPercent)}%` }} />
                    </div>
                    <div className="w-14 text-right text-sm font-black text-blue-400">
                        {ctl > 0 ? (showAbsoluteCtl ? ctl : `${Math.round(ctlPercent)}%`) : '-'}
                    </div>
                </div>

                {/* Stress Balance (TSB) */}
                <div className="flex items-center gap-3">
                    <div className="w-32 text-xs text-gray-400 uppercase tracking-tighter font-bold truncate">Stress Balance</div>
                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden relative">
                        <div className="absolute left-1/2 w-[1px] h-full bg-white/10" />
                        <div
                            className={`h-full ${tsb >= 0 ? 'bg-emerald-500' : 'bg-orange-500'} absolute transition-all duration-500`}
                            style={{
                                width: `${Math.min(50, Math.abs(tsb))}%`,
                                left: tsb >= 0 ? '50%' : `${50 - Math.min(50, Math.abs(tsb))}%`
                            }}
                        />
                    </div>
                    <div className={`w-14 text-right text-sm font-black ${tsbStatus.color}`}>
                        {tsb >= 0 ? `+${tsb}` : tsb}
                    </div>
                </div>

                {/* Weekly TRIMP */}
                <div className="flex items-center gap-3">
                    <div className="w-32 text-xs text-gray-400 uppercase tracking-tighter font-bold truncate">Weekly TRIMP</div>
                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 transition-all duration-500" style={{ width: `${Math.min(100, easyTrimp / 5)}%` }} />
                    </div>
                    <div className="w-14 text-right text-sm font-black text-purple-400 underline decoration-purple-500/30 underline-offset-2">
                        {easyTrimp > 0 ? easyTrimp : '-'}
                    </div>
                </div>
            </div>
        </div>
    );
}
