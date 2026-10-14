'use client';

import { useState, useMemo } from 'react';
import {
    ResponsiveContainer,
    ComposedChart,
    Area,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    ReferenceLine,
} from 'recharts';
import { Zap, Loader2 } from 'lucide-react';

export interface PowerDurationCurveChartProps {
    durationsSec?: number[];
    peakWatts?: number[];
    peakWkg?: (number | null)[];
    allTimePeakWatts?: number[];
    ftpWatts?: number | null;
    wPerKg?: number | null;
    weightKg?: number | null;
    isLoading?: boolean;
}

const DEFAULT_DURATIONS = [5, 15, 30, 60, 120, 300, 600, 1200, 1800, 3600];

function formatDurationLabel(sec: number): string {
    if (sec < 60) return `${sec}s`;
    const mins = Math.floor(sec / 60);
    return `${mins}m`;
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{
        name: string;
        value: number;
        color: string;
        payload: {
            durationLabel: string;
            durationSec: number;
            rangePower: number;
            allTimePower: number;
            ftp: number | null;
            unit: string;
        };
    }>;
}

function CustomPowerTooltip({ active, payload }: CustomTooltipProps) {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0]?.payload;
    if (!data) return null;

    const { durationLabel, rangePower, allTimePower, ftp, unit } = data;
    const pctFtp = ftp && rangePower > 0 ? Math.round((rangePower / ftp) * 100) : null;

    return (
        <div className="bg-background-secondary border border-line rounded-lg p-3 shadow-xl backdrop-blur-md text-xs space-y-1.5 min-w-[170px]">
            <div className="font-semibold text-foreground border-b border-line pb-1 flex justify-between">
                <span>Duration: {durationLabel}</span>
                {pctFtp !== null && (
                    <span className="text-accent-orange font-mono font-medium">{pctFtp}% FTP</span>
                )}
            </div>
            <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-foreground-muted">
                    <span className="w-2.5 h-2.5 rounded-full bg-accent-orange inline-block" />
                    Selected Period:
                </span>
                <span className="font-mono font-bold text-foreground">
                    {rangePower > 0 ? `${rangePower} ${unit}` : '-'}
                </span>
            </div>
            <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-foreground-muted">
                    <span className="w-2.5 h-2.5 rounded-full bg-accent-purple inline-block" />
                    All-Time Best:
                </span>
                <span className="font-mono font-medium text-foreground-muted">
                    {allTimePower > 0 ? `${allTimePower} ${unit}` : '-'}
                </span>
            </div>
            {ftp !== null && (
                <div className="flex items-center justify-between gap-3 pt-1 border-t border-line text-[11px] text-foreground-muted">
                    <span>Active FTP:</span>
                    <span className="font-mono text-accent-cyan">{ftp} {unit}</span>
                </div>
            )}
        </div>
    );
}

