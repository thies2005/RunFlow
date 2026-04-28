import { ChevronDown, ChevronUp } from 'lucide-react';

interface Zone {
    label: string;
    min: number;
    max: number;
}

interface HeartRateZonesSectionProps {
    showHeartRate: boolean;
    setShowHeartRate: (_val: boolean) => void;
    maxHeartRate: number;
    setMaxHeartRate: (_val: number) => void;
    restingHeartRate: number;
    setRestingHeartRate: (_val: number) => void;
    weight: number;
    setWeight: (_val: number) => void;
    thresholdHR: string;
    setThresholdHR: (_val: string) => void;
    thresholdPaceMin: string;
    setThresholdPaceMin: (_val: string) => void;
    thresholdPaceSec: string;
    setThresholdPaceSec: (_val: string) => void;
    calculatedZones: Zone[];
    zone1Max: number;
    setZone1Max: (_val: number) => void;
    zone2Max: number;
    setZone2Max: (_val: number) => void;
    zone3Max: number;
    setZone3Max: (_val: number) => void;
    zone4Max: number;
    setZone4Max: (_val: number) => void;
    zone5Max: number;
    setZone5Max: (_val: number) => void;
    zone6Max: number;
    setZone6Max: (_val: number) => void;
}

export default function HeartRateZonesSection({
    showHeartRate,
    setShowHeartRate,
    maxHeartRate,
    setMaxHeartRate,
    restingHeartRate,
    setRestingHeartRate,
    weight,
    setWeight,
    thresholdHR,
    setThresholdHR,
    thresholdPaceMin,
    setThresholdPaceMin,
    thresholdPaceSec,
    setThresholdPaceSec,
    calculatedZones,
    zone1Max,
    setZone1Max,
    zone2Max,
    setZone2Max,
    zone3Max,
    setZone3Max,
    zone4Max,
    setZone4Max,
    zone5Max,
    setZone5Max,
    zone6Max,
    setZone6Max
}: HeartRateZonesSectionProps) {
    const inputClass = "bg-surface border border-glass-border rounded-lg p-3 text-foreground w-full outline-hidden focus:ring-2 focus:ring-accent-orange transition-all";

    return (
        <div className="border-t border-glass-border pt-4">
            <button
                type="button"
                onClick={() => setShowHeartRate(!showHeartRate)}
                className="flex items-center justify-between w-full text-left py-2"
            >
                <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wide">Heart Rate & Zone Settings</h3>
                {showHeartRate ? (
                    <ChevronUp className="w-4 h-4 text-foreground-muted" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-foreground-muted" />
                )}
            </button>

            {showHeartRate && (
                <div className="space-y-6 mt-4 animate-fade-in">
                    {/* Basic HR Settings */}
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs text-foreground-muted mb-1 uppercase">Max HR</label>
                            <input
                                type="number"
                                value={maxHeartRate}
                                onChange={e => setMaxHeartRate(parseInt(e.target.value) || 185)}
                                className={inputClass}
                                min="130"
                                max="220"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-foreground-muted mb-1 uppercase">Resting HR</label>
                            <input
                                type="number"
                                value={restingHeartRate}
                                onChange={e => setRestingHeartRate(parseInt(e.target.value) || 55)}
                                className={inputClass}
                                min="35"
                                max="90"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-foreground-muted mb-1 uppercase">Weight (kg)</label>
                            <input
                                type="number"
                                value={weight}
                                onChange={e => setWeight(parseInt(e.target.value) || 70)}
                                className={inputClass}
                                min="30"
                                max="150"
                            />
                        </div>
                    </div>

                    {/* Threshold Values */}
                    <div className="bg-surface/50 rounded-lg p-4 border border-glass-border">
                        <h4 className="text-xs font-semibold text-accent-orange mb-3 uppercase tracking-wide">Threshold Values</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-foreground-muted mb-1 uppercase">Lactate Threshold HR (LTHR)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={thresholdHR}
                                        onChange={e => setThresholdHR(e.target.value)}
                                        placeholder="e.g. 170"
                                        className={inputClass}
                                        min="100"
                                        max="220"
                                    />
                                    <span className="absolute right-3 top-3 text-foreground-muted text-xs">bpm</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Zone 4 ends at LTHR</p>
                            </div>
                            <div>
                                <label className="block text-xs text-foreground-muted mb-1 uppercase">Threshold Pace</label>
                                <div className="flex gap-1 items-center">
                                    <input
                                        type="number"
                                        value={thresholdPaceMin}
                                        onChange={e => setThresholdPaceMin(e.target.value)}
                                        placeholder="4"
                                        className={`${inputClass} w-16 text-center`}
                                        min="2"
                                        max="10"
                                    />
                                    <span className="text-foreground-muted">:</span>
                                    <input
                                        type="number"
                                        value={thresholdPaceSec}
                                        onChange={e => setThresholdPaceSec(e.target.value)}
                                        placeholder="30"
                                        className={`${inputClass} w-16 text-center`}
                                        min="0"
                                        max="59"
                                    />
                                    <span className="text-foreground-muted text-xs">/km</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">~1 hour race pace</p>
                            </div>
                        </div>
                    </div>

                    {/* Calculated 7 Zones Display */}
                    {calculatedZones.length > 0 && (
                        <div className="bg-black/20 rounded-lg p-4 border border-white/5">
                            <h4 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">Calculated HR Zones (7-Zone Model)</h4>
                            <div className="space-y-1">
                                {calculatedZones.map((zone, i) => {
                                    const colors = ['text-green-400', 'text-lime-400', 'text-yellow-400', 'text-orange-400', 'text-red-400', 'text-indigo-400', 'text-purple-400'];
                                    return (
                                        <div key={i} className="flex justify-between items-center text-sm p-2 hover:bg-white/5 rounded">
                                            <span className={`${colors[i]} font-medium`}>{zone.label}</span>
                                            <span className="text-white font-mono">
                                                {zone.min} - {zone.max === 999 ? '∞' : zone.max} <span className="text-gray-500 text-xs">bpm</span>
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Manual Zone Overrides (% of Max HR) */}
                    <div>
                        <p className="text-xs text-foreground-muted mb-3">Zone thresholds (% of Max HR) - Manual override</p>
                        <div className="grid grid-cols-6 gap-2">
                            <div>
                                <label className="block text-xs text-green-400 mb-1 text-center">Z1</label>
                                <input
                                    type="number"
                                    value={zone1Max}
                                    onChange={e => setZone1Max(parseInt(e.target.value) || 60)}
                                    className={`${inputClass} text-center text-sm px-1`}
                                    min="50" max="70"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-lime-400 mb-1 text-center">Z2</label>
                                <input
                                    type="number"
                                    value={zone2Max}
                                    onChange={e => setZone2Max(parseInt(e.target.value) || 70)}
                                    className={`${inputClass} text-center text-sm px-1`}
                                    min="60" max="80"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-yellow-400 mb-1 text-center">Z3</label>
                                <input
                                    type="number"
                                    value={zone3Max}
                                    onChange={e => setZone3Max(parseInt(e.target.value) || 80)}
                                    className={`${inputClass} text-center text-sm px-1`}
                                    min="70" max="90"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-orange-400 mb-1 text-center">Z4</label>
                                <input
                                    type="number"
                                    value={zone4Max}
                                    onChange={e => setZone4Max(parseInt(e.target.value) || 90)}
                                    className={`${inputClass} text-center text-sm px-1`}
                                    min="80" max="100"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-red-400 mb-1 text-center">Z5</label>
                                <input
                                    type="number"
                                    value={zone5Max}
                                    onChange={e => setZone5Max(parseInt(e.target.value) || 95)}
                                    className={`${inputClass} text-center text-sm px-1`}
                                    min="85" max="105"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-indigo-400 mb-1 text-center">Z6</label>
                                <input
                                    type="number"
                                    value={zone6Max}
                                    onChange={e => setZone6Max(parseInt(e.target.value) || 100)}
                                    className={`${inputClass} text-center text-sm px-1`}
                                    min="90" max="110"
                                />
                            </div>
                        </div>
                        <p className="text-xs text-foreground-muted mt-2">Z7 = above Z6 Max</p>
                    </div>
                </div>
            )}
        </div>
    );
}
