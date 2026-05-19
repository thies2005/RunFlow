import { Target, Check } from 'lucide-react';
import { formatTime, type RaceDistance } from '@/lib/metrics/vdot';
import { calculateProjectedGoalTime, calculateProjectedGoalTimeForDistance, calculateProgressionCoefficient, type PlanSettings } from '@/lib/metrics/goalProjection';
import { estimateBackyardUltraTime } from '@/lib/plans/backyard-time';

interface GoalTimeRendererProps {
    mode: 'onboarding' | 'advanced' | 'modal' | 'settings';
    effectiveVO2max: number;
    calibrationFactor: number;
    raceType: string;
    computedPlanWeeks: number;
    runsPerWeek: number;
    weeklyMileage: number;
    taperWeeks: number;
    peakWeeks: number;
    buildWeeks: number;
    shapePercent: number;
    goalTimeSeconds: number | null;
    setGoalTimeSeconds: (_val: number | null) => void;
    goalTimeHours: string;
    setGoalTimeHours: (_val: string) => void;
    goalTimeMinutes: string;
    setGoalTimeMinutes: (_val: string) => void;
    goalTimeSecs: string;
    setGoalTimeSecs: (_val: string) => void;
    isEditingGoalTime: boolean;
    setIsEditingGoalTime: (_val: boolean) => void;
    distanceOverrideM?: number;
    backyardLoopDistM?: number;
    setBackyardLoopDistM?: (_val: number) => void;
    targetLaps?: number;
    setTargetLaps?: (_val: number) => void;
}

function estimateDistanceForTime(vdot: number, timeSeconds: number): number {
    let lo = 1000;
    let hi = 500000;
    while (hi - lo > 100) {
        const mid = (lo + hi) >> 1;
        const estVelocity = vdot > 0 ? -4.60 + 0.182258 * (mid / (timeSeconds / 60)) + 0.000104 * Math.pow(mid / (timeSeconds / 60), 2) : 0;
        const pctVo2 = 0.8 + 0.1894393 * Math.exp(-0.012778 * (timeSeconds / 60)) + 0.2989558 * Math.exp(-0.1932605 * (timeSeconds / 60));
        const testVdot = estVelocity / pctVo2;
        if (testVdot > vdot) {
            hi = mid;
        } else {
            lo = mid;
        }
    }
    return lo;
}