export default function PowerDurationCurveChart({
    durationsSec = DEFAULT_DURATIONS,
    peakWatts = [],
    peakWkg = [],
    allTimePeakWatts = [],
    ftpWatts = null,
    wPerKg = null,
    weightKg = null,
    isLoading = false,
}: PowerDurationCurveChartProps) {
    const [unitMode, setUnitMode] = useState<'watts' | 'wkg'>('watts');

    const canUseWkg = Boolean(weightKg && weightKg > 0);

    const chartData = useMemo(() => {
        const isWkg = unitMode === 'wkg' && canUseWkg;
        const currentFtp = isWkg ? (wPerKg ?? (ftpWatts && weightKg ? Number((ftpWatts / weightKg).toFixed(2)) : null)) : ftpWatts;

        return durationsSec.map((sec, idx) => {
            const watts = peakWatts[idx] ?? 0;
            const allTimeW = allTimePeakWatts[idx] ?? 0;

            const rangePower = isWkg
                ? (peakWkg[idx] ?? (weightKg ? Number((watts / weightKg).toFixed(2)) : 0))
                : watts;

            const allTimePower = isWkg
                ? (weightKg ? Number((allTimeW / weightKg).toFixed(2)) : 0)
                : allTimeW;

            return {
                durationSec: sec,
                durationLabel: formatDurationLabel(sec),
                rangePower: Math.max(0, rangePower || 0),
                allTimePower: Math.max(0, allTimePower || 0),
                ftp: currentFtp,
                unit: isWkg ? 'W/kg' : 'W',
            };
        });
    }, [durationsSec, peakWatts, peakWkg, allTimePeakWatts, unitMode, canUseWkg, ftpWatts, wPerKg, weightKg]);

    const activeFtp = unitMode === 'wkg' && canUseWkg ? wPerKg : ftpWatts;
    const hasData = chartData.some(d => d.rangePower > 0 || d.allTimePower > 0);

    if (isLoading) {
        return (
            <div className="glass-card p-6 h-80 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-accent-orange mb-2" />
                <div className="text-foreground-muted text-sm">Loading power curve...</div>
            </div>
        );
    }

    return (
        <div className="glass-card p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-accent-orange" />
                        <h3 className="text-lg font-semibold text-foreground">
                            Power Duration Curve (MMP)
                        </h3>
                    </div>
                    <p className="text-xs text-foreground-muted mt-1">
                        Mean Maximal Power across standard durations vs. all-time record
                    </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                    {/* Unit Switcher */}
                    <div className="inline-flex rounded-lg bg-background-tertiary p-1 border border-line text-xs">
                        <button
                            type="button"
                            onClick={() => setUnitMode('watts')}
                            className={`px-3 py-1 font-medium rounded-md transition-all ${
                                unitMode === 'watts'
                                    ? 'bg-accent-orange text-white shadow-xs'
                                    : 'text-foreground-muted hover:text-foreground'
                            }`}
                        >
                            Watts
                        </button>
                        <button
                            type="button"
                            onClick={() => canUseWkg && setUnitMode('wkg')}
                            disabled={!canUseWkg}
                            title={!canUseWkg ? 'Set weight in settings to enable W/kg' : 'Switch to Watts per kilogram'}
                            className={`px-3 py-1 font-medium rounded-md transition-all ${
                                unitMode === 'wkg'
                                    ? 'bg-accent-orange text-white shadow-xs'
                                    : canUseWkg
                                    ? 'text-foreground-muted hover:text-foreground'
                                    : 'opacity-40 cursor-not-allowed text-foreground-muted'
                            }`}
                        >
                            W/kg
                        </button>
                    </div>
                </div>
            </div>

            {!hasData ? (
                <div className="h-64 flex flex-col items-center justify-center text-center">
                    <Zap className="w-12 h-12 text-foreground-muted mb-2 opacity-40" />
                    <p className="text-foreground-muted text-sm">No power curve data available for this range</p>
                    <p className="text-xs text-foreground-muted mt-1">
                        Record rides with a power meter or smart trainer to populate the curve
                    </p>
                </div>
            ) : (
                <div
                    className="h-72 w-full"
                    role="img"
                    aria-label="Power duration curve chart showing peak power across standard durations"
                >
                    <span className="sr-only">
                        Power duration curve showing Mean Maximal Power across intervals from 5s to 60m.
                    </span>
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="powerRangeGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.35} />
                                    <stop offset="95%" stopColor="#f97316" stopOpacity={0.0} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="durationLabel"
                                stroke="var(--foreground-muted)"
                                tick={{ fill: 'var(--foreground-muted)', fontSize: 12 }}
                                axisLine={{ stroke: 'var(--line)' }}
                                tickLine={false}
                            />
                            <YAxis
                                stroke="var(--foreground-muted)"
                                tick={{ fill: 'var(--foreground-muted)', fontSize: 12 }}
                                axisLine={{ stroke: 'var(--line)' }}
                                tickLine={false}
                                domain={['dataMin - 10', 'auto']}
                            />
                            <Tooltip content={<CustomPowerTooltip />} />
                            <Legend
                                verticalAlign="top"
                                align="right"
                                iconType="circle"
                                wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }}
                            />
                            {activeFtp && activeFtp > 0 && (
                                <ReferenceLine
                                    y={activeFtp}
                                    stroke="#06b6d4"
                                    strokeDasharray="4 4"
                                    strokeWidth={1.5}
                                    label={{
                                        value: `FTP ${activeFtp} ${unitMode === 'wkg' ? 'W/kg' : 'W'}`,
                                        fill: '#06b6d4',
                                        fontSize: 11,
                                        position: 'insideTopRight',
                                    }}
                                />
                            )}
                            <Area
                                type="monotone"
                                dataKey="rangePower"
                                name="Selected Range"
                                stroke="#f97316"
                                strokeWidth={2.5}
                                fillOpacity={1}
                                fill="url(#powerRangeGrad)"
                                dot={{ fill: '#f97316', r: 3.5, strokeWidth: 0 }}
                                activeDot={{ r: 5, fill: '#f97316', stroke: '#fff', strokeWidth: 2 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="allTimePower"
                                name="All-Time Record"
                                stroke="#a855f7"
                                strokeWidth={2}
                                strokeDasharray="3 3"
                                dot={{ fill: '#a855f7', r: 2.5 }}
                                activeDot={{ r: 4, fill: '#a855f7' }}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}
