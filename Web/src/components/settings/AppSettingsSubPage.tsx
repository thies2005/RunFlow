'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Key, ShieldCheck } from 'lucide-react';
import {
    DASHBOARD_LAYOUT_MODE_OPTIONS,
    CYCLING_METRIC_OPTIONS,
    RUNNING_METRIC_OPTIONS,
    DEFAULT_CYCLING_METRICS,
    DEFAULT_RUNNING_METRICS,
    STORAGE_KEY_LAYOUT_MODE,
    STORAGE_KEY_CYCLING_METRICS,
    STORAGE_KEY_RUNNING_METRICS,
    EVENT_DASHBOARD_LAYOUT_CHANGE,
    readDashboardLayoutMode,
    readDashboardCyclingMetrics,
    readDashboardRunningMetrics,
    readWorkoutCardStyle,
    readCountdownStyle,
    readEffortCardMode,
    readCalendarWeeksMode,
    readPrimaryLoadMetric,
    syncUiPreferencesToServer,
    type DashboardStatusLayoutMode,
    type CyclingDashboardMetricId,
    type RunningDashboardMetricId,
    type WorkoutCardStyleMode,
    type CountdownStyleMode,
    type EffortCardMode,
    type CalendarWeeksMode,
    type PrimaryLoadMetricMode,
    type UiPreferences,
} from '@/components/dashboard/TrainingStatusCard';
import { ApiSection } from './ApiSection';
import { PrivacySection } from './PrivacySection';
import { ExportDataButton } from './ExportDataButton';
import { DangerShortcut, DangerSection } from './DangerSection';