export default function GoalTimeRenderer({
    mode,
    effectiveVO2max,
    calibrationFactor,
    raceType,
    computedPlanWeeks,
    runsPerWeek,
    weeklyMileage,
    taperWeeks,
    peakWeeks,
    buildWeeks,
    shapePercent,
    goalTimeSeconds,
    setGoalTimeSeconds,
    goalTimeHours,
    setGoalTimeHours,
    goalTimeMinutes,
    setGoalTimeMinutes,
    goalTimeSecs,
    setGoalTimeSecs,
    isEditingGoalTime,
    setIsEditingGoalTime,
    distanceOverrideM,
    backyardLoopDistM: backyardLoopDistMProp,
    setBackyardLoopDistM,
    targetLaps: targetLapsProp,
    setTargetLaps,
}: GoalTimeRendererProps) {
    if (mode !== 'onboarding') return null;

    if (raceType === 'BACKYARD_ULTRA') {
        const backyardLoopDistM = backyardLoopDistMProp ?? 6706;
        const targetLaps = targetLapsProp ?? 2;
        const calibratedVO2max = effectiveVO2max * calibrationFactor;
        const totalDistKm = (backyardLoopDistM * targetLaps) / 1000;

        let projection: ReturnType<typeof estimateBackyardUltraTime> | null = null;
        if (calibratedVO2max > 0 && backyardLoopDistM > 0) {
            const progressionFactor = calculateProgressionCoefficient(computedPlanWeeks, runsPerWeek, weeklyMileage);
            const projectedVdot = calibratedVO2max * progressionFactor;
            projection = estimateBackyardUltraTime({ vdot: projectedVdot, loopDistM: backyardLoopDistM, targetLaps });
        }

        return (
            <div className="mt-6 p-5 bg-gradient-to-br from-accent-orange/10 via-transparent to-accent-cyan/5 rounded-xl border border-glass-border">
                <div className="flex items-center gap-2 text-accent-orange mb-3">
                    <Target className="w-5 h-5" />
                    <h3 className="text-sm font-semibold uppercase tracking-wide">Backyard Ultra Setup</h3>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1 uppercase">Loop Distance (meters)</label>
                        <input
                            type="number"
                            value={backyardLoopDistM || ''}
                            onChange={(e) => setBackyardLoopDistM?.(parseFloat(e.target.value) || 0)}
                            placeholder="e.g. 6706"
                            min={100}
                            className="bg-surface border border-glass-border rounded-lg p-3 text-foreground w-full outline-hidden focus:ring-2 focus:ring-accent-orange transition-all"
                        />
                        <p className="text-xs text-gray-500 mt-1">Standard backyard ultra: 6706m (4.167 miles)</p>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1 uppercase">Target Laps: {targetLaps}</label>
                        <input
                            type="range"
                            min={1}
                            max={100}
                            step={1}
                            value={targetLaps}
                            onChange={(e) => setTargetLaps?.(parseInt(e.target.value))}
                            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent-orange"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>1</span>
                            <span>100</span>
                        </div>
                    </div>
                    {backyardLoopDistM > 0 && (
                        <div className="text-xs text-foreground-muted">
                            Total distance: <span className="text-foreground font-medium">{totalDistKm.toFixed(1)} km</span>
                        </div>
                    )}
                    {projection && (
                        <div className="text-xs bg-surface border border-glass-border rounded-lg p-3 space-y-1">
                            <div className="text-foreground-muted">Estimated finish time:</div>
                            <div className="text-green-400 font-medium">Optimal: {formatTime(projection.optimal.totalSeconds)}</div>
                            <div className="text-accent-orange font-medium">Projected: {formatTime(projection.projected.totalSeconds)}</div>
                            <div className="text-red-400 font-medium">Conservative: {formatTime(projection.conservative.totalSeconds)}</div>
                        </div>
                    )}
                    {calibratedVO2max > 0 && (
                        <div className="grid grid-cols-2 gap-3 text-xs bg-white/5 rounded-lg p-3">
                            <div>
                                <span className="text-gray-400 block mb-1">VO2max</span>
                                <span className="text-white font-semibold">{calibratedVO2max.toFixed(1)}</span>
                            </div>
                            <div>
                                <span className="text-gray-400 block mb-1">Marathon Shape</span>
                                <span className="text-white font-semibold">{shapePercent}%</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (raceType === 'TWELVE_HOUR' || raceType === 'TWENTY_FOUR_HOUR') {
        const fixedSeconds = raceType === 'TWELVE_HOUR' ? 43200 : 86400;
        const durationLabel = raceType === 'TWELVE_HOUR' ? '12 hours' : '24 hours';
        const calibratedVO2max = effectiveVO2max * calibrationFactor;

        let estimatedDistance: string | null = null;
        let projectedPace: string | null = null;
        if (calibratedVO2max > 0) {
            const progressionFactor = calculateProgressionCoefficient(computedPlanWeeks, runsPerWeek, weeklyMileage);
            const projectedVdot = calibratedVO2max * progressionFactor;
            const distM = estimateDistanceForTime(projectedVdot, fixedSeconds);
            estimatedDistance = `${(distM / 1000).toFixed(1)} km`;
            const paceSecPerKm = fixedSeconds / (distM / 1000);
            const paceMin = Math.floor(paceSecPerKm / 60);
            const paceSec = Math.round(paceSecPerKm % 60);
            projectedPace = `${paceMin}:${paceSec.toString().padStart(2, '0')} /km`;
        }

        return (
            <div className="mt-6 p-5 bg-gradient-to-br from-accent-orange/10 via-transparent to-accent-cyan/5 rounded-xl border border-glass-border">
                <div className="flex items-center gap-2 text-accent-orange mb-3">
                    <Target className="w-5 h-5" />
                    <h3 className="text-sm font-semibold uppercase tracking-wide">Timed Event ({durationLabel})</h3>
                </div>
                <div className="text-center mb-4">
                    <div className="text-3xl font-bold text-foreground mb-1">
                        {formatTime(fixedSeconds)}
                    </div>
                    <p className="text-xs text-gray-400">Fixed duration: {durationLabel}</p>
                </div>
                {estimatedDistance && (
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-xs bg-surface border border-glass-border rounded-lg p-3">
                            <span className="text-foreground-muted">Estimated distance</span>
                            <span className="text-foreground font-semibold">{estimatedDistance}</span>
                        </div>
                        {projectedPace && (
                            <div className="flex justify-between items-center text-xs bg-surface border border-glass-border rounded-lg p-3">
                                <span className="text-foreground-muted">Projected pace</span>
                                <span className="text-accent-orange font-semibold">{projectedPace}</span>
                            </div>
                        )}
                    </div>
                )}
                {calibratedVO2max > 0 && (
                    <div className="grid grid-cols-2 gap-3 text-xs bg-white/5 rounded-lg p-3 mt-3">
                        <div>
                            <span className="text-gray-400 block mb-1">VO2max</span>
                            <span className="text-white font-semibold">{calibratedVO2max.toFixed(1)}</span>
                        </div>
                        <div>
                            <span className="text-gray-400 block mb-1">Marathon Shape</span>
                            <span className="text-white font-semibold">{shapePercent}%</span>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (effectiveVO2max <= 0) {
        return (
            <div className="mt-6 p-5 bg-gradient-to-br from-accent-orange/10 via-transparent to-accent-cyan/5 rounded-xl border border-glass-border">
                <div className="flex items-center gap-2 text-accent-orange mb-3">
                    <Target className="w-5 h-5" />
                    <h3 className="text-sm font-semibold uppercase tracking-wide">Goal Time (Optional)</h3>
                </div>
                <p className="text-xs text-gray-400 mb-4">
                    No fitness data available for predictions. You can enter a goal time manually or skip this.
                </p>
                <div className="flex gap-2 items-center justify-center">
                    <input
                        type="number"
                        className="w-16 bg-surface border border-glass-border rounded-lg p-3 text-foreground text-center"
                        placeholder="HH"
                        value={goalTimeHours}
                        onChange={e => {
                            setGoalTimeHours(e.target.value);
                            const totalSecs = (parseInt(e.target.value) || 0) * 3600 +
                                (parseInt(goalTimeMinutes) || 0) * 60 +
                                (parseInt(goalTimeSecs) || 0);
                            if (totalSecs > 0) {
                                setGoalTimeSeconds(totalSecs);
                            }
                        }}
                        min="0"
                    />
                    <span className="text-foreground-muted">:</span>
                    <input
                        type="number"
                        className="w-16 bg-surface border border-glass-border rounded-lg p-3 text-foreground text-center"
                        placeholder="MM"
                        value={goalTimeMinutes}
                        onChange={e => {
                            setGoalTimeMinutes(e.target.value);
                            const totalSecs = (parseInt(goalTimeHours) || 0) * 3600 +
                                (parseInt(e.target.value) || 0) * 60 +
                                (parseInt(goalTimeSecs) || 0);
                            if (totalSecs > 0) {
                                setGoalTimeSeconds(totalSecs);
                            }
                        }}
                        min="0"
                        max="59"
                    />
                    <span className="text-foreground-muted">:</span>
                    <input
                        type="number"
                        className="w-16 bg-surface border border-glass-border rounded-lg p-3 text-foreground text-center"
                        placeholder="SS"
                        value={goalTimeSecs}
                        onChange={e => {
                            setGoalTimeSecs(e.target.value);
                            const totalSecs = (parseInt(goalTimeHours) || 0) * 3600 +
                                (parseInt(goalTimeMinutes) || 0) * 60 +
                                (parseInt(e.target.value) || 0);
                            if (totalSecs > 0) {
                                setGoalTimeSeconds(totalSecs);
                            }
                        }}
                        min="0"
                        max="59"
                    />
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                    Enter your target finish time (leave blank to skip)
                </p>
            </div>
        );
    }

    const raceDistanceMap: Record<string, RaceDistance> = {
        'FIVE_K': '5K',
        'TEN_K': '10K',
        'HALF_MARATHON': 'HALF',
        'MARATHON': 'MARATHON',
    };
    const mappedDistance = raceDistanceMap[raceType] || 'MARATHON';
    const calibratedVO2max = effectiveVO2max * calibrationFactor;

    const planSettings: PlanSettings = {
        durationWeeks: computedPlanWeeks,
        runsPerWeek: runsPerWeek,
        weeklyMileageGoal: weeklyMileage,
        raceDistance: mappedDistance,
        taperWeeks: taperWeeks,
        peakWeeks: peakWeeks,
        buildWeeks: buildWeeks,
    };

    const projectionBase = distanceOverrideM && distanceOverrideM > 0
        ? calculateProjectedGoalTimeForDistance(
            calibratedVO2max,
            { durationWeeks: computedPlanWeeks, runsPerWeek, weeklyMileageGoal: weeklyMileage },
            distanceOverrideM,
            shapePercent,
        )
        : calculateProjectedGoalTime(
            calibratedVO2max,
            planSettings,
            shapePercent
        );

    const projection = {
        optimalTime: projectionBase.optimalTime,
        projectedTime: projectionBase.projectedTime,
        conservativeTime: projectionBase.conservativeTime,
        projectedVdot: 'projectedVdot' in projectionBase ? (projectionBase as Record<string, unknown>).projectedVdot as number : calibratedVO2max,
        improvementPercent: 'improvementPercent' in projectionBase ? (projectionBase as Record<string, unknown>).improvementPercent as number : 0,
        projectedShape: 'projectedShape' in projectionBase ? (projectionBase as Record<string, unknown>).projectedShape as number : shapePercent,
        shapeImprovementPercent: 'shapeImprovementPercent' in projectionBase ? (projectionBase as Record<string, unknown>).shapeImprovementPercent as number : 0,
    };

    const distanceName = mappedDistance === 'HALF' ? 'Half Marathon' :
        mappedDistance === 'MARATHON' ? 'Marathon' :
        raceType === 'FIFTY_K' ? '50K' :
        raceType === 'FIFTY_MILE' ? '50 Mile' :
        raceType === 'HUNDRED_K' ? '100K' :
        raceType === 'HUNDRED_MILE' ? '100 Mile' :
        mappedDistance;

    const displayGoalTime = goalTimeSeconds ?? projection.projectedTime;

    const sliderMin = Math.round(projection.optimalTime * 0.9);
    const sliderMax = Math.round(projection.conservativeTime * 1.1);

    const handleSliderChange = (value: number) => {
        setGoalTimeSeconds(value);
        const h = Math.floor(value / 3600);
        const m = Math.floor((value % 3600) / 60);
        const s = value % 60;
        setGoalTimeHours(h.toString());
        setGoalTimeMinutes(m.toString());
        setGoalTimeSecs(s.toString());
    };

    const confirmManualEntry = () => {
        const totalSecs = (parseInt(goalTimeHours) || 0) * 3600 +
            (parseInt(goalTimeMinutes) || 0) * 60 +
            (parseInt(goalTimeSecs) || 0);
        if (totalSecs > 0) {
            setGoalTimeSeconds(totalSecs);
        }
        setIsEditingGoalTime(false);
    };

    const startEditing = () => {
        const time = displayGoalTime;
        setGoalTimeHours(Math.floor(time / 3600).toString());
        setGoalTimeMinutes(Math.floor((time % 3600) / 60).toString());
        setGoalTimeSecs((time % 60).toString());
        setIsEditingGoalTime(true);
    };

    const resetToProjected = () => {
        setGoalTimeSeconds(null);
        setIsEditingGoalTime(false);
    };

    return (
        <div className="mt-6 p-5 bg-gradient-to-br from-accent-orange/10 via-transparent to-accent-cyan/5 rounded-xl border border-glass-border">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-accent-orange">
                    <Target className="w-5 h-5" />
                    <h3 className="text-sm font-semibold uppercase tracking-wide">Goal {distanceName} Time</h3>
                </div>
                {goalTimeSeconds !== null && (
                    <button
                        onClick={resetToProjected}
                        className="text-xs text-foreground-muted hover:text-accent-cyan transition-colors"
                    >
                        Reset to projected
                    </button>
                )}
            </div>

            {calibrationFactor !== 1.0 && (
                <div className="mb-3 text-xs text-accent-cyan bg-accent-cyan/10 px-2 py-1 rounded inline-block">
                    ✓ Using calibrated VO2max ({(effectiveVO2max * calibrationFactor).toFixed(1)})
                </div>
            )}

            <div className="text-center mb-4">
                {isEditingGoalTime ? (
                    <div className="flex items-center justify-center gap-1 mb-2">
                        <input
                            type="number"
                            className="w-12 bg-black/40 border border-white/20 rounded p-2 text-center text-2xl font-bold"
                            placeholder="H"
                            value={goalTimeHours}
                            onChange={e => setGoalTimeHours(e.target.value)}
                            min="0"
                            max="9"
                        />
                        <span className="text-2xl text-white">:</span>
                        <input
                            type="number"
                            className="w-12 bg-black/40 border border-white/20 rounded p-2 text-center text-2xl font-bold"
                            placeholder="MM"
                            value={goalTimeMinutes}
                            onChange={e => setGoalTimeMinutes(e.target.value)}
                            min="0"
                            max="59"
                        />
                        <span className="text-2xl text-white">:</span>
                        <input
                            type="number"
                            className="w-12 bg-black/40 border border-white/20 rounded p-2 text-center text-2xl font-bold"
                            placeholder="SS"
                            value={goalTimeSecs}
                            onChange={e => setGoalTimeSecs(e.target.value)}
                            min="0"
                            max="59"
                        />
                        <button
                            onClick={confirmManualEntry}
                            className="ml-2 p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                        >
                            <Check className="w-5 h-5" />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={startEditing}
                        className="group hover:bg-surface-hover p-2 rounded-lg transition-colors"
                    >
                        <div className="text-3xl font-bold text-foreground mb-1 group-hover:text-accent-orange transition-colors">
                            {formatTime(displayGoalTime)}
                        </div>
                        <span className="text-xs text-foreground-muted group-hover:text-foreground">
                            Click to edit manually
                        </span>
                    </button>
                )}
                <p className="text-xs text-gray-400 mt-1">
                    {goalTimeSeconds !== null ? (
                        <span className="text-accent-orange">Custom goal</span>
                    ) : (
                        <>Projected based on {computedPlanWeeks} weeks of training</>
                    )}
                </p>
            </div>

            <div className="mb-4">
                <input
                    type="range"
                    min={sliderMin}
                    max={sliderMax}
                    step="30"
                    value={displayGoalTime}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent-orange"
                    onChange={(e) => handleSliderChange(parseInt(e.target.value))}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span className="text-green-400">{formatTime(projection.optimalTime)} (Optimal)</span>
                    <span className="text-accent-orange">{formatTime(projection.conservativeTime)} (Conservative)</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-white/5 rounded-lg p-3">
                <div>
                    <span className="text-gray-400 block mb-1">VO2max</span>
                    <span className="text-white font-semibold">{calibratedVO2max.toFixed(1)}</span>
                    <span className="text-gray-500"> → </span>
                    <span className="text-accent-cyan font-semibold">{projection.projectedVdot}</span>
                    {projection.improvementPercent > 0 && (
                        <span className="text-green-400 ml-1">(+{projection.improvementPercent}%)</span>
                    )}
                </div>
                <div>
                    <span className="text-gray-400 block mb-1">Marathon Shape</span>
                    <span className="text-white font-semibold">{shapePercent}%</span>
                    <span className="text-gray-500"> → </span>
                    <span className="text-accent-cyan font-semibold">{projection.projectedShape}%</span>
                    {projection.shapeImprovementPercent > 0 && (
                        <span className="text-green-400 ml-1">(+{projection.shapeImprovementPercent.toFixed(1)}%)</span>
                    )}
                </div>
            </div>
        </div>
    );
}
