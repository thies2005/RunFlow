import { useState } from 'react';
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
    ftpWatts?: number;
    setFtpWatts?: (_val: number) => void;
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
    setZone6Max,
    ftpWatts = 250,
    setFtpWatts,
}: HeartRateZonesSectionProps) {
    const [zoneSportTab, setZoneSportTab] = useState<'running' | 'cycling'>('running');
    const [localFtp, setLocalFtp] = useState<number>(ftpWatts || 250);
    const activeFtp = setFtpWatts ? ftpWatts : localFtp;
    const updateFtp = (val: number) => {
        setLocalFtp(val);
        setFtpWatts?.(val);
    };
    const runLthr = parseInt(thresholdHR, 10) || Math.round(maxHeartRate * 0.9);
    const bikeLthr = Math.max(100, runLthr - 8);
    const cogganZones = [
        { label: 'Z1 Active Recovery (<55%)', min: 0, max: Math.round(activeFtp * 0.55), color: 'text-emerald-400' },
        { label: 'Z2 Endurance (56–75%)', min: Math.round(activeFtp * 0.56), max: Math.round(activeFtp * 0.75), color: 'text-blue-400' },
        { label: 'Z3 Tempo (76–90%)', min: Math.round(activeFtp * 0.76), max: Math.round(activeFtp * 0.90), color: 'text-cyan-400' },
        { label: 'Z4 Threshold (91–105%)', min: Math.round(activeFtp * 0.91), max: Math.round(activeFtp * 1.05), color: 'text-amber-400' },
        { label: 'Z5 VO2max (106–120%)', min: Math.round(activeFtp * 1.06), max: Math.round(activeFtp * 1.20), color: 'text-orange-400' },
        { label: 'Z6 Anaerobic (121–150%)', min: Math.round(activeFtp * 1.21), max: Math.round(activeFtp * 1.50), color: 'text-purple-400' },
        { label: 'Z7 Neuromuscular (>150%)', min: Math.round(activeFtp * 1.51), max: 9999, color: 'text-rose-400' },
    ];
    const bikeHrZones = [
        { label: 'Z1 Recovery', min: 0, max: Math.round(bikeLthr * 0.75) },
        { label: 'Z2 Endurance', min: Math.round(bikeLthr * 0.75) + 1, max: Math.round(bikeLthr * 0.87) },
        { label: 'Z3 Tempo', min: Math.round(bikeLthr * 0.87) + 1, max: Math.round(bikeLthr * 0.94) },
        { label: 'Z4 Threshold', min: Math.round(bikeLthr * 0.94) + 1, max: bikeLthr },
        { label: 'Z5 VO2max', min: bikeLthr + 1, max: Math.round(bikeLthr * 1.05) },
        { label: 'Z6 Anaerobic', min: Math.round(bikeLthr * 1.05) + 1, max: Math.round(bikeLthr * 1.10) },
        { label: 'Z7 Neuromuscular', min: Math.round(bikeLthr * 1.10) + 1, max: 999 },
    ];
    const inputClass = "bg-surface border border-glass-border rounded-md p-3 text-foreground w-full outline-hidden focus:ring-2 focus:ring-accent-orange transition-all";

    return (
        <div className="border-t border-glass-border pt-4">
            <button
                type="button"
                onClick={() => setShowHeartRate(!showHeartRate)}
                className="flex items-center justify-between w-full text-left py-2"
            >
                <h3 className="text-sm font-semibold text-foreground-muted">Heart Rate &amp; Power Zones</h3>
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
                            <label className="block text-xs text-foreground-muted mb-1">Max HR</label>
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
                            <label className="block text-xs text-foreground-muted mb-1">Resting HR</label>
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
                            <label className="block text-xs text-foreground-muted mb-1">Weight (kg)</label>
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
                    <div className="bg-surface rounded-md p-4 border border-glass-border">
                        <h4 className="text-xs font-semibold text-accent-orange mb-3">Threshold Values</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-foreground-muted mb-1">Lactate Threshold HR (LTHR)</label>
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
                                <p className="text-xs text-foreground-muted mt-1">Zone 4 ends at LTHR</p>
                            </div>
                            <div>
                                <label className="block text-xs text-foreground-muted mb-1">Threshold Pace</label>
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
                                <p className="text-xs text-foreground-muted mt-1">~1 hour race pace</p>
                            </div>
                        </div>
                    </div>

                    {/* Sport Switcher for Running vs Cycling Zones */}
                    <div className="bg-background-tertiary rounded-md p-4 border border-line space-y-4">
                        <div className="flex items-center justify-between gap-2">
                            <h4 className="text-xs font-semibold text-foreground-muted">Sport-Specific Zones (Running vs Cycling)</h4>
                            <div className="flex gap-1 bg-surface p-1 rounded border border-glass-border">
                                <button
                                    type="button"
                                    onClick={() => setZoneSportTab('running')}
                                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                                        zoneSportTab === 'running' ? 'bg-accent-orange text-white' : 'text-foreground-muted hover:text-foreground'
                                    }`}
                                >
                                    Running HR
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setZoneSportTab('cycling')}
                                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                                        zoneSportTab === 'cycling' ? 'bg-accent-cyan text-white' : 'text-foreground-muted hover:text-foreground'
                                    }`}
                                >
                                    Cycling Power & HR
                                </button>
                            </div>
                        </div>

                        {zoneSportTab === 'running' ? (
                            calculatedZones.length > 0 && (
                                <div className="space-y-1">
                                    {calculatedZones.map((zone, i) => {
                                        const colors = ['text-zone-1', 'text-zone-2', 'text-zone-3', 'text-zone-4', 'text-zone-5', 'text-workout-strength', 'text-workout-long-run'];
                                        return (
                                            <div key={i} className="flex justify-between items-center text-sm p-2 hover:bg-surface-hover rounded">
                                                <span className={`${colors[i]} font-medium`}>{zone.label}</span>
                                                <span className="text-foreground font-mono tabular-nums">
                                                    {zone.min} - {zone.max === 999 ? '∞' : zone.max} <span className="text-foreground-muted text-xs">bpm</span>
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs text-foreground-muted mb-1">Cycling FTP (Watts)</label>
                                    <input
                                        type="number"
                                        min={50}
                                        max={600}
                                        value={activeFtp}
                                        onChange={e => updateFtp(parseInt(e.target.value, 10) || 200)}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-accent-cyan mb-2">Cycling Power Zones (Coggan 7-Zone)</p>
                                    <div className="space-y-1">
                                        {cogganZones.map((z, i) => (
                                            <div key={i} className="flex justify-between items-center text-xs p-1.5 hover:bg-surface-hover rounded">
                                                <span className={`${z.color} font-medium`}>{z.label}</span>
                                                <span className="text-foreground font-mono tabular-nums">
                                                    {z.min} - {z.max === 9999 ? '∞' : z.max} <span className="text-foreground-muted">W</span>
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-accent-orange mb-2">Cycling Heart Rate Zones (Cycling LTHR ~{bikeLthr} bpm)</p>
                                    <div className="space-y-1">
                                        {bikeHrZones.map((zone, i) => {
                                            const colors = ['text-zone-1', 'text-zone-2', 'text-zone-3', 'text-zone-4', 'text-zone-5', 'text-workout-strength', 'text-workout-long-run'];
                                            return (
                                                <div key={i} className="flex justify-between items-center text-xs p-1.5 hover:bg-surface-hover rounded">
                                                    <span className={`${colors[i]} font-medium`}>{zone.label}</span>
                                                    <span className="text-foreground font-mono tabular-nums">
                                                        {zone.min} - {zone.max === 999 ? '∞' : zone.max} <span className="text-foreground-muted">bpm</span>
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Manual Zone Overrides (BPM) */}
                    <div>
                        <p className="text-xs text-foreground-muted mb-3">Zone thresholds (BPM) - Manual override</p>
                        <div className="grid grid-cols-6 gap-2">
                            <div>
                                <label className="block text-xs text-zone-1 mb-1 text-center">Z1</label>
                                <input
                                    type="number"
                                    value={zone1Max}
                                    onChange={e => setZone1Max(parseInt(e.target.value) || 130)}
                                    className={`${inputClass} text-center text-sm px-1`}
                                    min="80" max="160"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-zone-2 mb-1 text-center">Z2</label>
                                <input
                                    type="number"
                                    value={zone2Max}
                                    onChange={e => setZone2Max(parseInt(e.target.value) || 148)}
                                    className={`${inputClass} text-center text-sm px-1`}
                                    min="100" max="175"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-zone-3 mb-1 text-center">Z3</label>
                                <input
                                    type="number"
                                    value={zone3Max}
                                    onChange={e => setZone3Max(parseInt(e.target.value) || 160)}
                                    className={`${inputClass} text-center text-sm px-1`}
                                    min="110" max="185"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-zone-4 mb-1 text-center">Z4</label>
                                <input
                                    type="number"
                                    value={zone4Max}
                                    onChange={e => setZone4Max(parseInt(e.target.value) || 170)}
                                    className={`${inputClass} text-center text-sm px-1`}
                                    min="120" max="200"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-zone-5 mb-1 text-center">Z5</label>
                                <input
                                    type="number"
                                    value={zone5Max}
                                    onChange={e => setZone5Max(parseInt(e.target.value) || 178)}
                                    className={`${inputClass} text-center text-sm px-1`}
                                    min="130" max="210"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-workout-strength mb-1 text-center">Z6</label>
                                <input
                                    type="number"
                                    value={zone6Max}
                                    onChange={e => setZone6Max(parseInt(e.target.value) || 187)}
                                    className={`${inputClass} text-center text-sm px-1`}
                                    min="140" max="220"
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