export function AppSettingsSubPage({ onBack: _onBack }: { onBack: () => void }) {
    const [section, setSection] = useState<'main' | 'api' | 'privacy' | 'danger'>('main');
    const [healthTrackingEnabled, setHealthTrackingEnabled] = useState(false);
    const [dashboardLayoutMode, setDashboardLayoutMode] = useState<DashboardStatusLayoutMode>('COMBINED_STRIP');
    const [selectedCyclingMetrics, setSelectedCyclingMetrics] = useState<CyclingDashboardMetricId[]>(DEFAULT_CYCLING_METRICS);
    const [selectedRunningMetrics, setSelectedRunningMetrics] = useState<RunningDashboardMetricId[]>(DEFAULT_RUNNING_METRICS);
    const [workoutCardStyle, setWorkoutCardStyle] = useState<WorkoutCardStyleMode>('OPTION_C');
    const [countdownStyle, setCountdownStyle] = useState<CountdownStyleMode>('COMPACT_BAR');
    const [effortCardMode, setEffortCardMode] = useState<EffortCardMode>('WEEK_AND_MONTH');
    const [calendarWeeksMode, setCalendarWeeksMode] = useState<CalendarWeeksMode>('4_WEEKS');
    const [primaryLoadMetric, setPrimaryLoadMetric] = useState<PrimaryLoadMetricMode>('TSS');

    const { data: settingsData } = useQuery({
        queryKey: ['user-settings'],
        queryFn: async () => {
            const res = await fetch('/api/settings/update-vdot');
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        refetchOnWindowFocus: false,
    });

    useEffect(() => {
        if (settingsData?.healthTrackingEnabled !== undefined) {
            setHealthTrackingEnabled(settingsData.healthTrackingEnabled);
        }
    }, [settingsData]);

    useEffect(() => {
        const syncDashboardPrefs = () => {
            setDashboardLayoutMode(readDashboardLayoutMode());
            setSelectedCyclingMetrics(readDashboardCyclingMetrics());
            setSelectedRunningMetrics(readDashboardRunningMetrics());
            setWorkoutCardStyle(readWorkoutCardStyle());
            setCountdownStyle(readCountdownStyle());
            setEffortCardMode(readEffortCardMode());
            setCalendarWeeksMode(readCalendarWeeksMode());
            setPrimaryLoadMetric(readPrimaryLoadMetric());
        };
        syncDashboardPrefs();
        window.addEventListener(EVENT_DASHBOARD_LAYOUT_CHANGE, syncDashboardPrefs);
        window.addEventListener('runflow-dashboard-layout-change', syncDashboardPrefs);
        window.addEventListener('storage', syncDashboardPrefs);
        return () => {
            window.removeEventListener(EVENT_DASHBOARD_LAYOUT_CHANGE, syncDashboardPrefs);
            window.removeEventListener('runflow-dashboard-layout-change', syncDashboardPrefs);
            window.removeEventListener('storage', syncDashboardPrefs);
        };
    }, []);

    const handleUpdatePref = (patch: Partial<UiPreferences>) => {
        if (patch.workoutCardStyle) setWorkoutCardStyle(patch.workoutCardStyle);
        if (patch.countdownStyle) setCountdownStyle(patch.countdownStyle);
        if (patch.effortCardMode) setEffortCardMode(patch.effortCardMode);
        if (patch.calendarWeeksMode) setCalendarWeeksMode(patch.calendarWeeksMode);
        if (patch.primaryLoadMetric) setPrimaryLoadMetric(patch.primaryLoadMetric);
        void syncUiPreferencesToServer(patch);
    };

    const handleApplyPreset = (preset: 'NEW_DEFAULT' | 'CLASSIC') => {
        if (preset === 'NEW_DEFAULT') {
            handleUpdatePref({
                workoutCardStyle: 'OPTION_C',
                countdownStyle: 'COMPACT_BAR',
                effortCardMode: 'WEEK_AND_MONTH',
                calendarWeeksMode: '4_WEEKS',
                primaryLoadMetric: 'TSS',
            });
        } else {
            handleUpdatePref({
                workoutCardStyle: 'OPTION_A',
                countdownStyle: 'TWO_BOX_LEGACY',
                effortCardMode: 'LEGACY_KM',
                calendarWeeksMode: '6_WEEKS_LEGACY',
                primaryLoadMetric: 'TRIMP',
            });
        }
    };

    const isNewDefaultActive =
        workoutCardStyle === 'OPTION_C' &&
        countdownStyle === 'COMPACT_BAR' &&
        effortCardMode === 'WEEK_AND_MONTH' &&
        calendarWeeksMode === '4_WEEKS' &&
        primaryLoadMetric === 'TSS';

    const isClassicActive =
        workoutCardStyle === 'OPTION_A' &&
        countdownStyle === 'TWO_BOX_LEGACY' &&
        effortCardMode === 'LEGACY_KM' &&
        calendarWeeksMode === '6_WEEKS_LEGACY' &&
        primaryLoadMetric === 'TRIMP';

    const handleSelectDashboardLayoutMode = (mode: DashboardStatusLayoutMode) => {
        setDashboardLayoutMode(mode);
        try {
            localStorage.setItem(STORAGE_KEY_LAYOUT_MODE, mode);
            window.dispatchEvent(new Event(EVENT_DASHBOARD_LAYOUT_CHANGE));
        } catch {
            // ignore
        }
    };

    const handleToggleDashboardCyclingMetric = (id: CyclingDashboardMetricId) => {
        setSelectedCyclingMetrics((prev) => {
            const next = prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id];
            try {
                localStorage.setItem(STORAGE_KEY_CYCLING_METRICS, JSON.stringify(next));
                window.dispatchEvent(new Event(EVENT_DASHBOARD_LAYOUT_CHANGE));
            } catch {
                // ignore
            }
            return next;
        });
    };

    const handleToggleDashboardRunningMetric = (id: RunningDashboardMetricId) => {
        setSelectedRunningMetrics((prev) => {
            const next = prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id];
            try {
                localStorage.setItem(STORAGE_KEY_RUNNING_METRICS, JSON.stringify(next));
                window.dispatchEvent(new Event(EVENT_DASHBOARD_LAYOUT_CHANGE));
            } catch {
                // ignore
            }
            return next;
        });
    };

    if (section === 'api') return <ApiSection onBack={() => setSection('main')} />;
    if (section === 'privacy') return <PrivacySection healthTrackingEnabled={healthTrackingEnabled} onBack={() => setSection('main')} />;
    if (section === 'danger') return <DangerSection onBack={() => setSection('main')} />;

    return (
        <div className="p-5 space-y-5">
            <h3 className="text-lg font-bold text-foreground">App Settings</h3>

            {/* Home Dashboard Layout & Metrics Customizer */}
            <div className="space-y-3 p-3.5 rounded-md bg-surface border border-line">
                <div className="flex items-center justify-between">
                    <h4 className="text-xs text-positive font-semibold">Home Dashboard Status Layout &amp; Metrics</h4>
                    <span className="text-[10px] font-mono text-positive bg-positive/10 px-2 py-0.5 rounded border border-positive/30">
                        Live Preview
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {DASHBOARD_LAYOUT_MODE_OPTIONS.map((opt) => {
                        const active = dashboardLayoutMode === opt.id;
                        return (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => handleSelectDashboardLayoutMode(opt.id)}
                                aria-pressed={active}
                                className={`p-2.5 rounded-md border text-left transition-all ${
                                    active
                                        ? 'border-positive bg-positive/10 text-foreground'
                                        : 'border-line bg-background-secondary text-foreground-muted hover:text-foreground'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-1">
                                    <span className="text-xs font-semibold text-foreground">{opt.badge}</span>
                                    {active && <span className="text-[10px] font-mono text-positive">Active</span>}
                                </div>
                                <p className="text-[11px] font-medium text-foreground mt-0.5">{opt.title}</p>
                                <p className="text-[10px] text-foreground-muted mt-0.5 leading-snug">{opt.description}</p>
                            </button>
                        );
                    })}
                </div>

                <div className="p-2.5 rounded-md bg-background-secondary border border-line space-y-2">
                    <p className="text-[11px] font-semibold text-positive">Cycling Metrics to Show</p>
                    <div className="grid grid-cols-2 gap-1.5">
                        {CYCLING_METRIC_OPTIONS.map((opt) => {
                            const checked = selectedCyclingMetrics.includes(opt.id);
                            return (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => handleToggleDashboardCyclingMetric(opt.id)}
                                    aria-pressed={checked}
                                    className={`flex items-center justify-between px-2 py-1 rounded text-left text-[10px] border transition-colors ${
                                        checked
                                            ? 'bg-positive/10 border-positive/40 text-foreground font-medium'
                                            : 'bg-background-tertiary border-line text-foreground-muted hover:text-foreground'
                                    }`}
                                >
                                    <span className="truncate pr-1">{opt.shortLabel} ({opt.unit})</span>
                                    <span className={`text-[9px] font-mono ${checked ? 'text-positive' : 'text-foreground-muted'}`}>
                                        {checked ? 'ON' : 'OFF'}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <p className="text-[11px] font-semibold text-workout-recovery pt-1">Running Card Extra Metrics (Dual Sport Cards Mode)</p>
                    <div className="grid grid-cols-2 gap-1.5">
                        {RUNNING_METRIC_OPTIONS.map((opt) => {
                            const checked = selectedRunningMetrics.includes(opt.id);
                            return (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => handleToggleDashboardRunningMetric(opt.id)}
                                    aria-pressed={checked}
                                    className={`flex items-center justify-between px-2 py-1 rounded text-left text-[10px] border transition-colors ${
                                        checked
                                            ? 'bg-workout-recovery/10 border-workout-recovery/40 text-foreground font-medium'
                                            : 'bg-background-tertiary border-line text-foreground-muted hover:text-foreground'
                                    }`}
                                >
                                    <span className="truncate pr-1">{opt.shortLabel} ({opt.unit})</span>
                                    <span className={`text-[9px] font-mono ${checked ? 'text-workout-recovery' : 'text-foreground-muted'}`}>
                                        {checked ? 'ON' : 'OFF'}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Live Interactive Preview */}
                <div className="p-2.5 rounded-md bg-background-tertiary/80 border border-positive/30 space-y-2">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-positive">
                        Live Preview — {DASHBOARD_LAYOUT_MODE_OPTIONS.find((m) => m.id === dashboardLayoutMode)?.title}
                    </span>
                    {dashboardLayoutMode === 'DUAL_BOXES' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="p-2.5 rounded bg-surface border border-line space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-semibold text-foreground">Running Status</span>
                                    <span className="text-[9px] font-mono text-workout-recovery">Running Card</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {RUNNING_METRIC_OPTIONS.filter((o) => selectedRunningMetrics.includes(o.id)).map((o) => (
                                        <span key={o.id} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-background-secondary border border-line/60 text-foreground-muted">
                                            {o.shortLabel}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="p-2.5 rounded bg-surface border border-line space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-semibold text-foreground">Cycling Status</span>
                                    <span className="text-[9px] font-mono text-positive">Cycling Card</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {CYCLING_METRIC_OPTIONS.filter((o) => selectedCyclingMetrics.includes(o.id)).map((o) => (
                                        <span key={o.id} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-background-secondary border border-line/60 text-positive">
                                            {o.shortLabel}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-2.5 rounded bg-surface border border-line space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-semibold text-foreground">
                                    {dashboardLayoutMode === 'CYCLING_HERO'
                                        ? 'Cycling Status — Cycling Cockpit'
                                        : dashboardLayoutMode === 'COMBINED_STRIP'
                                        ? 'Training Status — Hybrid Overview'
                                        : 'Training Status — Classic Running'}
                                </span>
                                <span className="text-[9px] font-mono text-positive">Single Card</span>
                            </div>
                            {dashboardLayoutMode !== 'CLASSIC_RUN' && (
                                <div className="flex flex-wrap gap-1">
                                    {CYCLING_METRIC_OPTIONS.filter((o) => selectedCyclingMetrics.includes(o.id)).map((o) => (
                                        <span key={o.id} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-background-secondary border border-line/60 text-positive">
                                            {o.shortLabel} ({o.unit})
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Dashboard, Calendar & Effort Preferences */}
            <div className="space-y-4 p-3.5 rounded-md bg-surface border border-line">
                <div>
                    <h4 className="text-xs text-positive font-semibold">Dashboard, Calendar &amp; Effort Preferences</h4>
                    <p className="text-[11px] text-foreground-muted mt-0.5">
                        Synchronized UI and effort display preferences across Web &amp; Mobile.
                    </p>
                </div>

                {/* Quick Presets */}
                <div className="space-y-1.5">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-foreground-muted">Quick Presets</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => handleApplyPreset('NEW_DEFAULT')}
                            className={`p-2.5 rounded-md border text-left transition-all ${
                                isNewDefaultActive
                                    ? 'border-positive bg-positive/10 text-foreground ring-1 ring-positive/40'
                                    : 'border-line bg-background-secondary text-foreground-muted hover:text-foreground'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-foreground">★ New Default UI</span>
                                {isNewDefaultActive && <span className="text-[10px] font-mono text-positive">Active</span>}
                            </div>
                            <p className="text-[10px] text-foreground-muted mt-1 leading-snug">
                                Option C compact rows, compact countdown bar, 4-wk calendar &amp; unified TSS.
                            </p>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleApplyPreset('CLASSIC')}
                            className={`p-2.5 rounded-md border text-left transition-all ${
                                isClassicActive
                                    ? 'border-positive bg-positive/10 text-foreground ring-1 ring-positive/40'
                                    : 'border-line bg-background-secondary text-foreground-muted hover:text-foreground'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-foreground">↺ Classic / Legacy UI</span>
                                {isClassicActive && <span className="text-[10px] font-mono text-positive">Active</span>}
                            </div>
                            <p className="text-[10px] text-foreground-muted mt-1 leading-snug">
                                Multi-line workout cards, 2-box countdown, 6-week month &amp; TRIMP metrics.
                            </p>
                        </button>
                    </div>
                </div>

                {/* 5 Individual Toggles */}
                <div className="space-y-3 pt-2 border-t border-line/60">
                    {/* 1. Workouts Card Style */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground flex items-center justify-between">
                            <span>1. Workouts Card Style</span>
                            <span className="text-[10px] font-mono text-foreground-muted">{workoutCardStyle}</span>
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                            <button
                                type="button"
                                onClick={() => handleUpdatePref({ workoutCardStyle: 'OPTION_C' })}
                                className={`px-2.5 py-1.5 rounded text-left text-[11px] border transition-colors ${
                                    workoutCardStyle === 'OPTION_C'
                                        ? 'bg-positive/10 border-positive text-foreground font-semibold'
                                        : 'bg-background-secondary border-line text-foreground-muted hover:text-foreground'
                                }`}
                            >
                                Option C (Compact Rows · Recommended)
                            </button>
                            <button
                                type="button"
                                onClick={() => handleUpdatePref({ workoutCardStyle: 'OPTION_A' })}
                                className={`px-2.5 py-1.5 rounded text-left text-[11px] border transition-colors ${
                                    workoutCardStyle === 'OPTION_A'
                                        ? 'bg-positive/10 border-positive text-foreground font-semibold'
                                        : 'bg-background-secondary border-line text-foreground-muted hover:text-foreground'
                                }`}
                            >
                                Classic (Full Cards)
                            </button>
                        </div>
                    </div>

                    {/* 2. Race Countdown Style */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground flex items-center justify-between">
                            <span>2. Race Countdown Style</span>
                            <span className="text-[10px] font-mono text-foreground-muted">{countdownStyle}</span>
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                            <button
                                type="button"
                                onClick={() => handleUpdatePref({ countdownStyle: 'COMPACT_BAR' })}
                                className={`px-2.5 py-1.5 rounded text-left text-[11px] border transition-colors ${
                                    countdownStyle === 'COMPACT_BAR'
                                        ? 'bg-positive/10 border-positive text-foreground font-semibold'
                                        : 'bg-background-secondary border-line text-foreground-muted hover:text-foreground'
                                }`}
                            >
                                Compact Countdown Bar
                            </button>
                            <button
                                type="button"
                                onClick={() => handleUpdatePref({ countdownStyle: 'TWO_BOX_LEGACY' })}
                                className={`px-2.5 py-1.5 rounded text-left text-[11px] border transition-colors ${
                                    countdownStyle === 'TWO_BOX_LEGACY'
                                        ? 'bg-positive/10 border-positive text-foreground font-semibold'
                                        : 'bg-background-secondary border-line text-foreground-muted hover:text-foreground'
                                }`}
                            >
                                Classic 2-Box Grid
                            </button>
                        </div>
                    </div>

                    {/* 3. Goal Card Effort Tracker */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground flex items-center justify-between">
                            <span>3. Goal Card Effort Tracker</span>
                            <span className="text-[10px] font-mono text-foreground-muted">{effortCardMode}</span>
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                            <button
                                type="button"
                                onClick={() => handleUpdatePref({ effortCardMode: 'WEEK_AND_MONTH' })}
                                className={`px-2 py-1.5 rounded text-center text-[10px] border transition-colors ${
                                    effortCardMode === 'WEEK_AND_MONTH'
                                        ? 'bg-positive/10 border-positive text-foreground font-semibold'
                                        : 'bg-background-secondary border-line text-foreground-muted hover:text-foreground'
                                }`}
                            >
                                Week &amp; 4-Wk Block
                            </button>
                            <button
                                type="button"
                                onClick={() => handleUpdatePref({ effortCardMode: 'WEEK_ONLY' })}
                                className={`px-2 py-1.5 rounded text-center text-[10px] border transition-colors ${
                                    effortCardMode === 'WEEK_ONLY'
                                        ? 'bg-positive/10 border-positive text-foreground font-semibold'
                                        : 'bg-background-secondary border-line text-foreground-muted hover:text-foreground'
                                }`}
                            >
                                Week Only
                            </button>
                            <button
                                type="button"
                                onClick={() => handleUpdatePref({ effortCardMode: 'LEGACY_KM' })}
                                className={`px-2 py-1.5 rounded text-center text-[10px] border transition-colors ${
                                    effortCardMode === 'LEGACY_KM'
                                        ? 'bg-positive/10 border-positive text-foreground font-semibold'
                                        : 'bg-background-secondary border-line text-foreground-muted hover:text-foreground'
                                }`}
                            >
                                Distance Km Only
                            </button>
                        </div>
                    </div>

                    {/* 4. Training Calendar Window */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground flex items-center justify-between">
                            <span>4. Training Calendar Window</span>
                            <span className="text-[10px] font-mono text-foreground-muted">{calendarWeeksMode}</span>
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                            <button
                                type="button"
                                onClick={() => handleUpdatePref({ calendarWeeksMode: '4_WEEKS' })}
                                className={`px-2.5 py-1.5 rounded text-left text-[11px] border transition-colors ${
                                    calendarWeeksMode === '4_WEEKS'
                                        ? 'bg-positive/10 border-positive text-foreground font-semibold'
                                        : 'bg-background-secondary border-line text-foreground-muted hover:text-foreground'
                                }`}
                            >
                                4-Week Training Window (28 Days)
                            </button>
                            <button
                                type="button"
                                onClick={() => handleUpdatePref({ calendarWeeksMode: '6_WEEKS_LEGACY' })}
                                className={`px-2.5 py-1.5 rounded text-left text-[11px] border transition-colors ${
                                    calendarWeeksMode === '6_WEEKS_LEGACY'
                                        ? 'bg-positive/10 border-positive text-foreground font-semibold'
                                        : 'bg-background-secondary border-line text-foreground-muted hover:text-foreground'
                                }`}
                            >
                                6-Week Legacy Month
                            </button>
                        </div>
                    </div>

                    {/* 5. Primary Effort Metric */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground flex items-center justify-between">
                            <span>5. Primary Effort Metric</span>
                            <span className="text-[10px] font-mono text-foreground-muted">{primaryLoadMetric}</span>
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                            <button
                                type="button"
                                onClick={() => handleUpdatePref({ primaryLoadMetric: 'TSS' })}
                                className={`px-2 py-1.5 rounded text-center text-[10px] border transition-colors ${
                                    primaryLoadMetric === 'TSS'
                                        ? 'bg-positive/10 border-positive text-foreground font-semibold'
                                        : 'bg-background-secondary border-line text-foreground-muted hover:text-foreground'
                                }`}
                            >
                                Unified TSS
                            </button>
                            <button
                                type="button"
                                onClick={() => handleUpdatePref({ primaryLoadMetric: 'DUAL' })}
                                className={`px-2 py-1.5 rounded text-center text-[10px] border transition-colors ${
                                    primaryLoadMetric === 'DUAL'
                                        ? 'bg-positive/10 border-positive text-foreground font-semibold'
                                        : 'bg-background-secondary border-line text-foreground-muted hover:text-foreground'
                                }`}
                            >
                                Dual TSS + TRIMP
                            </button>
                            <button
                                type="button"
                                onClick={() => handleUpdatePref({ primaryLoadMetric: 'TRIMP' })}
                                className={`px-2 py-1.5 rounded text-center text-[10px] border transition-colors ${
                                    primaryLoadMetric === 'TRIMP'
                                        ? 'bg-positive/10 border-positive text-foreground font-semibold'
                                        : 'bg-background-secondary border-line text-foreground-muted hover:text-foreground'
                                }`}
                            >
                                Classic TRIMP
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-1.5">
                <button
                    onClick={() => setSection('api')}
                    className="w-full flex items-center gap-3 px-3.5 py-3 bg-surface rounded-md transition-colors hover:bg-surface-hover"
                >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-accent-blue/15">
                        <Key className="w-4 h-4 text-accent-blue" />
                    </div>
                    <div className="flex-1 text-left">
                        <div className="text-sm font-medium text-foreground">API Access</div>
                        <div className="text-[11px] text-foreground-muted">Generate & manage read-only API key</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-foreground-muted" />
                </button>
                <button
                    onClick={() => setSection('privacy')}
                    className="w-full flex items-center gap-3 px-3.5 py-3 bg-surface rounded-md transition-colors hover:bg-surface-hover"
                >
                    <div className="w-8 h-8 rounded-md flex items-center justify-center bg-accent-blue/15">
                        <ShieldCheck className="w-4 h-4 text-accent-blue" />
                    </div>
                    <div className="flex-1 text-left">
                        <div className="text-sm font-medium text-foreground">Privacy & Consent</div>
                        <div className="text-[11px] text-foreground-muted">Terms, privacy policy, data consent</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-foreground-muted" />
                </button>
                <ExportDataButton />
            </div>

            <div className="border-t border-line pt-4">
                <DangerShortcut />
            </div>
        </div>
    );
}
