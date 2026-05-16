'use client';

import { useState, useCallback } from 'react';
import {
    Calendar, ChevronRight, ChevronLeft, Download, FileText, FileSpreadsheet,
    Loader2, Zap, Award, ArrowRight, Activity, Timer
} from 'lucide-react';
import Link from 'next/link';

type RaceOption = {
    value: string;
    label: string;
    icon: string;
    category: string;
};

const RACE_OPTIONS: RaceOption[] = [
    { value: 'FIVE_K', label: '5K', icon: '🏃', category: 'Running' },
    { value: 'TEN_K', label: '10K', icon: '🏃‍♂️', category: 'Running' },
    { value: 'HALF_MARATHON', label: 'Half Marathon', icon: '🏅', category: 'Running' },
    { value: 'MARATHON', label: 'Marathon', icon: '🎯', category: 'Running' },
    { value: 'FIFTY_K', label: '50K Ultra', icon: '⛰️', category: 'Ultra' },
    { value: 'SPRINT_TRI', label: 'Sprint Tri', icon: '🏊', category: 'Triathlon' },
    { value: 'OLYMPIC_TRI', label: 'Olympic Tri', icon: '🏊‍♂️', category: 'Triathlon' },
    { value: 'HALF_IRONMAN', label: 'Half Ironman', icon: '🚴', category: 'Triathlon' },
    { value: 'FULL_IRONMAN', label: 'Ironman', icon: '🧑‍🚀', category: 'Triathlon' },
];

const FITNESS_LEVELS = [
    {
        value: 'beginner',
        label: 'Beginner',
        desc: 'New to running or <1 year',
        vdot: '30',
        icon: '🌱',
    },
    {
        value: 'intermediate',
        label: 'Intermediate',
        desc: '1-3 years, regular training',
        vdot: '40',
        icon: '💪',
    },
    {
        value: 'advanced',
        label: 'Advanced',
        desc: '3+ years, competitive',
        vdot: '50',
        icon: '🏆',
    },
];

type PlanWeek = {
    weekNumber: number;
    phase: string;
    workouts: PlanWorkout[];
    totalDistanceKm: string;
};

type PlanWorkout = {
    date: string;
    dayOfWeek: string;
    type: string;
    description: string;
    displayDescription: string;
    distanceKm: string;
    durationMin: string;
    pace: string;
    phase: string;
    intensityZone: string | null;
};

type PlanData = {
    raceType: string;
    raceDate: string;
    fitnessLevel: string;
    vdot: number;
    totalWeeks: number;
    totalDistanceKm: string;
    runsPerWeek: number;
    weeks: PlanWeek[];
};

const PHASE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    BASE: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
    BUILD: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
    PEAK: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
    TAPER: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
    RACE_WEEK: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
    RECOVERY: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
    ENDURANCE: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
    MAINTAIN: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' },
};

const TYPE_COLORS: Record<string, string> = {
    EASY: 'bg-gray-500/20 text-gray-300',
    LONG_RUN: 'bg-purple-500/20 text-purple-300',
    TEMPO: 'bg-orange-500/20 text-orange-300',
    INTERVALS: 'bg-red-500/20 text-red-300',
    FARTLEK: 'bg-pink-500/20 text-pink-300',
    REPETITIONS: 'bg-red-500/20 text-red-300',
    RECOVERY: 'bg-green-500/20 text-green-300',
    RACE: 'bg-yellow-500/20 text-yellow-300',
    RIDE: 'bg-blue-500/20 text-blue-300',
    SWIM: 'bg-cyan-500/20 text-cyan-300',
    STRENGTH: 'bg-indigo-500/20 text-indigo-300',
};

type Step = 'race' | 'config' | 'plan';

