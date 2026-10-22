'use client';

import React, { useState } from 'react';
import { X, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface EngineGenerateModalProps {
    isOpen: boolean;
    onClose: () => void;
    goalId?: string;
    initialSport?: string | null;
    initialRaceType?: string | null;
    initialRaceDate?: Date | null;
    initialVdot?: number | null;
    onSuccess?: () => void;
}

const RACE_TYPES = [
    { value: 'FIVE_K', label: '5K' },
    { value: 'TEN_K', label: '10K' },
    { value: 'HALF_MARATHON', label: 'Half Marathon' },
    { value: 'MARATHON', label: 'Marathon' },
    { value: 'FIFTY_K', label: '50K Ultra' },
    { value: 'FIFTY_MILE', label: '50 Mile Ultra' },
    { value: 'HUNDRED_K', label: '100K Ultra' },
    { value: 'HUNDRED_MILE', label: '100 Mile Ultra' },
    { value: 'TWELVE_HOUR', label: '12-Hour Timed' },
    { value: 'TWENTY_FOUR_HOUR', label: '24-Hour Timed' },
    { value: 'BACKYARD_ULTRA', label: 'Backyard Ultra' },
    { value: 'SPRINT_TRI', label: 'Sprint Triathlon' },
    { value: 'OLYMPIC_TRI', label: 'Olympic Triathlon' },
    { value: 'HALF_IRONMAN', label: 'Half Ironman (70.3)' },
    { value: 'FULL_IRONMAN', label: 'Full Ironman (140.6)' },
    { value: 'CUSTOM_TRI', label: 'Custom Triathlon' },
    { value: 'OTHER', label: 'Custom / Other' },
];

export function EngineGenerateModal({
    isOpen,
    onClose,
    goalId,
    initialSport = 'RUN',
    initialRaceType = 'MARATHON',
    initialRaceDate,
    initialVdot = 45,
    onSuccess,
}: EngineGenerateModalProps) {
    const [sport, setSport] = useState<'RUN' | 'CYCLING' | 'TRIATHLON'>(
        initialSport === 'TRIATHLON' ? 'TRIATHLON' : initialSport === 'CYCLING' ? 'CYCLING' : 'RUN'
    );
    const [raceType, setRaceType] = useState(initialRaceType || 'MARATHON');
    const [raceDate, setRaceDate] = useState(
        initialRaceDate
            ? new Date(initialRaceDate).toISOString().split('T')[0]
            : new Date(Date.now() + 12 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );
    const [currentVdot, setCurrentVdot] = useState(initialVdot || 45);
    const [ftpWatts, setFtpWatts] = useState(220);
    const [swimCssSecPer100m, setSwimCssSecPer100m] = useState(115); // 1:55 / 100m
    const [runsPerWeek, setRunsPerWeek] = useState(initialSport === 'CYCLING' ? 0 : 4);
    const [ridesPerWeek, setRidesPerWeek] = useState(sport === 'TRIATHLON' ? 3 : sport === 'CYCLING' ? 4 : 0);
    const [swimsPerWeek, setSwimsPerWeek] = useState(sport === 'TRIATHLON' ? 2 : 0);
    const [strengthPerWeek, setStrengthPerWeek] = useState(1);
    const [weeklyMileageGoal, setWeeklyMileageGoal] = useState(50);

    // Phase weeks
    const [buildWeeks, setBuildWeeks] = useState(4);
    const [peakWeeks, setPeakWeeks] = useState(3);
    const [taperWeeks, setTaperWeeks] = useState(3);

    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSportChange = (s: 'RUN' | 'CYCLING' | 'TRIATHLON') => {
        setSport(s);
        if (s === 'CYCLING') {
            setRunsPerWeek(0);
            setRidesPerWeek(4);
            setSwimsPerWeek(0);
            setStrengthPerWeek(1);
        } else if (s === 'TRIATHLON') {
            if (!raceType.includes('TRI') && !raceType.includes('IRONMAN')) {
                setRaceType('HALF_IRONMAN');
            }
            if (runsPerWeek === 0) setRunsPerWeek(3);
            if (ridesPerWeek === 0) setRidesPerWeek(3);
            if (swimsPerWeek === 0) setSwimsPerWeek(2);
        } else {
            if (raceType.includes('TRI') || raceType.includes('IRONMAN')) {
                setRaceType('MARATHON');
            }
            if (runsPerWeek === 0) setRunsPerWeek(4);
        }
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        setError(null);
        const isCycling = sport === 'CYCLING';

        try {
            if (goalId) {
                // 1. Snapshot first
                await fetch(`/api/plan-advanced/${goalId}/snapshot`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        description: 'Auto-snapshot before Engine generation',
                        operation: 'engine_generate',
                    }),
                });

                // 2. Call regenerate
                const res = await fetch(`/api/plan-advanced/${goalId}/regenerate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sport: isCycling ? 'TRIATHLON' : sport,
                        raceType: isCycling ? 'OLYMPIC_TRI' : raceType,
                        raceDate,
                        currentVdot,
                        ftpWatts,
                        swimCssSecPer100m,
                        runsPerWeek,
                        ridesPerWeek: isCycling ? Math.max(1, ridesPerWeek) : ridesPerWeek,
                        swimsPerWeek,
                        strengthPerWeek,
                        weeklyMileageGoal,
                        buildWeeks,
                        peakWeeks,
                        taperWeeks,
                        matchToMyWhoosh: false,
                        mywhooshPlanId: null,
                    }),
                });

                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error(data.error || 'Failed to generate plan');
                }

                toast.success('Plan adapted and phases regenerated with web engine');
            } else {
                // Create brand new plan via /api/plans
                const res = await fetch('/api/plans', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: isCycling
                            ? '8-Week Cycling FTP Block'
                            : `${raceType.replace(/_/g, ' ')} Plan`,
                        sport: isCycling ? 'CYCLING' : sport,
                        raceType: isCycling ? null : raceType,
                        raceDate: isCycling ? null : new Date(raceDate).toISOString(),
                        durationWeeks: isCycling ? 8 : undefined,
                        currentVdot,
                        ftpWatts,
                        swimCssSecPer100m,
                        runsPerWeek,
                        ridesPerWeek,
                        swimsPerWeek,
                        strengthPerWeek,
                        weeklyMileageGoal: weeklyMileageGoal * 1000,
                        targetVolume: weeklyMileageGoal * 1000,
                        buildWeeks,
                        peakWeeks,
                        taperWeeks,
                        planSource: 'advanced',
                        matchToMyWhoosh: false,
                        mywhooshPlanId: null,
                    }),
                });

                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error(data.error || 'Failed to create plan');
                }

                toast.success('New structured plan created successfully');
            }

            onSuccess?.();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Generation failed');
            toast.error(err.message || 'Generation failed');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-background-secondary border border-glass-border rounded-lg max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-glass-border shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-workout-tempo/15 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-workout-tempo" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-foreground">Generate / Adapt with Engine</h2>
                            <p className="text-[11px] text-foreground-muted">
                                Multi-sport periodization & structured workouts
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isGenerating}
                        className="p-1 rounded text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Form Content */}
                <div className="overflow-y-auto p-5 space-y-4 text-xs font-sans">
                    {error && (
                        <div className="p-3 bg-negative/10 border border-negative/30 rounded-md flex items-center gap-2 text-negative text-xs">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Sport Selection */}
                    <div>
                        <label className="block text-[11px] font-semibold text-foreground mb-1.5 uppercase tracking-wider">
                            Primary Sport
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                type="button"
                                onClick={() => handleSportChange('RUN')}
                                className={`py-2 px-2.5 rounded-md border text-xs font-medium transition-all ${
                                    sport === 'RUN'
                                        ? 'bg-accent-blue/15 border-accent-blue text-accent-blue font-semibold'
                                        : 'bg-background-tertiary border-glass-border text-foreground-secondary hover:text-foreground'
                                }`}
                            >
                                Running
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSportChange('CYCLING')}
                                className={`py-2 px-2.5 rounded-md border text-xs font-medium transition-all ${
                                    sport === 'CYCLING'
                                        ? 'bg-accent-cyan/15 border-accent-cyan text-accent-cyan font-semibold'
                                        : 'bg-background-tertiary border-glass-border text-foreground-secondary hover:text-foreground'
                                }`}
                            >
                                Cycling (MyWhoosh)
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSportChange('TRIATHLON')}
                                className={`py-2 px-2.5 rounded-md border text-xs font-medium transition-all ${
                                    sport === 'TRIATHLON'
                                        ? 'bg-workout-tempo/15 border-workout-tempo text-workout-tempo font-semibold'
                                        : 'bg-background-tertiary border-glass-border text-foreground-secondary hover:text-foreground'
                                }`}
                            >
                                Triathlon
                            </button>
                        </div>
                    </div>

                    {/* Race Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[11px] font-medium text-foreground-secondary mb-1">
                                Target Event Type
                            </label>
                            <select
                                value={raceType}
                                onChange={(e) => setRaceType(e.target.value)}
                                className="w-full bg-background-tertiary border border-glass-border rounded px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
                            >
                                {RACE_TYPES.map((rt) => (
                                    <option key={rt.value} value={rt.value}>
                                        {rt.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[11px] font-medium text-foreground-secondary mb-1">
                                Event Date
                            </label>
                            <input
                                type="date"
                                value={raceDate}
                                onChange={(e) => setRaceDate(e.target.value)}
                                className="w-full bg-background-tertiary border border-glass-border rounded px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Calibration Metrics */}
                    <div className="p-3 bg-background-tertiary/30 rounded-md border border-glass-border space-y-3">
                        <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider block">
                            Calibration & Fitness Benchmarks
                        </span>
                        <div className="grid grid-cols-3 gap-2.5">
                            <div>
                                <label className="block text-[10px] text-foreground-muted mb-1">Current VDOT</label>
                                <input
                                    type="number"
                                    min={20}
                                    max={85}
                                    step={0.5}
                                    value={currentVdot}
                                    onChange={(e) => setCurrentVdot(parseFloat(e.target.value) || 45)}
                                    className="w-full bg-background-tertiary border border-glass-border rounded px-2 py-1 font-mono text-xs text-foreground focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] text-foreground-muted mb-1">Bike FTP (Watts)</label>
                                <input
                                    type="number"
                                    min={50}
                                    max={600}
                                    value={ftpWatts}
                                    onChange={(e) => setFtpWatts(parseInt(e.target.value, 10) || 200)}
                                    className="w-full bg-background-tertiary border border-glass-border rounded px-2 py-1 font-mono text-xs text-foreground focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] text-foreground-muted mb-1">Swim CSS (sec/100m)</label>
                                <input
                                    type="number"
                                    min={50}
                                    max={300}
                                    value={swimCssSecPer100m}
                                    onChange={(e) => setSwimCssSecPer100m(parseInt(e.target.value, 10) || 120)}
                                    className="w-full bg-background-tertiary border border-glass-border rounded px-2 py-1 font-mono text-xs text-foreground focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Weekly Frequency */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div>
                            <label className="block text-[10px] text-foreground-muted mb-1">Runs / week</label>
                            <input
                                type="number"
                                min={0}
                                max={7}
                                value={runsPerWeek}
                                onChange={(e) => {
                                    const parsed = parseInt(e.target.value, 10);
                                    setRunsPerWeek(Number.isNaN(parsed) ? 0 : Math.max(0, Math.min(7, parsed)));
                                }}
                                className="w-full bg-background-tertiary border border-glass-border rounded px-2 py-1 font-mono text-xs text-foreground focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] text-foreground-muted mb-1">Rides / week</label>
                            <input
                                type="number"
                                min={0}
                                max={7}
                                value={ridesPerWeek}
                                onChange={(e) => setRidesPerWeek(parseInt(e.target.value, 10) || 0)}
                                className="w-full bg-background-tertiary border border-glass-border rounded px-2 py-1 font-mono text-xs text-foreground focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] text-foreground-muted mb-1">Swims / week</label>
                            <input
                                type="number"
                                min={0}
                                max={7}
                                value={swimsPerWeek}
                                onChange={(e) => setSwimsPerWeek(parseInt(e.target.value, 10) || 0)}
                                className="w-full bg-background-tertiary border border-glass-border rounded px-2 py-1 font-mono text-xs text-foreground focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] text-foreground-muted mb-1">Strength / week</label>
                            <input
                                type="number"
                                min={0}
                                max={7}
                                value={strengthPerWeek}
                                onChange={(e) => setStrengthPerWeek(parseInt(e.target.value, 10) || 0)}
                                className="w-full bg-background-tertiary border border-glass-border rounded px-2 py-1 font-mono text-xs text-foreground focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Volume & Phase Weeks (hidden on pure MyWhoosh Cycling plans with 0 runs) */}
                    {sport !== 'CYCLING' && runsPerWeek > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            <div>
                                <label className="block text-[10px] text-foreground-muted mb-1">Peak Run (km/wk)</label>
                                <input
                                    type="number"
                                    min={10}
                                    max={250}
                                    value={weeklyMileageGoal}
                                    onChange={(e) => setWeeklyMileageGoal(parseInt(e.target.value, 10) || 40)}
                                    className="w-full bg-background-tertiary border border-glass-border rounded px-2 py-1 font-mono text-xs text-foreground focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] text-foreground-muted mb-1">Build Weeks</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={24}
                                    value={buildWeeks}
                                    onChange={(e) => setBuildWeeks(parseInt(e.target.value, 10) || 4)}
                                    className="w-full bg-background-tertiary border border-glass-border rounded px-2 py-1 font-mono text-xs text-foreground focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] text-foreground-muted mb-1">Peak Weeks</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={8}
                                    value={peakWeeks}
                                    onChange={(e) => setPeakWeeks(parseInt(e.target.value, 10) || 3)}
                                    className="w-full bg-background-tertiary border border-glass-border rounded px-2 py-1 font-mono text-xs text-foreground focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] text-foreground-muted mb-1">Taper Weeks</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={4}
                                    value={taperWeeks}
                                    onChange={(e) => setTaperWeeks(parseInt(e.target.value, 10) || 3)}
                                    className="w-full bg-background-tertiary border border-glass-border rounded px-2 py-1 font-mono text-xs text-foreground focus:outline-none"
                                />
                            </div>
                        </div>
                    )}

                    {/* Cycling .zwo Export & Import Info */}
                    {(sport === 'CYCLING' || sport === 'TRIATHLON' || ridesPerWeek > 0) && (
                        <div className="p-3 bg-background-tertiary/30 rounded-md border border-glass-border space-y-1">
                            <span className="text-[11px] font-semibold text-accent-cyan uppercase tracking-wider block">
                                MyWhoosh .zwo Workout Export &amp; Plan Import
                            </span>
                            <p className="text-[10px] text-foreground-muted leading-relaxed">
                                Planned rides include structured %FTP intervals that can be exported as <strong>.zwo</strong> files for MyWhoosh. To import a specific plan schedule, use <strong>Import CSV</strong>, <strong>AI Chat Calendar Picture Import</strong>, or <strong>MCP</strong>.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-glass-border bg-background-tertiary/20 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isGenerating}
                        className="px-3 py-1.5 rounded-md border border-glass-border text-xs text-foreground-secondary hover:text-foreground hover:bg-background-tertiary transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-workout-tempo hover:bg-workout-tempo/90 text-white font-medium text-xs transition-colors shadow disabled:opacity-50"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Generating Plan...</span>
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Generate Plan</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default EngineGenerateModal;
