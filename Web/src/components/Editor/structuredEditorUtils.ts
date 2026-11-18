import type { StructuredStep } from '@/lib/plans/structured';

export const STEP_KINDS: Array<StructuredStep['kind']> = [
    'warmup',
    'work',
    'recovery',
    'cooldown',
    'steady',
    'transition',
];

export const COGGAN_ZONES = [
    { label: 'Z1', name: 'Recovery', minPct: 0, maxPct: 55, color: '#94a3b8' },
    { label: 'Z2', name: 'Endurance', minPct: 55, maxPct: 75, color: '#3b82f6' },
    { label: 'Z3', name: 'Tempo', minPct: 76, maxPct: 90, color: '#10b981' },
    { label: 'Z4', name: 'Threshold', minPct: 91, maxPct: 105, color: '#f59e0b' },
    { label: 'Z5', name: 'VO2Max', minPct: 106, maxPct: 120, color: '#f97316' },
    { label: 'Z6', name: 'Anaerobic', minPct: 121, maxPct: 150, color: '#ef4444' },
    { label: 'Z7', name: 'Neuromusc', minPct: 151, maxPct: 200, color: '#a855f7' },
];

export function formatSecondsToMmSs(totalSec: number): string {
    if (!totalSec || isNaN(totalSec) || totalSec <= 0) return '00:00';
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = Math.round(totalSec % 60);
    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function parseMmSsToSeconds(val: string): number {
    const trimmed = val.trim();
    if (!trimmed) return 0;
    if (!trimmed.includes(':')) {
        const num = parseFloat(trimmed);
        return isNaN(num) ? 0 : Math.max(0, Math.round(num));
    }
    const parts = trimmed.split(':').map((p) => parseFloat(p));
    if (parts.some((p) => isNaN(p))) return 0;
    if (parts.length === 2) {
        return Math.max(0, Math.round(parts[0] * 60 + parts[1]));
    }
    if (parts.length === 3) {
        return Math.max(0, Math.round(parts[0] * 3600 + parts[1] * 60 + parts[2]));
    }
    return 0;
}

export function getStepColor(step: StructuredStep): string {
    if (step.target?.type === 'power') {
        const pct = step.target.ftpPercent || (step.target.minWatts && step.target.maxWatts ? (step.target.minWatts + step.target.maxWatts) / 4 : 70);
        if (pct < 56) return '#94a3b8';
        if (pct < 76) return '#3b82f6';
        if (pct < 91) return '#10b981';
        if (pct < 106) return '#f59e0b';
        if (pct < 121) return '#f97316';
        if (pct < 151) return '#ef4444';
        return '#a855f7';
    }
    switch (step.kind) {
        case 'warmup':
            return '#0284c7';
        case 'cooldown':
            return '#64748b';
        case 'recovery':
            return '#10b981';
        case 'steady':
            return '#0ea5e9';
        case 'transition':
            return '#8b5cf6';
        case 'work':
        default:
            return '#f97316';
    }
}
