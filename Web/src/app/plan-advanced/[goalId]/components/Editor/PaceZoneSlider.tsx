'use client';

/**
 * Pace picker as a slider that snaps to the five Daniels zones (E/M/T/I/R),
 * with the zone segments painted in the analytics-page zone colors
 * (E → zone-1 green … R → zone-5 red). Works on zone letters so both the
 * workout editor (pace values) and the interval builder (letters) share it.
 */

const ZONES = [
    { letter: 'E', label: 'Easy', color: 'var(--zone-1)' },
    { letter: 'M', label: 'Marathon', color: 'var(--zone-2)' },
    { letter: 'T', label: 'Threshold', color: 'var(--zone-3)' },
    { letter: 'I', label: 'Interval', color: 'var(--zone-4)' },
    { letter: 'R', label: 'Repetition', color: 'var(--zone-5)' },
] as const;

interface PaceZoneSliderProps {
    /** Currently selected zone letter ('' when no pace is set). */
    value: string;
    onChange: (zone: string) => void;
    /** Optional per-zone pace strings (E..R order), e.g. ['5:42','5:01',…]. */
    paceLabels?: string[];
}

export function PaceZoneSlider({ value, onChange, paceLabels }: PaceZoneSliderProps) {
    const index = Math.max(0, ZONES.findIndex((z) => z.letter === value));
    const zone = ZONES[index];

    return (
        <div className="w-full">
            <div className="flex items-baseline justify-between mb-0.5">
                <span className="text-[10px] text-foreground-muted">Pace</span>
                <span className="text-xs font-semibold" style={{ color: zone.color }}>
                    {zone.letter} — {zone.label}
                    {paceLabels?.[index] ? ` (${paceLabels[index]}/km)` : ''}
                </span>
            </div>
            <input
                type="range"
                min={0}
                max={ZONES.length - 1}
                step={1}
                value={index}
                onChange={(e) => onChange(ZONES[Number(e.target.value)].letter)}
                className="w-full h-1.5 cursor-pointer"
                style={{ accentColor: zone.color }}
            />
            {/* zone bar: outer segments half-width so each snap point sits in its own segment */}
            <div className="flex mt-0.5">
                {ZONES.map((z, i) => (
                    <button
                        key={z.letter}
                        type="button"
                        onClick={() => onChange(z.letter)}
                        title={`${z.label}${paceLabels?.[i] ? ` ${paceLabels[i]}/km` : ''}`}
                        className="mx-0.5 h-4 rounded flex items-center justify-center text-[10px] font-semibold transition-opacity"
                        style={{
                            flexGrow: i === 0 || i === ZONES.length - 1 ? 1 : 2,
                            backgroundColor: z.color,
                            opacity: i === index ? 1 : 0.35,
                            color: '#ffffff',
                        }}
                    >
                        {z.letter}
                    </button>
                ))}
            </div>
        </div>
    );
}

/** Seconds-per-km → "m:ss" for the slider labels. */
export function formatPaceShort(secPerKm: number): string {
    const m = Math.floor(secPerKm / 60);
    const s = Math.round(secPerKm % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
}
