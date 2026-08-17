'use client';

import { FileSpreadsheet, Activity, Cpu } from 'lucide-react';

type CsvFormat = 'trainingpeaks' | 'finalsurge' | 'runflow';

interface FormatSelectorProps {
    value: string;
    onChange: (format: CsvFormat) => void;
    autoDetected?: string;
}

const FORMATS: Array<{
    value: CsvFormat;
    label: string;
    icon: typeof FileSpreadsheet;
    columns: string[];
}> = [
    {
        value: 'trainingpeaks',
        label: 'TrainingPeaks',
        icon: FileSpreadsheet,
        columns: ['Date', 'Title', 'Type', 'Distance', 'Duration', 'Pace'],
    },
    {
        value: 'finalsurge',
        label: 'FinalSurge',
        icon: Activity,
        columns: ['Date', 'Activity Type', 'Workout Name', 'Distance', 'Duration'],
    },
    {
        value: 'runflow',
        label: 'RunFlow Custom',
        icon: Cpu,
        columns: ['date', 'workout_type', 'phase', 'distance_m', 'duration_s', 'pace_s_km'],
    },
];

export { type CsvFormat };

export function FormatSelector({ value, onChange, autoDetected }: FormatSelectorProps) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground-secondary">CSV Format</label>
                {autoDetected && (
                    <span className="text-[10px] text-green-400 flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        Auto-detected
                    </span>
                )}
            </div>
            <div className="grid grid-cols-3 gap-2">
                {FORMATS.map(({ value: fmt, label, icon: Icon, columns }) => (
                    <button
                        key={fmt}
                        type="button"
                        onClick={() => onChange(fmt)}
                        className={`p-3 rounded-lg border text-left transition-colors ${
                            value === fmt
                                ? 'border-foreground/30 bg-background-tertiary'
                                : 'border-glass-border bg-background-secondary hover:border-foreground/20'
                        }`}
                    >
                        <Icon className={`w-4 h-4 mb-1.5 ${value === fmt ? 'text-orange-400' : 'text-foreground-muted'}`} />
                        <span className="text-xs font-medium text-foreground block">{label}</span>
                        <div className="mt-1.5 space-y-0.5">
                            {columns.slice(0, 3).map((c) => (
                                <p key={c} className="text-[9px] text-foreground-muted truncate">{c}</p>
                            ))}
                            {columns.length > 3 && (
                                <p className="text-[9px] text-foreground-muted">+{columns.length - 3} more</p>
                            )}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
