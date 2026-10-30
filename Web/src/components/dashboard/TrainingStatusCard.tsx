import { TrendingUp, Activity, Gauge, Bike, Zap } from 'lucide-react';
import { useUserMetrics } from '../providers/UserMetricsProvider';
import { interpretTsb } from '@/lib/metrics/fitness';
import { useState, useEffect } from 'react';

export type DashboardStatusLayoutMode =
    | 'DUAL_BOXES'      // Dual Sport Cards: Running Card + Cycling Card
    | 'COMBINED_STRIP'  // Hybrid Overview: Combined Card + Cycling Strip
    | 'CYCLING_HERO'    // Cycling Cockpit: Power & FTP Focus Card
    | 'CLASSIC_RUN';    // Classic Running: Running Metrics Only Card

export type CyclingDashboardMetricId =
    | 'cyclingVo2max'
    | 'activeFtp'
    | 'wPerKg'
    | 'weeklyBikeTss'
    | 'weeklyBikeKm'
    | 'ctlBike'
    | 'tsbBike'
    | 'avgEf';

export type RunningDashboardMetricId =
    | 'vdot'
    | 'weeklyRunKm'
    | 'avg3MoRunKm'
    | 'easyTrimp';

export interface DashboardMetricOption<T extends string> {
    id: T;
    label: string;
    shortLabel: string;
    unit: string;
    colorClass: string;
}

export const DASHBOARD_LAYOUT_MODE_OPTIONS: {
    id: DashboardStatusLayoutMode;
    title: string;
    badge: string;
    description: string;
}[] = [
    {
        id: 'DUAL_BOXES',
        title: 'Dual Sport Cards (Running + Cycling)',
        badge: 'Dual Cards',
        description: 'Two full-size status cards side-by-side: one dedicated to Running and one dedicated to Cycling.',
    },
    {
        id: 'COMBINED_STRIP',
        title: 'Hybrid Overview (Combined + Cycling Strip)',
        badge: 'Hybrid',
        description: 'Unified Training Status card with Running Shape & VO2max on top plus a customizable Cycling Metrics grid.',
    },
    {
        id: 'CYCLING_HERO',
        title: 'Cycling Cockpit (Power & FTP Focus)',
        badge: 'Cycling',
        description: 'Cycling-first card featuring Active FTP (W/kg), Cycling VO2max, and Bike CTL/ATL/TSB load bars.',
    },
    {
        id: 'CLASSIC_RUN',
        title: 'Classic Running (Run Metrics Only)',
        badge: 'Running',
        description: 'Focused single Training Status card with Running Shape, VO2max, and Running CTL/ATL/TSB.',
    },
];

export const CYCLING_METRIC_OPTIONS: DashboardMetricOption<CyclingDashboardMetricId>[] = [
    { id: 'cyclingVo2max', label: 'Cycling VO2max (ACSM MAP)', shortLabel: 'Bike VO2max', unit: 'mL/kg', colorClass: 'text-accent-purple' },
    { id: 'activeFtp', label: 'Active / Estimated FTP', shortLabel: 'Active FTP', unit: 'W', colorClass: 'text-accent-orange' },
    { id: 'wPerKg', label: 'Power-to-Weight Ratio', shortLabel: 'Power / Weight', unit: 'W/kg', colorClass: 'text-accent-cyan' },
    { id: 'weeklyBikeTss', label: 'Weekly Cycling Load (TSS)', shortLabel: 'Weekly Bike TSS', unit: 'TSS', colorClass: 'text-workout-tempo' },
    { id: 'weeklyBikeKm', label: 'Weekly Cycling Distance', shortLabel: 'Weekly Bike Km', unit: 'km', colorClass: 'text-positive' },
    { id: 'ctlBike', label: 'Cycling Chronic Load (Bike CTL)', shortLabel: 'Bike Fitness (CTL)', unit: 'CTL', colorClass: 'text-accent-blue' },
    { id: 'tsbBike', label: 'Cycling Stress Balance (Bike TSB)', shortLabel: 'Bike Form (TSB)', unit: 'TSB', colorClass: 'text-positive' },
    { id: 'avgEf', label: 'Aerobic Efficiency Factor (NP/HR)', shortLabel: 'Aerobic EF', unit: 'W/bpm', colorClass: 'text-accent-cyan' },
];

export const RUNNING_METRIC_OPTIONS: DashboardMetricOption<RunningDashboardMetricId>[] = [
    { id: 'vdot', label: 'Jack Daniels Performance VDOT', shortLabel: 'Run VDOT', unit: 'VDOT', colorClass: 'text-accent-cyan' },
    { id: 'weeklyRunKm', label: 'Current Week Running Distance', shortLabel: 'Weekly Run Km', unit: 'km', colorClass: 'text-positive' },
    { id: 'avg3MoRunKm', label: '3-Month Avg Weekly Run Distance', shortLabel: '3-Mo Avg Km', unit: 'km/wk', colorClass: 'text-workout-long-run' },
    { id: 'easyTrimp', label: 'Weekly Easy Aerobic TRIMP', shortLabel: 'Easy TRIMP', unit: 'TRIMP', colorClass: 'text-accent-blue' },
];

export const DEFAULT_CYCLING_METRICS: CyclingDashboardMetricId[] = [
    'cyclingVo2max',
    'activeFtp',
    'wPerKg',
    'weeklyBikeTss',
];