export default function PlanGeneratorPage() {
    const [step, setStep] = useState<Step>('race');
    const [raceType, setRaceType] = useState('');
    const [raceDate, setRaceDate] = useState('');
    const [fitnessLevel, setFitnessLevel] = useState('');
    const [runsPerWeek, setRunsPerWeek] = useState(0);
    const [plan, setPlan] = useState<PlanData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
    const [exporting, setExporting] = useState<string | null>(null);
    const [showSignUp, setShowSignUp] = useState(false);

    const canProceedFromRace = raceType !== '';
    const canProceedFromConfig = raceDate !== '' && fitnessLevel !== '';

    const getMinDate = () => {
        const d = new Date();
        d.setDate(d.getDate() + 14);
        return d.toISOString().split('T')[0];
    };

    const handleGenerate = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/public/plan/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    raceType,
                    raceDate,
                    fitnessLevel,
                    runsPerWeek: runsPerWeek || undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Failed to generate plan');
                return;
            }
            setPlan(data.plan);
            setExpandedWeek(1);
            setStep('plan');
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [raceType, raceDate, fitnessLevel, runsPerWeek]);

    const handleExport = useCallback(async (format: 'csv' | 'html') => {
        if (!plan) return;
        setExporting(format);
        try {
            const res = await fetch('/api/public/plan/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ format, plan }),
            });
            if (!res.ok) throw new Error('Export failed');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `runflow-${plan.raceType.replace(/\s+/g, '-')}-plan.${format === 'csv' ? 'csv' : 'html'}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch {
        } finally {
            setExporting(null);
        }
    }, [plan]);

    const handlePrint = useCallback(() => {
        window.print();
    }, []);

    const handleReset = useCallback(() => {
        setStep('race');
        setRaceType('');
        setRaceDate('');
        setFitnessLevel('');
        setRunsPerWeek(0);
        setPlan(null);
        setError('');
        setExpandedWeek(null);
        setShowSignUp(false);
    }, []);

    const selectedRace = RACE_OPTIONS.find(r => r.value === raceType);

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b border-glass-border bg-surface/80 backdrop-blur-sm sticky top-0 z-10 print:hidden">
                <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 no-underline">
                        <Activity className="w-6 h-6 text-accent-orange" />
                        <span className="font-bold text-lg text-foreground">RunFlow</span>
                    </Link>
                    {step !== 'race' && (
                        <button
                            onClick={handleReset}
                            className="text-sm text-foreground-muted hover:text-foreground transition-colors"
                        >
                            Start Over
                        </button>
                    )}
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 py-6">
                {step === 'race' && (
                    <div className="animate-fade-in">
                        <div className="text-center mb-8">
                            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                                Free Training Plan Generator
                            </h1>
                            <p className="text-foreground-muted text-sm sm:text-base">
                                Create a personalized training plan in seconds. No sign-up needed.
                            </p>
                        </div>

                        <div className="mb-6">
                            <h2 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider mb-3">
                                What are you training for?
                            </h2>
                            <div className="grid grid-cols-3 gap-2">
                                {RACE_OPTIONS.map(race => (
                                    <button
                                        key={race.value}
                                        onClick={() => setRaceType(race.value)}
                                        className={`p-3 sm:p-4 rounded-xl border text-center transition-all ${
                                            raceType === race.value
                                                ? 'border-accent-orange bg-accent-orange/10 text-foreground'
                                                : 'border-glass-border bg-surface hover:bg-surface-hover text-foreground-secondary'
                                        }`}
                                    >
                                        <div className="text-xl sm:text-2xl mb-1">{race.icon}</div>
                                        <div className="text-xs sm:text-sm font-medium leading-tight">{race.label}</div>
                                        <div className="text-[10px] sm:text-xs text-foreground-muted mt-0.5">{race.category}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button
                                onClick={() => canProceedFromRace && setStep('config')}
                                disabled={!canProceedFromRace}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-accent-orange text-white font-medium text-sm hover:bg-accent-orange/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                                Next
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {step === 'config' && (
                    <div className="animate-fade-in">
                        <button
                            onClick={() => setStep('race')}
                            className="flex items-center gap-1 text-sm text-foreground-muted hover:text-foreground mb-6 transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Back
                        </button>

                        <div className="text-center mb-6">
                            <div className="text-3xl mb-2">{selectedRace?.icon}</div>
                            <h2 className="text-xl font-bold text-foreground">{selectedRace?.label} Plan</h2>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-semibold text-foreground-muted uppercase tracking-wider mb-2">
                                    <Calendar className="w-4 h-4 inline mr-1" />
                                    Race Date
                                </label>
                                <input
                                    type="date"
                                    value={raceDate}
                                    min={getMinDate()}
                                    onChange={e => setRaceDate(e.target.value)}
                                    className="w-full bg-surface border border-glass-border rounded-lg px-4 py-3 text-foreground text-base focus:outline-none focus:ring-2 focus:ring-accent-orange/50 focus:border-accent-orange"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-foreground-muted uppercase tracking-wider mb-3">
                                    <Award className="w-4 h-4 inline mr-1" />
                                    Fitness Level
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {FITNESS_LEVELS.map(level => (
                                        <button
                                            key={level.value}
                                            onClick={() => setFitnessLevel(level.value)}
                                            className={`p-3 rounded-xl border text-center transition-all ${
                                                fitnessLevel === level.value
                                                    ? 'border-accent-orange bg-accent-orange/10'
                                                    : 'border-glass-border bg-surface hover:bg-surface-hover'
                                            }`}
                                        >
                                            <div className="text-2xl mb-1">{level.icon}</div>
                                            <div className="text-sm font-medium text-foreground">{level.label}</div>
                                            <div className="text-[11px] text-foreground-muted mt-0.5">{level.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-foreground-muted uppercase tracking-wider mb-3">
                                    <Timer className="w-4 h-4 inline mr-1" />
                                    Runs per Week <span className="text-foreground-muted font-normal normal-case">(optional)</span>
                                </label>
                                <div className="flex gap-2">
                                    {[0, 3, 4, 5, 6].map(n => (
                                        <button
                                            key={n}
                                            onClick={() => setRunsPerWeek(n)}
                                            className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                                                runsPerWeek === n
                                                    ? 'border-accent-orange bg-accent-orange/10 text-accent-orange'
                                                    : 'border-glass-border bg-surface text-foreground-secondary hover:bg-surface-hover'
                                            }`}
                                        >
                                            {n === 0 ? 'Auto' : n}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="mt-8">
                            <button
                                onClick={handleGenerate}
                                disabled={!canProceedFromConfig || loading}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-accent-orange text-white font-semibold text-base hover:bg-accent-orange/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Zap className="w-5 h-5" />
                                        Generate My Plan
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {step === 'plan' && plan && (
                    <div className="animate-fade-in">
                        <div className="print:hidden mb-6">
                            <button
                                onClick={() => setStep('config')}
                                className="flex items-center gap-1 text-sm text-foreground-muted hover:text-foreground mb-4 transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Adjust Settings
                            </button>

                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-foreground capitalize">
                                        {plan.raceType} Plan
                                    </h2>
                                    <p className="text-sm text-foreground-muted">
                                        {plan.totalWeeks} weeks | {plan.totalDistanceKm} km total | Race: {plan.raceDate}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-2 flex-wrap">
                                <button
                                    onClick={() => handleExport('csv')}
                                    disabled={exporting !== null}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface border border-glass-border text-sm text-foreground-secondary hover:bg-surface-hover transition-all disabled:opacity-50"
                                >
                                    {exporting === 'csv' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                                    CSV
                                </button>
                                <button
                                    onClick={() => handleExport('html')}
                                    disabled={exporting !== null}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface border border-glass-border text-sm text-foreground-secondary hover:bg-surface-hover transition-all disabled:opacity-50"
                                >
                                    {exporting === 'html' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                                    HTML
                                </button>
                                <button
                                    onClick={handlePrint}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface border border-glass-border text-sm text-foreground-secondary hover:bg-surface-hover transition-all"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    Print / PDF
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3 print:space-y-2">
                            {plan.weeks.map((week) => {
                                const colors = PHASE_COLORS[week.phase] || PHASE_COLORS.MAINTAIN;
                                const isExpanded = expandedWeek === week.weekNumber;

                                return (
                                    <div key={week.weekNumber} className="border border-glass-border rounded-xl overflow-hidden bg-surface">
                                        <button
                                            onClick={() => setExpandedWeek(isExpanded ? null : week.weekNumber)}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-hover transition-colors print:pointer-events-none"
                                        >
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold border ${colors.bg} ${colors.text} ${colors.border}`}>
                                                    W{week.weekNumber}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.text}`}>
                                                    {week.phase.replace(/_/g, ' ')}
                                                </span>
                                            </div>
                                            <span className="text-sm text-foreground-muted font-medium">
                                                {week.totalDistanceKm} km
                                            </span>
                                            <ChevronRight className={`w-4 h-4 text-foreground-muted transition-transform print:hidden ${isExpanded ? 'rotate-90' : ''}`} />
                                        </button>

                                        {isExpanded && (
                                            <div className="border-t border-glass-border px-4 pb-3 print:block">
                                                <div className="space-y-1 pt-2">
                                                    {week.workouts.map((w, i) => (
                                                        <div key={i} className="flex items-start gap-3 py-1.5 text-sm">
                                                            <div className="w-12 flex-shrink-0 text-foreground-muted text-xs pt-0.5">
                                                                {w.dayOfWeek}
                                                            </div>
                                                            <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold flex-shrink-0 ${TYPE_COLORS[w.type] || 'bg-gray-500/20 text-gray-300'}`}>
                                                                {w.type.replace(/_/g, ' ')}
                                                            </span>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-foreground text-sm leading-tight">
                                                                    {w.displayDescription}
                                                                </div>
                                                                <div className="flex gap-3 text-xs text-foreground-muted mt-0.5">
                                                                    <span>{w.distanceKm} km</span>
                                                                    {w.durationMin !== '-' && <span>{w.durationMin}</span>}
                                                                    {w.pace !== '-' && <span>{w.pace}</span>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {!showSignUp && (
                            <div className="mt-8 print:hidden">
                                <div className="border border-accent-orange/30 rounded-xl bg-accent-orange/5 p-5 text-center">
                                    <h3 className="text-lg font-bold text-foreground mb-1">
                                        Want to save & track this plan?
                                    </h3>
                                    <p className="text-sm text-foreground-muted mb-4">
                                        Sign up free to save plans, sync with Strava, get AI coaching, and more.
                                    </p>
                                    <div className="flex gap-3 justify-center">
                                        <a
                                            href="/register"
                                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent-orange text-white font-semibold text-sm hover:bg-accent-orange/90 transition-all"
                                        >
                                            Sign Up Free
                                            <ArrowRight className="w-4 h-4" />
                                        </a>
                                        <button
                                            onClick={() => setShowSignUp(true)}
                                            className="px-5 py-2.5 rounded-lg border border-glass-border text-foreground-secondary text-sm hover:bg-surface-hover transition-all"
                                        >
                                            Maybe Later
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-6 text-center print:hidden">
                            <button
                                onClick={handleReset}
                                className="text-sm text-foreground-muted hover:text-foreground transition-colors"
                            >
                                Generate another plan
                            </button>
                        </div>
                    </div>
                )}
            </main>

            <footer className="border-t border-glass-border mt-12 print:hidden">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/" className="text-sm text-foreground-muted hover:text-foreground transition-colors no-underline">
                        RunFlow
                    </Link>
                    <div className="flex gap-4 text-xs text-foreground-muted">
                        <a href="/login" className="hover:text-foreground transition-colors no-underline">Login</a>
                        <a href="/register" className="hover:text-foreground transition-colors no-underline">Sign Up</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
