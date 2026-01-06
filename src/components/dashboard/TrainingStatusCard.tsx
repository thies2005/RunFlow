import { TrendingUp, Activity } from 'lucide-react';

interface TrainingStatusCardProps {
    marathonShape: { shape: number };
    effectiveVO2max: number;
    correctionFactor: number;
    ctl: number;
    atl: number;
    tsb: number;
    workloadRatio: number;
    easyTrimp: number;
}

export default function TrainingStatusCard({
    marathonShape,
    effectiveVO2max,
    correctionFactor,
    ctl,
    atl,
    tsb,
    workloadRatio,
    easyTrimp
}: TrainingStatusCardProps) {
    const shapePercent = marathonShape?.shape || 0;

    return (
        <div className="glass-card p-6 h-full flex flex-col justify-center">
            <h2 className="text-lg font-semibold text-gray-300 mb-4">Training Status</h2>

            {/* Top Metrics Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Marathon Shape */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shrink-0">
                        <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium leading-tight">Marathon Shape</p>
                        <p className="text-xl font-bold text-white leading-tight">{shapePercent}%</p>
                    </div>
                </div>

                {/* Effective VO2max */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shrink-0">
                        <Activity className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium leading-tight">Effective VO2max</p>
                        <div className="flex items-baseline gap-1">
                            <p className="text-xl font-bold text-white leading-tight">
                                {effectiveVO2max > 0 ? effectiveVO2max.toFixed(1) : '-'}
                            </p>
                            {correctionFactor !== 1.0 && (
                                <span className="text-[10px] text-gray-500">
                                    {correctionFactor.toFixed(2)}x
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Metrics List (Runalyze Style) */}
            <div className="space-y-4">
                {/* Fatigue (ATL) */}
                <div className="flex items-center gap-3">
                    <div className="w-28 text-xs text-gray-400 truncate">Fatigue (ATL)</div>
                    <div className="flex-1 h-2 bg-gray-700/50 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min(100, atl)}%` }} />
                    </div>
                    <div className="w-12 text-right text-sm font-bold text-red-400">
                        {atl > 0 ? `${atl}%` : '-'}
                    </div>
                </div>

                {/* Fitness (CTL) */}
                <div className="flex items-center gap-3">
                    <div className="w-28 text-xs text-gray-400 truncate">Fitness (CTL)</div>
                    <div className="flex-1 h-2 bg-gray-700/50 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, ctl)}%` }} />
                    </div>
                    <div className="w-12 text-right text-sm font-bold text-blue-400">
                        {ctl > 0 ? `${ctl}%` : '-'}
                    </div>
                </div>

                {/* Stress Balance (TSB) */}
                <div className="flex items-center gap-3">
                    <div className="w-28 text-xs text-gray-400 truncate">Stress Balance</div>
                    <div className="flex-1 h-2 bg-gray-700/50 rounded-full overflow-hidden relative">
                        <div className="absolute left-1/2 w-0.5 h-full bg-gray-600" />
                        <div
                            className={`h-full ${tsb >= 0 ? 'bg-green-500' : 'bg-orange-500'} rounded-full absolute`}
                            style={{
                                width: `${Math.min(50, Math.abs(tsb))}%`,
                                left: tsb >= 0 ? '50%' : `${50 - Math.min(50, Math.abs(tsb))}%`
                            }}
                        />
                    </div>
                    <div className={`w-12 text-right text-sm font-bold ${tsb >= 0 ? 'text-green-400' : 'text-orange-400'}`}>
                        {tsb >= 0 ? `+${tsb}` : tsb}
                    </div>
                </div>

                {/* Workload Ratio */}
                <div className="flex items-center gap-3">
                    <div className="w-28 text-xs text-gray-400 truncate">Workload Ratio</div>
                    <div className="flex-1 h-2 bg-gray-700/50 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full ${workloadRatio >= 0.8 && workloadRatio <= 1.3 ? 'bg-green-500' : workloadRatio > 1.5 ? 'bg-red-500' : 'bg-yellow-500'}`}
                            style={{ width: `${Math.min(100, workloadRatio * 50)}%` }}
                        />
                    </div>
                    <div className="w-12 text-right text-sm font-bold text-yellow-400">
                        {workloadRatio > 0 ? workloadRatio.toFixed(2) : '-'}
                    </div>
                </div>

                {/* Easy TRIMP */}
                <div className="flex items-center gap-3">
                    <div className="w-28 text-xs text-gray-400 truncate">Weekly TRIMP</div>
                    <div className="flex-1 h-2 bg-gray-700/50 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(100, easyTrimp / 5)}%` }} />
                    </div>
                    <div className="w-12 text-right text-sm font-bold text-purple-400">
                        {easyTrimp > 0 ? easyTrimp : '-'}
                    </div>
                </div>
            </div>
        </div>
    );
}