export const DEFAULT_RUNNING_METRICS: RunningDashboardMetricId[] = [
    'vdot',
    'weeklyRunKm',
];

export const STORAGE_KEY_LAYOUT_MODE = 'runflow_dashboard_layout_mode_v1';
export const STORAGE_KEY_CYCLING_METRICS = 'runflow_dashboard_cycling_metrics_v1';
export const STORAGE_KEY_RUNNING_METRICS = 'runflow_dashboard_running_metrics_v1';
export const STORAGE_KEY_WORKOUT_CARD_STYLE = 'runflow_workout_card_style_v1';
export const STORAGE_KEY_COUNTDOWN_STYLE = 'runflow_countdown_style_v1';
export const STORAGE_KEY_EFFORT_CARD_MODE = 'runflow_effort_card_mode_v1';
export const STORAGE_KEY_CALENDAR_WEEKS = 'runflow_calendar_weeks_v1';
export const STORAGE_KEY_LOAD_METRIC = 'runflow_load_metric_v1';
export const EVENT_DASHBOARD_LAYOUT_CHANGE = 'runflow:dashboard-layout-change';

export type WorkoutCardStyleMode = 'OPTION_A' | 'OPTION_B' | 'OPTION_C';
export type CountdownStyleMode = 'COMPACT_BAR' | 'TWO_BOX_LEGACY';
export type EffortCardMode = 'WEEK_AND_MONTH' | 'WEEK_ONLY' | 'LEGACY_KM';
export type CalendarWeeksMode = '4_WEEKS' | '6_WEEKS_LEGACY';
export type PrimaryLoadMetricMode = 'TSS' | 'DUAL' | 'TRIMP';

export interface UiPreferences {
    workoutCardStyle?: WorkoutCardStyleMode;
    countdownStyle?: CountdownStyleMode;
    effortCardMode?: EffortCardMode;
    calendarWeeksMode?: CalendarWeeksMode;
    primaryLoadMetric?: PrimaryLoadMetricMode;
    [key: string]: any;
}

export function readWorkoutCardStyle(): 'OPTION_A' | 'OPTION_B' | 'OPTION_C' {
    if (typeof window === 'undefined') return 'OPTION_C';
    try {
        const raw = localStorage.getItem(STORAGE_KEY_WORKOUT_CARD_STYLE);
        if (raw === 'OPTION_A' || raw === 'OPTION_B' || raw === 'OPTION_C') return raw;
        if (raw === 'CLASSIC') return 'OPTION_A';
        if (raw === 'COMPACT_C') return 'OPTION_C';
    } catch {
        // ignore
    }
    return 'OPTION_C';
}

export function readCountdownStyle(): 'COMPACT_BAR' | 'TWO_BOX_LEGACY' {
    if (typeof window === 'undefined') return 'COMPACT_BAR';
    try {
        const raw = localStorage.getItem(STORAGE_KEY_COUNTDOWN_STYLE);
        if (raw === 'COMPACT_BAR' || raw === 'TWO_BOX_LEGACY') return raw;
        if (raw === 'HEADER_PILL' || raw === 'COMPACT') return 'COMPACT_BAR';
        if (raw === 'CLASSIC_2BOX') return 'TWO_BOX_LEGACY';
    } catch {
        // ignore
    }
    return 'COMPACT_BAR';
}

export function readEffortCardMode(): 'WEEK_AND_MONTH' | 'WEEK_ONLY' | 'LEGACY_KM' {
    if (typeof window === 'undefined') return 'WEEK_AND_MONTH';
    try {
        const raw = localStorage.getItem(STORAGE_KEY_EFFORT_CARD_MODE);
        if (raw === 'WEEK_AND_MONTH' || raw === 'WEEK_ONLY' || raw === 'LEGACY_KM') return raw;
    } catch {
        // ignore
    }
    return 'WEEK_AND_MONTH';
}

export function readCalendarWeeksMode(): '4_WEEKS' | '6_WEEKS_LEGACY' {
    if (typeof window === 'undefined') return '4_WEEKS';
    try {
        const raw = localStorage.getItem(STORAGE_KEY_CALENDAR_WEEKS);
        if (raw === '4_WEEKS' || raw === '6_WEEKS_LEGACY') return raw;
        if (raw === 'FULL_MONTH') return '6_WEEKS_LEGACY';
    } catch {
        // ignore
    }
    return '4_WEEKS';
}

export function readPrimaryLoadMetric(): 'TSS' | 'DUAL' | 'TRIMP' {
    if (typeof window === 'undefined') return 'TSS';
    try {
        const raw = localStorage.getItem(STORAGE_KEY_LOAD_METRIC);
        if (raw === 'TSS' || raw === 'DUAL' || raw === 'TRIMP') return raw;
    } catch {
        // ignore
    }
    return 'TSS';
}

