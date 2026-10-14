'use client';

import { useState, useMemo, memo } from 'react';
import {
    ResponsiveContainer,
    ComposedChart,
    Area,
    Line,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    ReferenceLine,
} from 'recharts';
import { format } from 'date-fns';
import { BarChart2, Layers } from 'lucide-react';

export type PmcViewMode = 'combined' | 'running' | 'cycling' | 'split';
export type PmcRange = '42d' | '90d' | '1y' | 'all';

export interface SplitPmcDataPoint {
    date: string;
    ctlCombined?: number;
    atlCombined?: number;
    tsbCombined?: number;
    ctlRunning?: number;
    atlRunning?: number;
    tsbRunning?: number;
    ctlBike?: number;
    atlBike?: number;
    tsbBike?: number;
    runTss?: number;
    bikeTss?: number;
    trimp?: number;
    ctl?: number;
    atl?: number;
    tsb?: number;
}

export interface SplitPmcChartProps {
    data?: SplitPmcDataPoint[];
    initialView?: PmcViewMode;
    initialRange?: PmcRange;
    onRangeChange?: (range: PmcRange) => void;
    currentRange?: PmcRange;
    isLoading?: boolean;
    title?: string;
    hideRangeSelector?: boolean;
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{
        name: string;
        value: number;
        color: string;
        dataKey: string;
    }>;
    label?: string;
    viewMode: PmcViewMode;
}

