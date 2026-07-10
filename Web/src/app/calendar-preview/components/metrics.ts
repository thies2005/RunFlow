/**
 * Training-load metrics for the calendar preview.
 *
 * Implements:
 *  - TRIMP colour scale (Runalyze-style red intensity ramp)
 *  - Period aggregations (per-day, per-week, per-month)
 *  - Rolling CTL / ATL / TSB (classic exponentially-weighted moving averages)
 *
 * These mirror the semantics used in the Runalyze fitness chart (CTL=green,
 * ATL=orange, TSB=green>0 / red<0) but computed locally from TRIMP/TSS.
 */

import { dayKey } from './mockData';

const DAY = 24 * 60 * 60 * 1000;

export interface DayEntry {
    date: string;
    activities: import('./mockData').MockActivity[];
    workouts: import('./mockData').MockWorkout[];
    trimp: number;
    tss: number;
    plannedTss: number;
    distance: number;
    duration: number;
    vdots: number[];
}

export interface WeekEntry {
    weekStart: Date;
    weekEnd: Date;
    label: string;
    days: DayEntry[];
    trimp: number;
    tss: number;
    plannedTss: number;
    distance: number;
    avgVdot: number | null;
    ctl: number;
    atl: number;
    tsb: number;
}

export interface MonthEntry {
    monthStart: Date;
    label: string;
    days: DayEntry[];
    trimp: number;
    tss: number;
    plannedTss: number;
    distance: number;
    avgVdot: number | null;
}

/* ------------------------------------------------------------------ TRIMP colour */

/**
 * Runalyze uses a red intensity ramp for daily/period TRIMP load:
 *   0        -> very faint
 *   low load -> #c86060 (light red)
 *   mid load -> #c83232
 *   high load-> #c80000 (dark red)
 *
 * For a *day* cell background we return a fill + text colour tier so the grid
 * visually communicates training stress at a glance (darker = harder day).
 */
export function trimpFill(trimp: number): { bg: string; text: string; tier: string } {
    if (trimp <= 0) return { bg: 'bg-zinc-900/40', text: 'text-zinc-600', tier: 'rest' };
    if (trimp < 20) return { bg: 'bg-emerald-500/15', text: 'text-emerald-400', tier: 'very easy' };
    if (trimp < 40) return { bg: 'bg-emerald-500/20', text: 'text-emerald-400', tier: 'easy' };
    if (trimp < 70) return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', tier: 'moderate' };
    if (trimp < 100) return { bg: 'bg-orange-500/25', text: 'text-orange-400', tier: 'hard' };
    if (trimp < 140) return { bg: 'bg-red-500/30', text: 'text-red-400', tier: 'very hard' };
    return { bg: 'bg-red-600/40', text: 'text-red-300', tier: 'overload' };
}

/** Compact label for a TRIMP value in a tooltip / detail. */
export function trimpLabel(trimp: number): string {
    return trimpFill(trimp).tier;
}

/* --------------------------------------------------------------- period builders */

/**
 * Build a flat map of yyyy-MM-dd -> aggregated day entry.
 */
export function buildDays(
    activities: import('./mockData').MockActivity[],
    workouts: import('./mockData').MockWorkout[],
    from: Date,
    to: Date,
): Map<string, DayEntry> {
    const byDay = new Map<string, DayEntry>();

    const ensure = (d: Date): DayEntry => {
        const k = dayKey(d);
        let e = byDay.get(k);
        if (!e) {
            e = {
                date: k,
                activities: [],
                workouts: [],
                trimp: 0,
                tss: 0,
                plannedTss: 0,
                distance: 0,
                duration: 0,
                vdots: [],
            };
            byDay.set(k, e);
        }
        return e;
    };

    for (let t = from.getTime(); t <= to.getTime(); t += DAY) {
        ensure(new Date(t));
    }

    for (const a of activities) {
        const d = new Date(a.startDate);
        if (d < from || d > to) continue;
        const e = ensure(d);
        e.activities.push(a);
        e.trimp += a.trimp ?? 0;
        e.tss += a.tss ?? 0;
        e.distance += a.distance;
        e.duration += a.duration;
        if (a.vdot != null) e.vdots.push(a.vdot);
    }

    for (const w of workouts) {
        const d = new Date(w.scheduledDate);
        if (d < from || d > to) continue;
        const e = ensure(d);
        e.workouts.push(w);
        e.plannedTss += w.plannedTss ?? 0;
    }

    return byDay;
}