export function hydrateUiPreferencesFromServer(serverPrefs: any): void {
    if (typeof window === 'undefined' || !serverPrefs || typeof serverPrefs !== 'object') return;
    try {
        let changed = false;
        if (serverPrefs.workoutCardStyle) {
            const mapped = serverPrefs.workoutCardStyle === 'CLASSIC' ? 'OPTION_A' : serverPrefs.workoutCardStyle === 'COMPACT_C' ? 'OPTION_C' : serverPrefs.workoutCardStyle;
            if (['OPTION_A', 'OPTION_B', 'OPTION_C'].includes(mapped)) {
                localStorage.setItem(STORAGE_KEY_WORKOUT_CARD_STYLE, mapped);
                changed = true;
            }
        }
        if (serverPrefs.countdownStyle) {
            const mapped = serverPrefs.countdownStyle === 'CLASSIC_2BOX' ? 'TWO_BOX_LEGACY' : serverPrefs.countdownStyle === 'HEADER_PILL' ? 'COMPACT_BAR' : serverPrefs.countdownStyle;
            if (['COMPACT_BAR', 'TWO_BOX_LEGACY'].includes(mapped)) {
                localStorage.setItem(STORAGE_KEY_COUNTDOWN_STYLE, mapped);
                changed = true;
            }
        }
        if (serverPrefs.effortCardMode && ['WEEK_AND_MONTH', 'WEEK_ONLY', 'LEGACY_KM'].includes(serverPrefs.effortCardMode)) {
            localStorage.setItem(STORAGE_KEY_EFFORT_CARD_MODE, serverPrefs.effortCardMode);
            changed = true;
        }
        if (serverPrefs.calendarWeeksMode) {
            const mapped = serverPrefs.calendarWeeksMode === 'FULL_MONTH' ? '6_WEEKS_LEGACY' : serverPrefs.calendarWeeksMode;
            if (['4_WEEKS', '6_WEEKS_LEGACY'].includes(mapped)) {
                localStorage.setItem(STORAGE_KEY_CALENDAR_WEEKS, mapped);
                changed = true;
            }
        }
        if (serverPrefs.primaryLoadMetric && ['TSS', 'DUAL', 'TRIMP'].includes(serverPrefs.primaryLoadMetric)) {
            localStorage.setItem(STORAGE_KEY_LOAD_METRIC, serverPrefs.primaryLoadMetric);
            changed = true;
        }
        if (changed) {
            window.dispatchEvent(new Event(EVENT_DASHBOARD_LAYOUT_CHANGE));
            window.dispatchEvent(new Event('runflow-dashboard-layout-change'));
        }
    } catch {
        // ignore
    }
}

