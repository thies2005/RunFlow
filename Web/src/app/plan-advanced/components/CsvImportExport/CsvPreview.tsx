'use client';

import { useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import type { CsvFormat } from './FormatSelector';

interface CsvPreviewProps {
    rows: Array<Record<string, string>>;
    format: CsvFormat;
    errors: Array<{ row: number; message: string }>;
    maxRows?: number;
}

const FORMAT_COLUMNS: Record<CsvFormat, string[]> = {
    trainingpeaks: ['Date', 'Title', 'Description', 'Type', 'Distance', 'Duration', 'Pace', 'HR Zone', 'Notes'],
    finalsurge: ['Date', 'Activity Type', 'Workout Name', 'Description', 'Distance', 'Duration', 'Pace', 'HR Zone', 'Notes'],
    runflow: ['date', 'workout_type', 'phase', 'name', 'description', 'distance_m', 'duration_s', 'pace_s_km', 'hr_zone'],
};

const COLUMN_DISPLAY: Record<string, (v: string) => string> = {
    distance_m: (v) => v ? `${(parseFloat(v) / 1000).toFixed(1)} km` : v,
    duration_s: (v) => v ? `${Math.round(parseFloat(v) / 60)} min` : v,
    pace_s_km: (v) => {
        if (!v) return v;
        const pace = parseFloat(v);
        const m = Math.floor(pace / 60);
        const s = Math.round(pace % 60);
        return `${m}:${String(s).padStart(2, '0')}/km`;
    },
};

export function CsvPreview({ rows, format, errors, maxRows = 10 }: CsvPreviewProps) {
    const columns = FORMAT_COLUMNS[format] || Object.keys(rows[0] || {});

    const errorRows = useMemo(() => {
        const set = new Set(errors.map((e) => e.row));
        return set;
    }, [errors]);

    const displayRows = rows.slice(0, maxRows);

    if (displayRows.length === 0) {
        return (
            <div className="text-center py-8 text-zinc-600 text-xs">
                No data to preview
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">
                    {rows.length} workout{rows.length !== 1 ? 's' : ''} found
                    {errors.length > 0 && (
                        <span className="text-red-400 ml-1">
                            ({errors.length} error{errors.length !== 1 ? 's' : ''})
                        </span>
                    )}
                </span>
                {rows.length > maxRows && (
                    <span className="text-[10px] text-zinc-600">
                        Showing first {maxRows} of {rows.length}
                    </span>
                )}
            </div>

            <div className="overflow-x-auto rounded-lg border border-zinc-800">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="bg-zinc-900">
                            <th className="px-2 py-1.5 text-left text-[10px] text-zinc-500 font-medium w-8">#</th>
                            {columns.map((col) => (
                                <th key={col} className="px-2 py-1.5 text-left text-[10px] text-zinc-500 font-medium whitespace-nowrap">
                                    {col}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {displayRows.map((row, i) => {
                            const isError = errorRows.has(i + 2);
                            return (
                                <tr
                                    key={i}
                                    className={`border-t border-zinc-800/50 ${
                                        isError ? 'bg-red-500/5' : i % 2 === 0 ? 'bg-zinc-950' : 'bg-zinc-900/50'
                                    }`}
                                >
                                    <td className="px-2 py-1.5 text-zinc-600">
                                        {isError ? (
                                            <AlertCircle className="w-3 h-3 text-red-400" />
                                        ) : (
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500/50 inline-block" />
                                        )}
                                    </td>
                                    {columns.map((col) => {
                                        const val = row[col] || '';
                                        const display = COLUMN_DISPLAY[col] ? COLUMN_DISPLAY[col](val) : val;
                                        return (
                                            <td key={col} className={`px-2 py-1.5 whitespace-nowrap max-w-[180px] truncate ${
                                                isError ? 'text-red-300' : 'text-zinc-300'
                                            }`}>
                                                {display || '-'}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {errors.length > 0 && (
                <div className="space-y-1">
                    {errors.slice(0, 5).map((err, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-[10px] text-red-400">
                            <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                            <span>Row {err.row}: {err.message}</span>
                        </div>
                    ))}
                    {errors.length > 5 && (
                        <span className="text-[10px] text-zinc-600">
                            +{errors.length - 5} more errors
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