/** Weeks (Mon-Sun) between `from` and `to`, in order. */
export function buildWeeks(
    days: Map<string, DayEntry>,
    from: Date,
    to: Date,
): WeekEntry[] {
    // align to Monday
    const start = new Date(from);
    start.setHours(0, 0, 0, 0);
    const dow = (start.getDay() + 6) % 7; // Mon=0
    start.setDate(start.getDate() - dow);

    const weeks: WeekEntry[] = [];
    let cursor = new Date(start);
    while (cursor <= to) {
        const ws = new Date(cursor);
        const we = new Date(cursor.getTime() + 6 * DAY);
        const dayEntries: DayEntry[] = [];
        for (let i = 0; i < 7; i++) {
            const k = dayKey(new Date(ws.getTime() + i * DAY));
            const e = days.get(k);
            if (e) dayEntries.push(e);
        }
        const trimp = dayEntries.reduce((s, d) => s + d.trimp, 0);
        const tss = dayEntries.reduce((s, d) => s + d.tss, 0);
        const plannedTss = dayEntries.reduce((s, d) => s + d.plannedTss, 0);
        const distance = dayEntries.reduce((s, d) => s + d.distance, 0);
        const allVdots = dayEntries.flatMap((d) => d.vdots);
        const avgVdot = allVdots.length ? allVdots.reduce((a, b) => a + b, 0) / allVdots.length : null;

        const fmt = (d: Date) =>
            d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

        weeks.push({
            weekStart: ws,
            weekEnd: we,
            label: `${fmt(ws)} – ${fmt(we)}`,
            days: dayEntries,
            trimp,
            tss,
            plannedTss,
            distance,
            avgVdot,
            ctl: 0, // filled below
            atl: 0,
            tsb: 0,
        });
        cursor = new Date(cursor.getTime() + 7 * DAY);
    }
    return weeks;
}

/* --------------------------------------------------------- CTL / ATL / TSB (EWMA) */

/**
 * Populate CTL/ATL/TSB on a list of weeks using the classic
 * exponentially-weighted moving averages:
 *   CTL  (fitness,  ~42-day)  =>  alpha = 2/(42+1)
 *   ATL  (fatigue,  ~7-day)   =>  alpha = 2/(7+1)
 *   TSB  = CTL - ATL  (form)
 *
 * TSS is used as the daily load signal (falls back to TRIMP when TSS missing).
 * We seed the EWMA from ATHLETE_PROFILE.initialCtl/Atl so history is realistic.
 */
export function fillFitness(
    weeks: WeekEntry[],
    seed: { initialCtl: number; initialAtl: number },
): WeekEntry[] {
    const ctlAlpha = 2 / (42 + 1);
    const atlAlpha = 2 / (7 + 1);

    let ctl = seed.initialCtl;
    let atl = seed.initialAtl;

    for (const w of weeks) {
        const load = w.tss || w.trimp; // weekly average per day would be smoother, but
        // use the daily average so a single hard week doesn't explode ATL
        const dailyLoad = load / 7;
        ctl = ctlAlpha * dailyLoad + (1 - ctlAlpha) * ctl;
        atl = atlAlpha * dailyLoad + (1 - atlAlpha) * atl;
        w.ctl = ctl;
        w.atl = atl;
        w.tsb = ctl - atl;
    }
    return weeks;
}

/* --------------------------------------------------------------- month grouping */

export function buildMonth(
    days: Map<string, DayEntry>,
    year: number,
    month: number, // 0-based
): MonthEntry {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    const dayEntries: DayEntry[] = [];
    for (let t = monthStart.getTime(); t <= monthEnd.getTime(); t += DAY) {
        const e = days.get(dayKey(new Date(t)));
        if (e) dayEntries.push(e);
    }
    const trimp = dayEntries.reduce((s, d) => s + d.trimp, 0);
    const tss = dayEntries.reduce((s, d) => s + d.tss, 0);
    const plannedTss = dayEntries.reduce((s, d) => s + d.plannedTss, 0);
    const distance = dayEntries.reduce((s, d) => s + d.distance, 0);
    const allVdots = dayEntries.flatMap((d) => d.vdots);
    const avgVdot = allVdots.length ? allVdots.reduce((a, b) => a + b, 0) / allVdots.length : null;

    return {
        monthStart,
        label: monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        days: dayEntries,
        trimp,
        tss,
        plannedTss,
        distance,
        avgVdot,
    };
}

/* --------------------------------------------------------------- formatting */

export function fmtKm(m: number): string {
    return `${(m / 1000).toFixed(m >= 10000 ? 0 : 1)}k`;
}

export function fmtDuration(sec: number): string {
    if (sec <= 0) return '0m';
    const h = Math.floor(sec / 3600);
    const m = Math.round((sec % 3600) / 60);
    if (h > 0) return `${h}h${m.toString().padStart(2, '0')}m`;
    return `${m}m`;
}

export function fmtPace(secPerKm: number): string {
    const m = Math.floor(secPerKm / 60);
    const s = Math.round(secPerKm % 60);
    return `${m}:${s.toString().padStart(2, '0')}/km`;
}