export async function syncUiPreferencesToServer(newPrefs: Partial<UiPreferences>): Promise<void> {
    if (typeof window !== 'undefined') {
        try {
            if (newPrefs.workoutCardStyle) localStorage.setItem(STORAGE_KEY_WORKOUT_CARD_STYLE, newPrefs.workoutCardStyle);
            if (newPrefs.countdownStyle) localStorage.setItem(STORAGE_KEY_COUNTDOWN_STYLE, newPrefs.countdownStyle);
            if (newPrefs.effortCardMode) localStorage.setItem(STORAGE_KEY_EFFORT_CARD_MODE, newPrefs.effortCardMode);
            if (newPrefs.calendarWeeksMode) localStorage.setItem(STORAGE_KEY_CALENDAR_WEEKS, newPrefs.calendarWeeksMode);
            if (newPrefs.primaryLoadMetric) localStorage.setItem(STORAGE_KEY_LOAD_METRIC, newPrefs.primaryLoadMetric);
            window.dispatchEvent(new Event(EVENT_DASHBOARD_LAYOUT_CHANGE));
            window.dispatchEvent(new Event('runflow-dashboard-layout-change'));
        } catch {
            // ignore
        }
    }

    try {
        const payload: Record<string, any> = { uiPreferences: newPrefs };
        if (newPrefs.primaryLoadMetric) {
            payload.primaryLoadMetric = newPrefs.primaryLoadMetric;
        }
        await fetch('/api/settings/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    } catch {
        // non-blocking sync
    }
}

const VALID_CYCLING_METRIC_SET = new Set<string>(CYCLING_METRIC_OPTIONS.map((o) => o.id));
const VALID_RUNNING_METRIC_SET = new Set<string>(RUNNING_METRIC_OPTIONS.map((o) => o.id));

export function readDashboardLayoutMode(): DashboardStatusLayoutMode {
    if (typeof window === 'undefined') return 'COMBINED_STRIP';
    try {
        const raw = localStorage.getItem(STORAGE_KEY_LAYOUT_MODE);
        if (raw === 'DUAL_BOXES' || raw === 'COMBINED_STRIP' || raw === 'CYCLING_HERO' || raw === 'CLASSIC_RUN') {
            return raw;
        }
    } catch {
        // ignore
    }
    return 'COMBINED_STRIP';
}

export function readDashboardCyclingMetrics(): CyclingDashboardMetricId[] {
    if (typeof window === 'undefined') return DEFAULT_CYCLING_METRICS;
    try {
        const raw = localStorage.getItem(STORAGE_KEY_CYCLING_METRICS);
        if (!raw) return DEFAULT_CYCLING_METRICS;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return DEFAULT_CYCLING_METRICS;
        const filtered = Array.from(
            new Set(parsed.filter((item): item is CyclingDashboardMetricId => typeof item === 'string' && VALID_CYCLING_METRIC_SET.has(item)))
        );
        return filtered;
    } catch {
        return DEFAULT_CYCLING_METRICS;
    }
}

export function readDashboardRunningMetrics(): RunningDashboardMetricId[] {
    if (typeof window === 'undefined') return DEFAULT_RUNNING_METRICS;
    try {
        const raw = localStorage.getItem(STORAGE_KEY_RUNNING_METRICS);
        if (!raw) return DEFAULT_RUNNING_METRICS;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return DEFAULT_RUNNING_METRICS;
        const filtered = Array.from(
            new Set(parsed.filter((item): item is RunningDashboardMetricId => typeof item === 'string' && VALID_RUNNING_METRIC_SET.has(item)))
        );
        return filtered;
    } catch {
        return DEFAULT_RUNNING_METRICS;
    }
}

interface TrainingStatusCardProps {
    stats?: any;
}

export default function TrainingStatusCard({ stats }: TrainingStatusCardProps = {}) {
    const userMetrics = useUserMetrics();
    const {
        marathonShape,
        vdot,
        aerobicVo2max,
        cyclingVo2max,
        activeFtpWatts,
        wPerKg,
        weeklyBikeTss,
        weeklyBikeKm,
        ctlBike,
        atlBike,
        tsbBike,
        avgEfficiencyFactor,
        currentWeekMileage,
        avgWeeklyKmLast3Months,
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
    } = userMetrics;

    const [showAbsoluteAtl, setShowAbsoluteAtl] = useState(false);
    const [showAbsoluteCtl, setShowAbsoluteCtl] = useState(false);
    const [layoutMode, setLayoutMode] = useState<DashboardStatusLayoutMode>('COMBINED_STRIP');
    const [selectedCyclingMetrics, setSelectedCyclingMetrics] = useState<CyclingDashboardMetricId[]>(DEFAULT_CYCLING_METRICS);
    const [selectedRunningMetrics, setSelectedRunningMetrics] = useState<RunningDashboardMetricId[]>(DEFAULT_RUNNING_METRICS);

    useEffect(() => {
        const loadPrefs = () => {
            setLayoutMode(readDashboardLayoutMode());
            setSelectedCyclingMetrics(readDashboardCyclingMetrics());
            setSelectedRunningMetrics(readDashboardRunningMetrics());
        };
        loadPrefs();
        window.addEventListener(EVENT_DASHBOARD_LAYOUT_CHANGE, loadPrefs);
        window.addEventListener('runflow-dashboard-layout-change', loadPrefs);
        window.addEventListener('storage', loadPrefs);
        return () => {
            window.removeEventListener(EVENT_DASHBOARD_LAYOUT_CHANGE, loadPrefs);
            window.removeEventListener('runflow-dashboard-layout-change', loadPrefs);
            window.removeEventListener('storage', loadPrefs);
        };
    }, []);

    const formatCyclingMetricValue = (id: CyclingDashboardMetricId): string => {
        switch (id) {
            case 'cyclingVo2max':
                return cyclingVo2max > 0 ? cyclingVo2max.toFixed(1) : '-';
            case 'activeFtp':
                return activeFtpWatts > 0 ? `${activeFtpWatts}` : '-';
            case 'wPerKg':
                return wPerKg > 0 ? wPerKg.toFixed(2) : '-';
            case 'weeklyBikeTss':
                return weeklyBikeTss > 0 ? `${weeklyBikeTss}` : '0';
            case 'weeklyBikeKm':
                return weeklyBikeKm > 0 ? `${weeklyBikeKm}` : '0';
            case 'ctlBike':
                return ctlBike > 0 ? `${ctlBike}` : '0';
            case 'tsbBike':
                return tsbBike > 0 ? `+${tsbBike}` : `${tsbBike}`;
            case 'avgEf':
                return avgEfficiencyFactor > 0 ? avgEfficiencyFactor.toFixed(2) : '-';
        }
    };

    const formatRunningMetricValue = (id: RunningDashboardMetricId): string => {
        switch (id) {
            case 'vdot':
                return vdot > 0 ? vdot.toFixed(1) : '-';
            case 'weeklyRunKm':
                return currentWeekMileage > 0 ? `${Math.round(currentWeekMileage * 10) / 10}` : '0';
            case 'avg3MoRunKm':
                return avgWeeklyKmLast3Months > 0 ? `${Math.round(avgWeeklyKmLast3Months * 10) / 10}` : '0';
            case 'easyTrimp':
                return `${easyTrimp}`;
        }
    };

    const shapePercent = marathonShape?.shape || 0;

    const workloadStatus = (ratio: number) => {
        if (ratio <= 0) return { label: 'No Data', color: 'text-foreground-muted', bg: 'bg-foreground-muted' };
        if (ratio < 0.8) return { label: 'Recovery', color: 'text-accent-cyan', bg: 'bg-accent-cyan' };
        if (ratio <= 1.3) return { label: 'Optimal', color: 'text-positive', bg: 'bg-positive' };
        if (ratio <= 1.5) return { label: 'Caution', color: 'text-workout-tempo', bg: 'bg-workout-tempo' };
        return { label: 'Overload', color: 'text-negative', bg: 'bg-negative' };
    };

    const hasData = ctl > 0 || atl > 0 || aerobicVo2max > 0 || cyclingVo2max > 0 || activeFtpWatts > 0 || ctlBike > 0;

    if (!hasData) {
        return (
            <div className="glass-card p-6 h-full flex flex-col items-center justify-center min-h-[400px] text-center">
                <div className="w-16 h-16 bg-background-tertiary rounded-full flex items-center justify-center mb-4">
                    <Activity className="w-8 h-8 text-foreground-muted" />
                </div>
                <h3 className="text-lg font-semibold text-foreground-muted mb-2">No Training Data</h3>
                <p className="text-sm text-foreground-muted max-w-[200px]">
                    Sync your activities to see your training status and fitness metrics.
                </p>
            </div>
        );
    }

    const tsbStatus = interpretTsb(tsb);
    const bikeTsbStatus = interpretTsb(tsbBike);
    const bikeWorkloadRatio = ctlBike > 0 ? Number((atlBike / ctlBike).toFixed(2)) : 0;
    const activeCyclingOptions = CYCLING_METRIC_OPTIONS.filter((opt) => selectedCyclingMetrics.includes(opt.id));
    const activeRunningOptions = RUNNING_METRIC_OPTIONS.filter((opt) => selectedRunningMetrics.includes(opt.id));

    const renderWorkloadDiagram = (ratio: number, title = 'Workload Balance') => {
        const st = workloadStatus(ratio);
        const pos = Math.min(100, (ratio / 2) * 100);
        return (
            <div className="bg-background-tertiary rounded-md p-4 mb-6 border border-line relative overflow-hidden shrink-0">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Gauge className={`w-3.5 h-3.5 ${st.color}`} />
                        <span className="text-xs text-foreground-muted font-semibold">{title}</span>
                    </div>
                    <span className={`text-xs font-semibold ${st.color} px-2 py-0.5 rounded-full bg-background-secondary border border-line`}>
                        {st.label}
                    </span>
                </div>

                <div className="relative h-2 w-full bg-background-secondary rounded-full mb-3">
                    <div className="absolute left-0 w-[40%] h-full bg-background-secondary rounded-l-full border-r border-line" />
                    <div className="absolute left-[40%] w-[25%] h-full bg-positive/20" />
                    <div className="absolute left-[65%] w-[10%] h-full bg-workout-tempo/20" />
                    <div className="absolute left-[75%] w-[25%] h-full bg-negative/20 rounded-r-full border-l border-line" />
                    <div className="absolute left-[40%] -top-1 w-[25%] h-4 border-x border-line pointer-events-none" />
                    <div
                        className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-background-secondary rounded-full border-2 ${st.bg} z-20 transition-all duration-1000`}
                        style={{ left: `calc(${pos}% - 8px)` }}
                    />
                </div>

                <div className="flex justify-between text-xs text-foreground-muted font-semibold px-1">
                    <span>Low</span>
                    <span className="text-positive/70 font-semibold absolute left-[35%] -translate-x-1/2">Sweet Spot (0.8 - 1.3)</span>
                    <span className="font-mono tabular-nums">{ratio > 2 ? ratio.toFixed(2) : '2.0+'}</span>
                </div>
            </div>
        );
    };

    const renderRunningProgressBars = () => (
        <div className="space-y-5 flex-1 flex flex-col justify-center border-t border-line pt-6">
            {/* Fatigue (ATL) */}
            <div
                className="flex items-center gap-3 cursor-pointer group"
                title={`${Math.round(atlPercent)}% (Abs: ${atl} / Max: ${maxAtl})`}
                onClick={() => setShowAbsoluteAtl(!showAbsoluteAtl)}
            >
                <div className="w-32 text-xs text-foreground-muted font-semibold truncate">Fatigue (ATL)</div>
                <div className="flex-1 h-1.5 bg-background-tertiary rounded-full overflow-hidden">
                    <div className="h-full bg-negative transition-all duration-500" style={{ width: `${Math.min(100, atlPercent)}%` }} />
                </div>
                <div className="w-14 text-right text-sm font-mono tabular-nums font-semibold text-negative">
                    {atl > 0 ? (showAbsoluteAtl ? atl : `${Math.round(atlPercent)}%`) : '-'}
                </div>
            </div>

            {/* Fitness (CTL) */}
            <div
                className="flex items-center gap-3 cursor-pointer group"
                title={`${Math.round(ctlPercent)}% (Abs: ${ctl} / Max: ${maxCtl})`}
                onClick={() => setShowAbsoluteCtl(!showAbsoluteCtl)}
            >
                <div className="w-32 text-xs text-foreground-muted font-semibold truncate">Fitness (CTL)</div>
                <div className="flex-1 h-1.5 bg-background-tertiary rounded-full overflow-hidden">
                    <div className="h-full bg-accent-blue transition-all duration-500" style={{ width: `${Math.min(100, ctlPercent)}%` }} />
                </div>
                <div className="w-14 text-right text-sm font-mono tabular-nums font-semibold text-accent-blue">
                    {ctl > 0 ? (showAbsoluteCtl ? ctl : `${Math.round(ctlPercent)}%`) : '-'}
                </div>
            </div>

            {/* Stress Balance (TSB) */}
            <div className="flex items-center gap-3">
                <div className="w-32 text-xs text-foreground-muted font-semibold truncate">Stress Balance</div>
                <div className="flex-1 h-1.5 bg-background-tertiary rounded-full overflow-hidden relative">
                    <div className="absolute left-1/2 w-[1px] h-full bg-line" />
                    <div
                        className={`h-full ${tsb >= 0 ? 'bg-positive' : 'bg-workout-tempo'} absolute transition-all duration-500`}
                        style={{
                            width: `${Math.min(50, Math.abs(tsb))}%`,
                            left: tsb >= 0 ? '50%' : `${50 - Math.min(50, Math.abs(tsb))}%`
                        }}
                    />
                </div>
                <div className={`w-14 text-right text-sm font-mono tabular-nums font-semibold ${tsbStatus.color}`}>
                    {tsb >= 0 ? `+${tsb}` : tsb}
                </div>
            </div>

            {/* Weekly TRIMP */}
            <div className="flex items-center gap-3">
                <div className="w-32 text-xs text-foreground-muted font-semibold truncate">Weekly TRIMP</div>
                <div className="flex-1 h-1.5 bg-background-tertiary rounded-full overflow-hidden">
                    <div className="h-full bg-workout-long-run transition-all duration-500" style={{ width: `${Math.min(100, easyTrimp / 5)}%` }} />
                </div>
                <div className="w-14 text-right text-sm font-mono tabular-nums font-semibold text-workout-long-run underline decoration-workout-long-run/30 underline-offset-2">
                    {easyTrimp > 0 ? easyTrimp : '-'}
                </div>
            </div>
        </div>
    );

    const renderCyclingProgressBars = () => {
        const plannedBikeTss = (stats as any)?.weeklyPlannedBikeTss || 300;
        return (
            <div className="space-y-5 flex-1 flex flex-col justify-center border-t border-line pt-6">
                {/* Bike Fatigue (ATL) */}
                <div className="flex items-center gap-3">
                    <div className="w-32 text-xs text-foreground-muted font-semibold truncate">Bike Fatigue (ATL)</div>
                    <div className="flex-1 h-1.5 bg-background-tertiary rounded-full overflow-hidden">
                        <div className="h-full bg-negative transition-all duration-500" style={{ width: `${Math.min(100, atlBike)}%` }} />
                    </div>
                    <div className="w-14 text-right text-sm font-mono tabular-nums font-semibold text-negative">
                        {atlBike > 0 ? atlBike : '0'}
                    </div>
                </div>

                {/* Bike Fitness (CTL) */}
                <div className="flex items-center gap-3">
                    <div className="w-32 text-xs text-foreground-muted font-semibold truncate">Bike Fitness (CTL)</div>
                    <div className="flex-1 h-1.5 bg-background-tertiary rounded-full overflow-hidden">
                        <div className="h-full bg-accent-blue transition-all duration-500" style={{ width: `${Math.min(100, ctlBike)}%` }} />
                    </div>
                    <div className="w-14 text-right text-sm font-mono tabular-nums font-semibold text-accent-blue">
                        {ctlBike > 0 ? ctlBike : '0'}
                    </div>
                </div>

                {/* Bike Stress Balance (TSB) */}
                <div className="flex items-center gap-3">
                    <div className="w-32 text-xs text-foreground-muted font-semibold truncate">Bike Stress Bal.</div>
                    <div className="flex-1 h-1.5 bg-background-tertiary rounded-full overflow-hidden relative">
                        <div className="absolute left-1/2 w-[1px] h-full bg-line" />
                        <div
                            className={`h-full ${tsbBike >= 0 ? 'bg-positive' : 'bg-workout-tempo'} absolute transition-all duration-500`}
                            style={{
                                width: `${Math.min(50, Math.abs(tsbBike))}%`,
                                left: tsbBike >= 0 ? '50%' : `${50 - Math.min(50, Math.abs(tsbBike))}%`
                            }}
                        />
                    </div>
                    <div className={`w-14 text-right text-sm font-mono tabular-nums font-semibold ${bikeTsbStatus.color}`}>
                        {tsbBike >= 0 ? `+${tsbBike}` : tsbBike}
                    </div>
                </div>

                {/* Weekly Bike TSS */}
                <div className="flex items-center gap-3">
                    <div className="w-32 text-xs text-foreground-muted font-semibold truncate">Weekly Bike TSS</div>
                    <div className="flex-1 h-1.5 bg-background-tertiary rounded-full overflow-hidden">
                        <div className="h-full bg-accent-purple transition-all duration-500" style={{ width: `${Math.min(100, (weeklyBikeTss / plannedBikeTss) * 100)}%` }} />
                    </div>
                    <div className="w-14 text-right text-sm font-mono tabular-nums font-semibold text-accent-purple underline decoration-accent-purple/30 underline-offset-2">
                        {weeklyBikeTss > 0 ? weeklyBikeTss : '0'}
                    </div>
                </div>
            </div>
        );
    };

    // ─── MODE 1: DUAL_BOXES (Dual Sport Cards — Running Status + Cycling Status) ───
    if (layoutMode === 'DUAL_BOXES') {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                {/* BOX 1: RUNNING TRAINING STATUS */}
                <div className="glass-card p-6 h-full flex flex-col justify-between min-h-[400px]">
                    <h2 className="text-lg font-semibold text-foreground-muted mb-5 shrink-0">Running Status</h2>

                    <div className="grid grid-cols-2 gap-4 mb-5 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-md bg-workout-recovery/15 flex items-center justify-center shrink-0">
                                <TrendingUp className="w-5 h-5 text-workout-recovery" />
                            </div>
                            <div>
                                <p className="text-xs text-foreground-muted font-semibold leading-tight">Shape</p>
                                <p className="text-2xl font-mono tabular-nums font-semibold text-foreground leading-tight">{shapePercent}%</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-md bg-accent-cyan/15 flex items-center justify-center shrink-0">
                                <Activity className="w-5 h-5 text-accent-cyan" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-foreground-muted font-semibold leading-tight">Running VO2max</p>
                                <div className="flex items-baseline justify-between gap-1">
                                    <p className="text-2xl font-mono tabular-nums font-semibold text-foreground leading-tight">
                                        {aerobicVo2max > 0 ? aerobicVo2max.toFixed(1) : '-'}
                                    </p>
                                    {correctionFactor !== 1.0 && (
                                        <span className="text-xs font-mono tabular-nums text-accent-cyan font-semibold bg-accent-cyan/10 px-1 py-0.5 rounded leading-none shrink-0 border border-accent-cyan/20">
                                            {correctionFactor.toFixed(1)}x
                                        </span>
                                    )}
                                </div>
                                {vdot > 0 && (
                                    <p className="text-[10px] font-mono text-foreground-muted mt-0.5">
                                        Run VDOT: {vdot.toFixed(1)}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {activeRunningOptions.length > 0 && (
                        <div className="mb-5 p-2.5 rounded-md bg-background-tertiary/70 border border-line grid grid-cols-2 gap-2 shrink-0">
                            {activeRunningOptions.map((opt) => (
                                <div key={opt.id} className="p-2 rounded bg-background-secondary border border-line/70">
                                    <span className="block text-[10px] text-foreground-muted truncate">{opt.shortLabel}</span>
                                    <div className="flex items-baseline gap-1 mt-0.5">
                                        <span className={`text-sm font-mono font-bold tabular-nums ${opt.colorClass}`}>
                                            {formatRunningMetricValue(opt.id)}
                                        </span>
                                        <span className="text-[9px] text-foreground-muted font-mono">{opt.unit}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {renderWorkloadDiagram(workloadRatio, 'Running Workload Balance')}
                    {renderRunningProgressBars()}
                </div>

                {/* BOX 2: CYCLING TRAINING STATUS */}
                <div className="glass-card p-6 h-full flex flex-col justify-between min-h-[400px]">
                    <h2 className="text-lg font-semibold text-foreground-muted mb-5 shrink-0">Cycling Status</h2>

                    <div className="grid grid-cols-2 gap-4 mb-5 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-md bg-accent-orange/15 flex items-center justify-center shrink-0">
                                <Zap className="w-5 h-5 text-accent-orange" />
                            </div>
                            <div>
                                <p className="text-xs text-foreground-muted font-semibold leading-tight">Active FTP</p>
                                <p className="text-2xl font-mono tabular-nums font-semibold text-foreground leading-tight">
                                    {activeFtpWatts > 0 ? `${activeFtpWatts}W` : '-'}
                                </p>
                                {wPerKg > 0 && (
                                    <p className="text-[10px] font-mono text-accent-cyan mt-0.5">{wPerKg.toFixed(2)} W/kg</p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-md bg-accent-purple/15 flex items-center justify-center shrink-0">
                                <Bike className="w-5 h-5 text-accent-purple" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-foreground-muted font-semibold leading-tight">Cycling VO2max</p>
                                <p className="text-2xl font-mono tabular-nums font-semibold text-foreground leading-tight">
                                    {cyclingVo2max > 0 ? cyclingVo2max.toFixed(1) : '-'}
                                </p>
                                <p className="text-[10px] font-mono text-foreground-muted mt-0.5">
                                    ACSM Power Formula
                                </p>
                            </div>
                        </div>
                    </div>

                    {activeCyclingOptions.length > 0 && (
                        <div className="mb-5 p-2.5 rounded-md bg-background-tertiary/70 border border-line grid grid-cols-2 gap-2 shrink-0">
                            {activeCyclingOptions.map((opt) => (
                                <div key={opt.id} className="p-2 rounded bg-background-secondary border border-line/70">
                                    <span className="block text-[10px] text-foreground-muted truncate">{opt.shortLabel}</span>
                                    <div className="flex items-baseline gap-1 mt-0.5">
                                        <span className={`text-sm font-mono font-bold tabular-nums ${opt.colorClass}`}>
                                            {formatCyclingMetricValue(opt.id)}
                                        </span>
                                        <span className="text-[9px] text-foreground-muted font-mono">{opt.unit}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {renderWorkloadDiagram(bikeWorkloadRatio, 'Cycling Workload Balance')}
                    {renderCyclingProgressBars()}
                </div>
            </div>
        );
    }

    // ─── MODES 2, 3, 4: SINGLE CARD (COMBINED_STRIP / CYCLING_HERO / CLASSIC_RUN) ───
    const isCyclist = layoutMode === 'CYCLING_HERO' || (currentWeekMileage === 0 && (weeklyBikeKm > 0 || weeklyBikeTss > 0 || activeFtpWatts > 0));
    const middleCyclingOptions = layoutMode === 'CYCLING_HERO'
        ? CYCLING_METRIC_OPTIONS.filter((opt) => ['avgEf', 'weeklyBikeKm', 'ctlBike', 'tsbBike'].includes(opt.id))
        : activeCyclingOptions;

    return (
        <div className="glass-card p-6 h-full flex flex-col justify-between min-h-[400px] relative">
            <h2 className="text-lg font-semibold text-foreground-muted mb-5 shrink-0">
                {layoutMode === 'CYCLING_HERO' ? 'Cycling Status' : 'Training Status'}
            </h2>

            {/* Top Metrics Grid */}
            <div className="grid grid-cols-2 gap-4 mb-5 shrink-0">
                {layoutMode === 'CYCLING_HERO' ? (
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md bg-accent-orange/15 flex items-center justify-center shrink-0">
                            <Zap className="w-5 h-5 text-accent-orange" />
                        </div>
                        <div>
                            <p className="text-xs text-foreground-muted font-semibold leading-tight">Active FTP</p>
                            <p className="text-2xl font-mono tabular-nums font-semibold text-foreground leading-tight">
                                {activeFtpWatts > 0 ? `${activeFtpWatts}W` : '-'}
                            </p>
                            {wPerKg > 0 && (
                                <p className="text-[10px] font-mono text-accent-cyan mt-0.5">{wPerKg.toFixed(2)} W/kg</p>
                            )}
                        </div>
                    </div>
                ) : isCyclist ? (
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md bg-accent-purple/15 flex items-center justify-center shrink-0">
                            <Bike className="w-5 h-5 text-accent-purple" />
                        </div>
                        <div>
                            <p className="text-xs text-foreground-muted font-semibold leading-tight">Weekly Cycling</p>
                            <p className="text-2xl font-mono tabular-nums font-semibold text-foreground leading-tight">
                                {weeklyBikeKm > 0 ? `${weeklyBikeKm} km` : weeklyBikeTss > 0 ? `${weeklyBikeTss} TSS` : activeFtpWatts > 0 ? `${activeFtpWatts}W` : '0 km'}
                            </p>
                            <p className="text-[10px] font-mono text-accent-cyan mt-0.5">
                                {weeklyBikeKm > 0 && weeklyBikeTss > 0
                                    ? `${weeklyBikeTss} TSS`
                                    : activeFtpWatts > 0
                                    ? `${activeFtpWatts}W Active FTP`
                                    : 'Cycling Load'}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md bg-workout-recovery/15 flex items-center justify-center shrink-0">
                            <TrendingUp className="w-5 h-5 text-workout-recovery" />
                        </div>
                        <div>
                            <p className="text-xs text-foreground-muted font-semibold leading-tight">Shape</p>
                            <p className="text-2xl font-mono tabular-nums font-semibold text-foreground leading-tight">{shapePercent}%</p>
                        </div>
                    </div>
                )}

                {/* Aerobic Fitness (VO2max) */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-accent-cyan/15 flex items-center justify-center shrink-0">
                        <Activity className="w-5 h-5 text-accent-cyan" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground-muted font-semibold leading-tight">
                            {layoutMode === 'CYCLING_HERO' ? 'Cycling VO2max' : 'Aerobic Fitness (VO2max)'}
                        </p>
                        <div className="flex items-baseline justify-between gap-1">
                            <p className="text-2xl font-mono tabular-nums font-semibold text-foreground leading-tight">
                                {layoutMode === 'CYCLING_HERO'
                                    ? (cyclingVo2max > 0 ? cyclingVo2max.toFixed(1) : '-')
                                    : (aerobicVo2max > 0 ? aerobicVo2max.toFixed(1) : cyclingVo2max > 0 ? cyclingVo2max.toFixed(1) : '-')}
                            </p>
                            {layoutMode !== 'CYCLING_HERO' && correctionFactor !== 1.0 && (
                                <span className="text-xs font-mono tabular-nums text-accent-cyan font-semibold bg-accent-cyan/10 px-1 py-0.5 rounded leading-none shrink-0 border border-accent-cyan/20">
                                    {correctionFactor.toFixed(1)}x
                                </span>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[10px] font-mono text-foreground-muted">
                            {vdot > 0 && layoutMode !== 'CYCLING_HERO' && <span>Run VDOT: {vdot.toFixed(1)}</span>}
                            {cyclingVo2max > 0 && layoutMode !== 'CLASSIC_RUN' && layoutMode !== 'CYCLING_HERO' && (
                                <span className="text-accent-orange font-semibold">
                                    {vdot > 0 ? '· ' : ''}Bike VO2: {cyclingVo2max.toFixed(1)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Customizable Cycling Metrics Strip (Configured in App Settings) */}
            {(layoutMode === 'COMBINED_STRIP' || layoutMode === 'CYCLING_HERO') && middleCyclingOptions.length > 0 && (
                <div className="mb-5 p-3 rounded-md bg-background-tertiary/70 border border-line space-y-2 shrink-0">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-accent-cyan flex items-center gap-1">
                            <Bike className="w-3 h-3" />
                            Cycling Metrics
                        </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-2">
                        {middleCyclingOptions.map((opt) => (
                            <div key={opt.id} className="p-2 rounded bg-background-secondary border border-line/70">
                                <span className="block text-[10px] text-foreground-muted truncate" title={opt.label}>
                                    {opt.shortLabel}
                                </span>
                                <div className="flex items-baseline gap-1 mt-0.5">
                                    <span className={`text-sm font-mono font-bold tabular-nums ${opt.colorClass}`}>
                                        {formatCyclingMetricValue(opt.id)}
                                    </span>
                                    <span className="text-[9px] text-foreground-muted font-mono">{opt.unit}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {layoutMode === 'CYCLING_HERO'
                ? renderWorkloadDiagram(bikeWorkloadRatio, 'Cycling Workload Balance')
                : renderWorkloadDiagram(workloadRatio, 'Workload Balance')}

            {layoutMode === 'CYCLING_HERO' ? renderCyclingProgressBars() : renderRunningProgressBars()}
        </div>
    );
}
