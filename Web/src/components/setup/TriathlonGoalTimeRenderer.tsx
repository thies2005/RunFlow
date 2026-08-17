import { useState } from 'react';
import { Target, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { formatTime } from '@/lib/metrics/vdot';
import { estimateTriathlonTime } from '@/lib/plans/triathlon-time';
import { estimateBikeFtpFromVdot } from '@/lib/plans/bike-zones';
import { calculateProgressionCoefficient } from '@/lib/metrics/goalProjection';
import { RaceType } from '@/generated/prisma/browser';

interface TriathlonGoalTimeRendererProps {
    vdot: number;
    raceType: string;
    customSwimDistM?: number;
    customBikeDistM?: number;
    customRunDistM?: number;
    goalTimeSeconds: number | null;
    onGoalTimeChange: (seconds: number | null) => void;
    planWeeks?: number;
    runsPerWeek?: number;
    weeklyMileageGoal?: number;
}

function formatSwimPace(secondsPer100m: number): string {
    const mins = Math.floor(secondsPer100m / 60);
    const secs = Math.round(secondsPer100m % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}/100m`;
}

function formatRunPace(secondsPerKm: number): string {
    const mins = Math.floor(secondsPerKm / 60);
    const secs = Math.round(secondsPerKm % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}/km`;
}

export default function TriathlonGoalTimeRenderer({
    vdot,
    raceType,
    customSwimDistM,
    customBikeDistM,
    customRunDistM,
    goalTimeSeconds,
    onGoalTimeChange,
    planWeeks = 12,
    runsPerWeek = 4,
    weeklyMileageGoal = 30,
}: TriathlonGoalTimeRendererProps) {
    const [isManualEntry, setIsManualEntry] = useState(false);
    const [manualHours, setManualHours] = useState('');
    const [manualMinutes, setManualMinutes] = useState('');
    const [manualSeconds, setManualSeconds] = useState('');
    const [showSplits, setShowSplits] = useState(false);

    if (vdot <= 0) {
        const handleManualChange = () => {
            const totalSecs =
                (parseInt(manualHours) || 0) * 3600 +
                (parseInt(manualMinutes) || 0) * 60 +
                (parseInt(manualSeconds) || 0);
            if (totalSecs > 0) {
                onGoalTimeChange(totalSecs);
            } else {
                onGoalTimeChange(null);
            }
        };

        return (
            <div className="mt-6 p-5 bg-background-secondary border border-glass-border rounded-lg">
                <div className="flex items-center gap-2 text-orange-400 mb-3">
                    <Target className="w-5 h-5" />
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
                        Goal Finish Time (Optional)
                    </h3>
                </div>
                <p className="text-xs text-foreground-secondary mb-4">
                    No fitness data available for predictions. You can enter a goal time manually or skip this.
                </p>
                <div className="flex gap-2 items-center justify-center">
                    <input
                        type="number"
                        className="w-16 bg-background-tertiary border border-foreground/20 rounded-lg p-3 text-foreground text-center"
                        placeholder="HH"
                        value={manualHours}
                        onChange={(e) => {
                            setManualHours(e.target.value);
                            handleManualChange();
                        }}
                        min="0"
                    />
                    <span className="text-foreground-muted">:</span>
                    <input
                        type="number"
                        className="w-16 bg-background-tertiary border border-foreground/20 rounded-lg p-3 text-foreground text-center"
                        placeholder="MM"
                        value={manualMinutes}
                        onChange={(e) => {
                            setManualMinutes(e.target.value);
                            handleManualChange();
                        }}
                        min="0"
                        max="59"
                    />
                    <span className="text-foreground-muted">:</span>
                    <input
                        type="number"
                        className="w-16 bg-background-tertiary border border-foreground/20 rounded-lg p-3 text-foreground text-center"
                        placeholder="SS"
                        value={manualSeconds}
                        onChange={(e) => {
                            setManualSeconds(e.target.value);
                            handleManualChange();
                        }}
                        min="0"
                        max="59"
                    />
                </div>
                <p className="text-xs text-foreground-muted mt-2 text-center">
                    Enter your target finish time (leave blank to skip)
                </p>
            </div>
        );
    }

    const progressionFactor = calculateProgressionCoefficient(
        planWeeks,
        runsPerWeek,
        weeklyMileageGoal,
    );
    const projectedVdot = vdot * progressionFactor;
    const projection = estimateTriathlonTime({
        vdot: projectedVdot,
        raceType: raceType as RaceType,
        customSwimDistM,
        customBikeDistM,
        customRunDistM,
    });

    if (!projection) {
        const handleManualChange = () => {
            const totalSecs =
                (parseInt(manualHours) || 0) * 3600 +
                (parseInt(manualMinutes) || 0) * 60 +
                (parseInt(manualSeconds) || 0);
            if (totalSecs > 0) {
                onGoalTimeChange(totalSecs);
            } else {
                onGoalTimeChange(null);
            }
        };

        return (
            <div className="mt-6 p-5 bg-background-secondary border border-glass-border rounded-lg">
                <div className="flex items-center gap-2 text-orange-400 mb-3">
                    <Target className="w-5 h-5" />
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
                        Goal Finish Time
                    </h3>
                </div>
                <p className="text-xs text-foreground-secondary mb-4">
                    Unable to estimate times for this race. Enter a goal time manually.
                </p>
                <div className="flex gap-2 items-center justify-center">
                    <input
                        type="number"
                        className="w-16 bg-background-tertiary border border-foreground/20 rounded-lg p-3 text-foreground text-center"
                        placeholder="HH"
                        value={manualHours}
                        onChange={(e) => {
                            setManualHours(e.target.value);
                            handleManualChange();
                        }}
                        min="0"
                    />
                    <span className="text-foreground-muted">:</span>
                    <input
                        type="number"
                        className="w-16 bg-background-tertiary border border-foreground/20 rounded-lg p-3 text-foreground text-center"
                        placeholder="MM"
                        value={manualMinutes}
                        onChange={(e) => {
                            setManualMinutes(e.target.value);
                            handleManualChange();
                        }}
                        min="0"
                        max="59"
                    />
                    <span className="text-foreground-muted">:</span>
                    <input
                        type="number"
                        className="w-16 bg-background-tertiary border border-foreground/20 rounded-lg p-3 text-foreground text-center"
                        placeholder="SS"
                        value={manualSeconds}
                        onChange={(e) => {
                            setManualSeconds(e.target.value);
                            handleManualChange();
                        }}
                        min="0"
                        max="59"
                    />
                </div>
            </div>
        );
    }

    const displayTime = goalTimeSeconds ?? projection.projected.totalSeconds;
    const rangeSeconds = projection.conservative.totalSeconds - projection.optimal.totalSeconds;
    const stepSeconds =
        rangeSeconds <= 7200 ? 30 :
        rangeSeconds <= 14400 ? 60 :
        rangeSeconds <= 28800 ? 120 :
        300;

    const sliderMin = projection.optimal.totalSeconds;
    const sliderMax = projection.conservative.totalSeconds;

    const ftp = estimateBikeFtpFromVdot(vdot);
    const bikePower = Math.round(ftp * 0.75);

    const swimPacePer100m = projection.projected.swimSeconds / ((customSwimDistM && customSwimDistM > 0 ? customSwimDistM : 750) / 100);
    const runPacePerKm = projection.projected.runSeconds / ((customRunDistM && customRunDistM > 0 ? customRunDistM : 5000) / 1000);

    const startManualEntry = () => {
        const t = displayTime;
        setManualHours(Math.floor(t / 3600).toString());
        setManualMinutes(Math.floor((t % 3600) / 60).toString());
        setManualSeconds((t % 60).toString());
        setIsManualEntry(true);
    };

    const confirmManualEntry = () => {
        const totalSecs =
            (parseInt(manualHours) || 0) * 3600 +
            (parseInt(manualMinutes) || 0) * 60 +
            (parseInt(manualSeconds) || 0);
        if (totalSecs > 0) {
            onGoalTimeChange(totalSecs);
        }
        setIsManualEntry(false);
    };

    const resetToProjected = () => {
        onGoalTimeChange(null);
        setIsManualEntry(false);
    };

    return (
        <div className="mt-6 p-5 bg-background-secondary border border-glass-border rounded-lg">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-orange-400">
                    <Target className="w-5 h-5" />
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
                        Goal Finish Time
                    </h3>
                </div>
                {goalTimeSeconds !== null && (
                    <button
                        onClick={resetToProjected}
                        className="text-xs text-foreground-secondary hover:text-foreground transition-colors"
                    >
                        Reset to projected
                    </button>
                )}
            </div>

            <div className="text-center mb-4">
                {isManualEntry ? (
                    <div className="flex items-center justify-center gap-1 mb-2">
                        <input
                            type="number"
                            className="w-14 bg-background-tertiary border border-foreground/20 rounded p-2 text-center text-2xl font-bold text-foreground"
                            placeholder="HH"
                            value={manualHours}
                            onChange={(e) => setManualHours(e.target.value)}
                            min="0"
                        />
                        <span className="text-2xl text-foreground-muted">:</span>
                        <input
                            type="number"
                            className="w-14 bg-background-tertiary border border-foreground/20 rounded p-2 text-center text-2xl font-bold text-foreground"
                            placeholder="MM"
                            value={manualMinutes}
                            onChange={(e) => setManualMinutes(e.target.value)}
                            min="0"
                            max="59"
                        />
                        <span className="text-2xl text-foreground-muted">:</span>
                        <input
                            type="number"
                            className="w-14 bg-background-tertiary border border-foreground/20 rounded p-2 text-center text-2xl font-bold text-foreground"
                            placeholder="SS"
                            value={manualSeconds}
                            onChange={(e) => setManualSeconds(e.target.value)}
                            min="0"
                            max="59"
                        />
                        <button
                            onClick={confirmManualEntry}
                            className="ml-2 p-2 bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30 transition-colors"
                        >
                            <Check className="w-5 h-5" />
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="text-3xl font-bold text-foreground mb-1">
                            {formatTime(displayTime)}
                        </div>
                        <button
                            onClick={startManualEntry}
                            className="text-xs text-foreground-muted hover:text-foreground-secondary transition-colors"
                        >
                            Enter total time manually
                        </button>
                    </>
                )}
                <p className="text-xs text-foreground-muted mt-1">
                    {goalTimeSeconds !== null ? (
                        <span className="text-orange-400">Custom goal</span>
                    ) : (
                        <>Projected based on VDOT {vdot.toFixed(1)}</>
                    )}
                </p>
            </div>

            {!isManualEntry && (
                <div className="mb-4">
                    <input
                        type="range"
                        min={sliderMin}
                        max={sliderMax}
                        step={stepSeconds}
                        value={displayTime}
                        className="w-full h-2 bg-background-tertiary rounded-lg appearance-none cursor-pointer accent-orange-500"
                        onChange={(e) => onGoalTimeChange(parseInt(e.target.value))}
                    />
                    <div className="flex justify-between text-xs mt-1">
                        <span className="text-green-400">{formatTime(projection.optimal.totalSeconds)} (Optimal)</span>
                        <span className="text-orange-400">{formatTime(projection.conservative.totalSeconds)} (Conservative)</span>
                    </div>
                </div>
            )}

            <div className="border-t border-glass-border pt-3">
                <button
                    onClick={() => setShowSplits(!showSplits)}
                    className="flex items-center gap-1 text-xs text-foreground-secondary hover:text-foreground transition-colors w-full"
                >
                    {showSplits ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    <span>{showSplits ? 'Hide' : 'Show'} splits</span>
                </button>

                {showSplits && (
                    <div className="mt-3 space-y-2">
                        <div className="bg-background-tertiary border border-foreground/20 rounded-lg p-3 flex justify-between items-center">
                            <span className="text-foreground-secondary text-xs">Swim</span>
                            <div className="text-right">
                                <span className="text-foreground text-sm font-medium">
                                    {formatTime(projection.projected.swimSeconds)}
                                </span>
                                <span className="text-foreground-muted text-xs ml-2">
                                    {formatSwimPace(swimPacePer100m)}
                                </span>
                            </div>
                        </div>
                        <div className="bg-background-tertiary border border-foreground/20 rounded-lg p-3 flex justify-between items-center">
                            <span className="text-foreground-secondary text-xs">T1</span>
                            <span className="text-foreground text-sm font-medium">
                                {formatTime(projection.projected.t1Seconds)}
                            </span>
                        </div>
                        <div className="bg-background-tertiary border border-foreground/20 rounded-lg p-3 flex justify-between items-center">
                            <span className="text-foreground-secondary text-xs">Bike</span>
                            <div className="text-right">
                                <span className="text-foreground text-sm font-medium">
                                    {formatTime(projection.projected.bikeSeconds)}
                                </span>
                                <span className="text-foreground-muted text-xs ml-2">
                                    ~{bikePower} W
                                </span>
                            </div>
                        </div>
                        <div className="bg-background-tertiary border border-foreground/20 rounded-lg p-3 flex justify-between items-center">
                            <span className="text-foreground-secondary text-xs">T2</span>
                            <span className="text-foreground text-sm font-medium">
                                {formatTime(projection.projected.t2Seconds)}
                            </span>
                        </div>
                        <div className="bg-background-tertiary border border-foreground/20 rounded-lg p-3 flex justify-between items-center">
                            <span className="text-foreground-secondary text-xs">Run</span>
                            <div className="text-right">
                                <span className="text-foreground text-sm font-medium">
                                    {formatTime(projection.projected.runSeconds)}
                                </span>
                                <span className="text-foreground-muted text-xs ml-2">
                                    {formatRunPace(runPacePerKm)}
                                </span>
                            </div>
                        </div>
                        <p className="text-xs text-foreground-muted mt-2">
                            Splits are estimates based on running fitness
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