function CustomPmcTooltip({ active, payload, label, viewMode }: CustomTooltipProps) {
    if (!active || !payload || !payload.length) return null;

    let dateFormatted = label || '';
    try {
        if (label) {
            dateFormatted = format(new Date(label), 'EEEE, MMM d, yyyy');
        }
    } catch {
        // Fallback to label
    }

    // Determine TSB value for status tag
    const tsbItem = payload.find(p => p.name.includes('TSB') || p.name.includes('Form'));
    const tsbVal = tsbItem ? tsbItem.value : null;

    let tsbStatus = 'Neutral';
    let tsbClass = 'text-foreground-muted';
    if (tsbVal !== null) {
        if (tsbVal >= 25) {
            tsbStatus = 'Peaked';
            tsbClass = 'text-positive';
        } else if (tsbVal >= 10) {
            tsbStatus = 'Fresh';
            tsbClass = 'text-accent-cyan';
        } else if (tsbVal <= -25) {
            tsbStatus = 'High Fatigue';
            tsbClass = 'text-accent-pink';
        } else if (tsbVal <= -10) {
            tsbStatus = 'Tired';
            tsbClass = 'text-accent-orange';
        }
    }

    return (
        <div className="bg-background-secondary border border-line rounded-lg p-3 shadow-xl backdrop-blur-md text-xs space-y-1.5 min-w-[200px]">
            <div className="font-semibold text-foreground border-b border-line pb-1 flex justify-between items-center">
                <span>{dateFormatted}</span>
                {tsbVal !== null && viewMode !== 'split' && (
                    <span className={`text-[11px] font-medium ${tsbClass}`}>
                        {tsbStatus} ({tsbVal.toFixed(1)})
                    </span>
                )}
            </div>

            <div className="space-y-1 pt-0.5">
                {payload.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-4">
                        <span className="flex items-center gap-1.5 text-foreground-muted">
                            <span
                                className="w-2.5 h-2.5 rounded-full inline-block"
                                style={{ backgroundColor: item.color }}
                            />
                            {item.name}:
                        </span>
                        <span className="font-mono font-semibold text-foreground">
                            {typeof item.value === 'number' ? item.value.toFixed(1) : item.value}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function SplitPmcChartComponent({
    data = [],
    initialView = 'combined',
    initialRange = '90d',
    onRangeChange,
    currentRange,
    isLoading = false,
    title = 'Performance Management Chart (PMC)',
    hideRangeSelector = false,
}: SplitPmcChartProps) {
    const [viewMode, setViewMode] = useState<PmcViewMode>(initialView);
    const [localRange, setLocalRange] = useState<PmcRange>(initialRange);

    const activeRange = currentRange || localRange;

    const handleRangeClick = (range: PmcRange) => {
        setLocalRange(range);
        if (onRangeChange) {
            onRangeChange(range);
        }
    };

    // Filter by time range if data wasn't already sliced by API
    const filteredData = useMemo(() => {
        if (!data || data.length === 0) return [];
        if (activeRange === 'all') return data;

        const now = new Date();
        const cutoff = new Date();
        switch (activeRange) {
            case '42d':
                cutoff.setDate(now.getDate() - 42);
                break;
            case '90d':
                cutoff.setDate(now.getDate() - 90);
                break;
            case '1y':
                cutoff.setFullYear(now.getFullYear() - 1);
                break;
        }

        return data.filter(d => {
            if (!d.date) return true;
            return new Date(d.date) >= cutoff;
        });
    }, [data, activeRange]);

    // Format chart points
    const chartData = useMemo(() => {
        return filteredData.map(d => {
            let label = d.date;
            try {
                label = format(new Date(d.date), 'MMM d');
            } catch {
                // Ignore parse errors
            }

            const ctlComb = d.ctlCombined ?? d.ctl ?? 0;
            const atlComb = d.atlCombined ?? d.atl ?? 0;
            const tsbComb = d.tsbCombined ?? d.tsb ?? (ctlComb - atlComb);

            const ctlRun = d.ctlRunning ?? 0;
            const atlRun = d.atlRunning ?? 0;
            const tsbRun = d.tsbRunning ?? (ctlRun - atlRun);

            const ctlB = d.ctlBike ?? 0;
            const atlB = d.atlBike ?? 0;
            const tsbB = d.tsbBike ?? (ctlB - atlB);

            const runT = d.runTss ?? 0;
            const bikeT = d.bikeTss ?? 0;
            const combinedTss = runT + bikeT;

            return {
                rawDate: d.date,
                dateFormatted: label,
                // Combined
                ctlCombined: ctlComb,
                atlCombined: atlComb,
                tsbCombined: tsbComb,
                combinedTss,
                // Running
                ctlRunning: ctlRun,
                atlRunning: atlRun,
                tsbRunning: tsbRun,
                runTss: runT,
                // Cycling
                ctlBike: ctlB,
                atlBike: atlB,
                tsbBike: tsbB,
                bikeTss: bikeT,
            };
        });
    }, [filteredData]);

    if (isLoading) {
        return (
            <div className="glass-card p-6 h-80 flex flex-col items-center justify-center">
                <div className="text-foreground-muted text-sm">Loading PMC curves...</div>
            </div>
        );
    }

    if (chartData.length === 0) {
        return (
            <div className="glass-card p-6 h-80 flex flex-col items-center justify-center text-center">
                <BarChart2 className="w-12 h-12 text-foreground-muted opacity-40 mb-3" />
                <h4 className="text-foreground font-medium text-base mb-1">No PMC Data Available</h4>
                <p className="text-foreground-muted text-xs max-w-sm">
                    Sync activities to compute your fitness (CTL), fatigue (ATL), and form (TSB) curves.
                </p>
            </div>
        );
    }

    return (
        <div className="glass-card p-6">
            {/* Header with Title and View / Range Selectors */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2">
                        <Layers className="w-5 h-5 text-accent-cyan" />
                        <h3 className="text-lg font-semibold text-foreground">
                            {title}
                        </h3>
                    </div>
                    <p className="text-xs text-foreground-muted mt-1">
                        Track long-term fitness adaptation, acute fatigue, and race readiness
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* View Switcher: Combined | Running | Cycling | Split Overlay */}
                    <div className="inline-flex rounded-lg bg-background-tertiary p-1 border border-line text-xs">
                        <button
                            type="button"
                            onClick={() => setViewMode('combined')}
                            className={`px-2.5 py-1 font-medium rounded-md transition-all ${
                                viewMode === 'combined'
                                    ? 'bg-accent-cyan text-background shadow-xs font-semibold'
                                    : 'text-foreground-muted hover:text-foreground'
                            }`}
                        >
                            Combined
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('running')}
                            className={`px-2.5 py-1 font-medium rounded-md transition-all ${
                                viewMode === 'running'
                                    ? 'bg-accent-blue text-white shadow-xs font-semibold'
                                    : 'text-foreground-muted hover:text-foreground'
                            }`}
                        >
                            Running
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('cycling')}
                            className={`px-2.5 py-1 font-medium rounded-md transition-all ${
                                viewMode === 'cycling'
                                    ? 'bg-accent-orange text-white shadow-xs font-semibold'
                                    : 'text-foreground-muted hover:text-foreground'
                            }`}
                        >
                            Cycling
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('split')}
                            className={`px-2.5 py-1 font-medium rounded-md transition-all ${
                                viewMode === 'split'
                                    ? 'bg-accent-purple text-white shadow-xs font-semibold'
                                    : 'text-foreground-muted hover:text-foreground'
                            }`}
                        >
                            Split Overlay
                        </button>
                    </div>

                    {/* Range Switcher (42d | 90d | 1y | All) */}
                    {!hideRangeSelector && (
                        <div className="inline-flex rounded-lg bg-background-tertiary p-1 border border-line text-xs">
                            {(['42d', '90d', '1y', 'all'] as PmcRange[]).map(r => (
                                <button
                                    key={r}
                                    type="button"
                                    onClick={() => handleRangeClick(r)}
                                    className={`px-2 py-1 uppercase rounded-md transition-all ${
                                        activeRange === r
                                            ? 'bg-surface-hover text-foreground font-semibold'
                                            : 'text-foreground-muted hover:text-foreground'
                                    }`}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Chart Area */}
            <div
                className="h-72 w-full"
                role="img"
                aria-label={`PMC chart in ${viewMode} mode showing fitness and fatigue over time`}
            >
                <span className="sr-only">
                    {`PMC chart with ${chartData.length} data points in ${viewMode} mode.`}
                </span>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                        <defs>
                            <linearGradient id="ctlCombinedGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                            </linearGradient>
                            <linearGradient id="ctlRunGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                            </linearGradient>
                            <linearGradient id="ctlBikeGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#f97316" stopOpacity={0.0} />
                            </linearGradient>
                        </defs>

                        <XAxis
                            dataKey="dateFormatted"
                            stroke="var(--foreground-muted)"
                            tick={{ fill: 'var(--foreground-muted)', fontSize: 11 }}
                            axisLine={{ stroke: 'var(--line)' }}
                            tickLine={false}
                        />
                        <YAxis
                            yAxisId="left"
                            stroke="var(--foreground-muted)"
                            tick={{ fill: 'var(--foreground-muted)', fontSize: 11 }}
                            axisLine={{ stroke: 'var(--line)' }}
                            tickLine={false}
                        />
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            stroke="var(--foreground-muted)"
                            tick={{ fill: 'var(--foreground-muted)', fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                            domain={[0, 'dataMax + 40']}
                            hide
                        />

                        <Tooltip content={<CustomPmcTooltip viewMode={viewMode} />} />

                        <Legend
                            verticalAlign="top"
                            align="right"
                            iconType="circle"
                            wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }}
                        />

                        {/* Neutral Form Reference Line (TSB = 0) */}
                        <ReferenceLine
                            yAxisId="left"
                            y={0}
                            stroke="var(--line)"
                            strokeDasharray="2 2"
                        />

                        {/* === COMBINED VIEW === */}
                        {viewMode === 'combined' && (
                            <>
                                <Bar
                                    yAxisId="right"
                                    dataKey="combinedTss"
                                    name="Daily TSS"
                                    fill="#64748b"
                                    opacity={0.35}
                                    maxBarSize={8}
                                />
                                <Area
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="ctlCombined"
                                    name="Fitness (CTL)"
                                    stroke="#06b6d4"
                                    strokeWidth={2.5}
                                    fill="url(#ctlCombinedGrad)"
                                    dot={false}
                                />
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="atlCombined"
                                    name="Fatigue (ATL)"
                                    stroke="#ec4899"
                                    strokeWidth={1.8}
                                    dot={false}
                                />
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="tsbCombined"
                                    name="Form (TSB)"
                                    stroke="#eab308"
                                    strokeWidth={1.8}
                                    strokeDasharray="3 3"
                                    dot={false}
                                />
                            </>
                        )}

                        {/* === RUNNING VIEW === */}
                        {viewMode === 'running' && (
                            <>
                                <Bar
                                    yAxisId="right"
                                    dataKey="runTss"
                                    name="Run rTSS"
                                    fill="#3b82f6"
                                    opacity={0.35}
                                    maxBarSize={8}
                                />
                                <Area
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="ctlRunning"
                                    name="Running CTL"
                                    stroke="#3b82f6"
                                    strokeWidth={2.5}
                                    fill="url(#ctlRunGrad)"
                                    dot={false}
                                />
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="atlRunning"
                                    name="Running ATL"
                                    stroke="#ec4899"
                                    strokeWidth={1.8}
                                    dot={false}
                                />
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="tsbRunning"
                                    name="Running TSB"
                                    stroke="#10b981"
                                    strokeWidth={1.8}
                                    strokeDasharray="3 3"
                                    dot={false}
                                />
                            </>
                        )}

                        {/* === CYCLING VIEW === */}
                        {viewMode === 'cycling' && (
                            <>
                                <Bar
                                    yAxisId="right"
                                    dataKey="bikeTss"
                                    name="Bike TSS"
                                    fill="#f97316"
                                    opacity={0.35}
                                    maxBarSize={8}
                                />
                                <Area
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="ctlBike"
                                    name="Cycling CTL"
                                    stroke="#f97316"
                                    strokeWidth={2.5}
                                    fill="url(#ctlBikeGrad)"
                                    dot={false}
                                />
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="atlBike"
                                    name="Cycling ATL"
                                    stroke="#ec4899"
                                    strokeWidth={1.8}
                                    dot={false}
                                />
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="tsbBike"
                                    name="Cycling TSB"
                                    stroke="#eab308"
                                    strokeWidth={1.8}
                                    strokeDasharray="3 3"
                                    dot={false}
                                />
                            </>
                        )}

                        {/* === SPLIT OVERLAY VIEW === */}
                        {viewMode === 'split' && (
                            <>
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="ctlRunning"
                                    name="Running CTL"
                                    stroke="#3b82f6"
                                    strokeWidth={2.5}
                                    dot={false}
                                />
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="ctlBike"
                                    name="Cycling CTL"
                                    stroke="#f97316"
                                    strokeWidth={2.5}
                                    dot={false}
                                />
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="ctlCombined"
                                    name="Combined CTL"
                                    stroke="#06b6d4"
                                    strokeWidth={2}
                                    strokeDasharray="4 4"
                                    dot={false}
                                />
                            </>
                        )}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

export const SplitPmcChart = memo(SplitPmcChartComponent);
export default SplitPmcChart;
