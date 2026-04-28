import { BarChart2, Check, Rocket, AlertTriangle } from 'lucide-react';
import { formatTime, calculateVdot, type RaceDistance } from '@/lib/metrics/vdot';

interface RaceActivity {
    id: string;
    name: string;
    distance: number;
    movingTime: number;
    startDate: string;
}

interface CalibrationSectionProps {
    calibrationMode: 'activity' | 'manual';
    setCalibrationMode: (_mode: 'activity' | 'manual') => void;
    selectedActivityId: string;
    setSelectedActivityId: (_id: string) => void;
    calibrationDistance: string;
    setCalibrationDistance: (_dist: string) => void;
    hours: string;
    setHours: (_val: string) => void;
    minutes: string;
    setMinutes: (_val: string) => void;
    seconds: string;
    setSeconds: (_val: string) => void;
    setCalibrationFactor: (_val: number) => void;
    effectiveVO2max: number;
    raceActivities: RaceActivity[];
}

export default function CalibrationSection({
    calibrationMode,
    setCalibrationMode,
    selectedActivityId,
    setSelectedActivityId,
    calibrationDistance,
    setCalibrationDistance,
    hours,
    setHours,
    minutes,
    setMinutes,
    seconds,
    setSeconds,
    setCalibrationFactor,
    effectiveVO2max,
    raceActivities
}: CalibrationSectionProps) {
    const inputClass = "bg-surface border border-glass-border rounded-lg p-3 text-foreground w-full outline-hidden focus:ring-2 focus:ring-accent-orange transition-all";

    const formatActivityOption = (activity: RaceActivity) => {
        const date = new Date(activity.startDate).toLocaleDateString();
        const distance = (activity.distance / 1000).toFixed(1);
        const time = formatTime(activity.movingTime);
        return `${activity.name} - ${distance}km in ${time} (${date})`;
    };

    return (
        <div className="border-t border-glass-border pt-6">
            <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wide">Performance Calibration</h3>
            </div>
            <p className="text-sm text-foreground-muted mb-4">
                Fine-tune predictions based on a recent race or time trial result.
            </p>

            {/* Calibration Step 1: Mode */}
            <div className="mb-2">
                <span className="text-xs font-semibold text-accent-orange uppercase tracking-wide">Step 1 of 3: Choose Calibration Method</span>
            </div>

            {/* Calibration Mode Toggle */}
            <div className="flex bg-surface rounded-lg p-1 mb-4">
                <button
                    type="button"
                    onClick={() => {
                        setCalibrationMode('activity');
                        setHours(''); setMinutes(''); setSeconds('');
                        setCalibrationFactor(1.0);
                    }}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${calibrationMode === 'activity'
                        ? 'bg-accent-orange text-white'
                        : 'text-foreground-muted hover:text-foreground'
                        }`}
                >
                    Select Activity
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setCalibrationMode('manual');
                        setSelectedActivityId('');
                    }}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${calibrationMode === 'manual'
                        ? 'bg-accent-orange text-white'
                        : 'text-foreground-muted hover:text-foreground'
                        }`}
                >
                    Manual Entry
                </button>
            </div>

            {/* Calibration Step 2: Activity/Details Selection */}
            <div className="mb-2 mt-4">
                <span className="text-xs font-semibold text-accent-orange uppercase tracking-wide">Step 2 of 3: Provide Race Details</span>
            </div>

            {/* Activity Selection */}
            {calibrationMode === 'activity' && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1 uppercase">Select Race Activity</label>
                        <select
                            value={selectedActivityId}
                            onChange={(e) => setSelectedActivityId(e.target.value)}
                            className={inputClass}
                        >
                            <option value="">-- Select an activity --</option>
                            {raceActivities.map((activity) => (
                                <option key={activity.id} value={activity.id}>
                                    {formatActivityOption(activity)}
                                </option>
                            ))}
                        </select>
                        {raceActivities.length === 0 && (
                            <p className="text-xs text-gray-500 mt-2">
                                No race-eligible activities found. Try manual entry instead.
                            </p>
                        )}
                    </div>

                    {selectedActivityId && (
                        <div>
                            <label className="block text-xs text-gray-400 mb-1 uppercase">Race Distance</label>
                            <select
                                value={calibrationDistance}
                                onChange={(e) => setCalibrationDistance(e.target.value)}
                                className={inputClass}
                            >
                                <option value="5K">5K</option>
                                <option value="10K">10K</option>
                                <option value="HALF">Half Marathon</option>
                                <option value="MARATHON">Marathon</option>
                            </select>
                        </div>
                    )}
                </div>
            )}

            {/* Manual Entry */}
            {calibrationMode === 'manual' && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1 uppercase">Race Distance</label>
                        <select
                            value={calibrationDistance}
                            onChange={(e) => setCalibrationDistance(e.target.value)}
                            className={inputClass}
                        >
                            <option value="5K">5K</option>
                            <option value="10K">10K</option>
                            <option value="HALF">Half Marathon</option>
                            <option value="MARATHON">Marathon</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-foreground-muted mb-1 uppercase">Your Race Time</label>
                        <div className="flex gap-4 items-center">
                            <input
                                type="number"
                                className="w-16 bg-surface border border-glass-border rounded-lg p-2 text-foreground text-center"
                                placeholder="HH"
                                value={hours}
                                onChange={e => {
                                    setHours(e.target.value);
                                    // Auto-update calibration factor
                                    const secs = (parseInt(e.target.value) || 0) * 3600 + (parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0);
                                    if (secs > 0 && effectiveVO2max > 0) {
                                        const raceVdot = calculateVdot({ distance: calibrationDistance as RaceDistance, timeSeconds: secs });
                                        setCalibrationFactor(raceVdot / effectiveVO2max);
                                    }
                                }}
                                min="0"
                            />
                            <span className="text-foreground-muted">:</span>
                            <input
                                type="number"
                                className="w-16 bg-surface border border-glass-border rounded-lg p-2 text-foreground text-center"
                                placeholder="MM"
                                value={minutes}
                                onChange={e => {
                                    setMinutes(e.target.value);
                                    const secs = (parseInt(hours) || 0) * 3600 + (parseInt(e.target.value) || 0) * 60 + (parseInt(seconds) || 0);
                                    if (secs > 0 && effectiveVO2max > 0) {
                                        const raceVdot = calculateVdot({ distance: calibrationDistance as RaceDistance, timeSeconds: secs });
                                        setCalibrationFactor(raceVdot / effectiveVO2max);
                                    }
                                }}
                                min="0"
                                max="59"
                            />
                            <span className="text-foreground-muted">:</span>
                            <input
                                type="number"
                                className="w-16 bg-surface border border-glass-border rounded-lg p-2 text-foreground text-center"
                                placeholder="SS"
                                value={seconds}
                                onChange={e => {
                                    setSeconds(e.target.value);
                                    const secs = (parseInt(hours) || 0) * 3600 + (parseInt(minutes) || 0) * 60 + (parseInt(e.target.value) || 0);
                                    if (secs > 0 && effectiveVO2max > 0) {
                                        const raceVdot = calculateVdot({ distance: calibrationDistance as RaceDistance, timeSeconds: secs });
                                        setCalibrationFactor(raceVdot / effectiveVO2max);
                                    }
                                }}
                                min="0"
                                max="59"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Calibration Result */}
            {(() => {
                const currentSeconds = (parseInt(hours) || 0) * 3600 + (parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0);

                if (currentSeconds <= 0 && !selectedActivityId) {
                    return null;
                }

                // Calculate VDOT from the race performance
                const raceVdot = currentSeconds > 0
                    ? calculateVdot({ distance: calibrationDistance as RaceDistance, timeSeconds: currentSeconds })
                    : 0;

                // Calculate calibration factor: actual performance / expected performance
                const factor = effectiveVO2max > 0 ? raceVdot / effectiveVO2max : 1.0;
                const factorPercent = ((factor - 1) * 100);

                const distanceName = calibrationDistance === 'HALF' ? 'Half Marathon' :
                    calibrationDistance === 'MARATHON' ? 'Marathon' : calibrationDistance;

                if (currentSeconds <= 0) return null;

                return (
                    <div className="mt-6">
                        <div className="mb-2">
                            <span className="text-xs font-semibold text-accent-orange uppercase tracking-wide">Step 3 of 3: Review Result</span>
                        </div>
                        <div className="p-4 bg-surface rounded-lg border border-glass-border">
                            <h4 className="text-xs font-semibold text-foreground-muted mb-3 flex items-center gap-2">
                                <BarChart2 className="w-4 h-4" /> Calibration Result
                            </h4>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-foreground-muted">Your {distanceName} VDOT:</span>
                                    <span className="text-lg font-bold text-accent-cyan">{raceVdot.toFixed(1)}</span>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-foreground-muted">Training VO2max:</span>
                                    <span className="text-sm text-foreground">{effectiveVO2max.toFixed(1)}</span>
                                </div>

                                <div className="border-t border-glass-border pt-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-foreground-muted">Calibrated VO2max:</span>
                                        <span className={`text-lg font-bold ${factorPercent >= 0 ? 'text-green-400' : 'text-amber-400'}`}>
                                            {raceVdot.toFixed(1)} ({factorPercent >= 0 ? '+' : ''}{factorPercent.toFixed(1)}%)
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        {factorPercent >= 5 ? (
                                            <><Rocket className="w-4 h-4 inline" /> Race performance exceeds training predictions. Goal times adjusted accordingly.</>
                                        ) : factorPercent >= 0 ? (
                                            <><Check className="w-4 h-4 inline" /> Your race performance aligns well with training fitness.</>
                                        ) : factorPercent >= -5 ? (
                                            <><BarChart2 className="w-4 h-4 inline" /> Race was slightly slower than predicted. Goal times adjusted.</>
                                        ) : (
                                            <><AlertTriangle className="w-4 h-4 inline" /> Significant gap between training and race. Check conditions or use manual goal.</>
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
