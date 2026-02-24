'use client';

import { useState, useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import { Heart, TrendingUp, Mountain, Zap } from 'lucide-react';

interface Streams {
    time: number[];
    heartrate?: number[];
    velocity_smooth?: number[];
    altitude?: number[];
    cadence?: number[];
}

interface InteractiveStreamsChartProps {
    streams: Streams | null;
}

const formatPaceTooltip = (val: number) => {
    if (!val) return '';
    const mins = Math.floor(val);
    const secs = Math.round((val - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="glass-card p-4 border border-glass-border">
                <p className="text-foreground-muted text-sm mb-2">
                    {Math.floor(label / 60)}m {label % 60 > 0 ? `${label % 60}s` : ''}
                </p>
                <div className="space-y-1">
                    {payload.map((entry: any, index: number) => {
                        let displayValue = entry.value;
                        let unit = '';

                        // Apply specific formatting based on the data key
                        if (entry.name === 'Pace' || entry.name === 'GAP') {
                            displayValue = formatPaceTooltip(entry.value);
                            unit = '/km';
                        } else if (entry.name === 'Heart Rate') {
                            displayValue = Math.round(entry.value);
                            unit = ' bpm';
                        } else if (entry.name === 'Elevation') {
                            displayValue = Math.round(entry.value);
                            unit = ' m';
                        } else if (entry.name === 'Cadence') {
                            displayValue = Math.round(entry.value);
                            unit = ' spm';
                        }

                        return (
                            <div key={index} className="flex items-center gap-2 text-sm">
                                <span style={{ color: entry.stroke }} className="font-medium">
                                    {entry.name}:
                                </span>
                                <span className="text-foreground">
                                    {displayValue}<span className="text-foreground-muted text-xs">{unit}</span>
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }
    return null;
};

export default function InteractiveStreamsChart({ streams }: InteractiveStreamsChartProps) {
    const [enabledMetrics, setEnabledMetrics] = useState({
        heartrate: true,
        pace: true,
        gap: true, // Grade Adjusted Pace
        elevation: true,
        cadence: false
    });

    // Process stream data - useMemo MUST be called unconditionally (before any returns)
    const data = useMemo(() => {
        if (!streams?.time) return [];

        return streams.time.map((t, i) => {
            const point: Record<string, number | null> = { time: t };

            // Heart rate
            if (streams.heartrate && streams.heartrate[i] !== undefined) {
                point.heartrate = streams.heartrate[i];
            }

            // Pace: velocity (m/s) -> min/km
            if (streams.velocity_smooth && streams.velocity_smooth[i] !== undefined) {
                const mPerS = streams.velocity_smooth[i];
                if (mPerS > 0.1) {
                    const minPerKm = (1000 / mPerS) / 60;
                    // Cap outlier paces to null (not 0) to avoid false data points
                    point.pace = minPerKm > 20 ? null : minPerKm;
                } else {
                    point.pace = null;
                }
            }

            // GAP: Grade Adjusted Pace (Runalyze/Minetti approach)
            // Calculate grade from altitude change and use metabolic cost ratio
            if (streams.velocity_smooth && streams.altitude && streams.velocity_smooth[i] !== undefined) {
                const mPerS = streams.velocity_smooth[i];
                if (mPerS > 0.5 && i > 0 && streams.altitude[i] !== undefined && streams.altitude[i - 1] !== undefined) {
                    // Calculate grade (vertical / horizontal distance)
                    const timeDelta = streams.time[i] - streams.time[i - 1];
                    const elevDelta = streams.altitude[i] - streams.altitude[i - 1];
                    const horizDist = mPerS * timeDelta;
                    const grade = horizDist > 0 ? (elevDelta / horizDist) * 100 : 0; // as percentage

                    // Minetti metabolic cost formula (simplified)
                    // Cost ratio relative to flat running
                    // Uphill: more effort -> GAP faster than actual
                    // Downhill: less effort (to a point) -> GAP slower than actual
                    let costRatio = 1.0;
                    if (grade > 0) {
                        // Uphill: ~2.5-3% more cost per 1% grade
                        costRatio = 1 + (grade * 0.03);
                    } else if (grade < 0) {
                        // Downhill: optimal around -10%, less cost
                        const absGrade = Math.abs(grade);
                        if (absGrade < 10) {
                            costRatio = 1 - (absGrade * 0.015); // Slight benefit
                        } else {
                            costRatio = 0.85 + ((absGrade - 10) * 0.02); // Steeper = harder
                        }
                    }

                    // GAP = actual pace / cost ratio (faster if harder effort)
                    const actualPace = (1000 / mPerS) / 60;
                    const gapPace = actualPace / costRatio;
                    point.gap = gapPace > 20 || gapPace < 2 ? null : gapPace;
                } else {
                    point.gap = null;
                }
            }

            // Elevation - check !== undefined since 0 is valid
            if (streams.altitude && streams.altitude[i] !== undefined) {
                point.elevation = streams.altitude[i];
            }

            // Cadence - multiply by 2 for runs (Strava returns rpm, we show spm)
            if (streams.cadence && streams.cadence[i] !== undefined) {
                point.cadence = streams.cadence[i] * 2;
            }

            return point;
        });
    }, [streams]);

    // Determine which streams are available
    const hasHeartrate = Boolean(streams?.heartrate?.length);
    const hasPace = Boolean(streams?.velocity_smooth?.length);
    const hasGap = Boolean(streams?.velocity_smooth?.length && streams?.altitude?.length);
    const hasElevation = Boolean(streams?.altitude?.length);
    const hasCadence = Boolean(streams?.cadence?.length);

    // Early return AFTER hooks
    if (!streams?.time || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 bg-white/5 rounded-xl border border-white/10">
                <p className="text-gray-400">No stream data available</p>
            </div>
        );
    }

    const formatXAxis = (tick: number) => {
        const mins = Math.floor(tick / 60);
        return `${mins}m`;
    };

    const _formatPaceAxis = (val: number) => {
        if (val === null || val === undefined || val === 0) return '';
        const mins = Math.floor(val);
        const secs = Math.round((val - mins) * 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="space-y-4">
            {/* Toggles */}
            <div className="flex flex-wrap gap-4 justify-center">
                {hasHeartrate && (
                    <button
                        onClick={() => setEnabledMetrics(p => ({ ...p, heartrate: !p.heartrate }))}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${enabledMetrics.heartrate
                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                            : 'bg-transparent text-gray-500 border-gray-700 hover:text-gray-300'
                            }`}
                    >
                        <Heart className="w-3 h-3" /> Heart Rate
                    </button>
                )}
                {hasPace && (
                    <button
                        onClick={() => setEnabledMetrics(p => ({ ...p, pace: !p.pace }))}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${enabledMetrics.pace
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : 'bg-transparent text-gray-500 border-gray-700 hover:text-gray-300'
                            }`}
                    >
                        <TrendingUp className="w-3 h-3" /> Pace
                    </button>
                )}
                {hasGap && (
                    <button
                        onClick={() => setEnabledMetrics(p => ({ ...p, gap: !p.gap }))}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${enabledMetrics.gap
                            ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                            : 'bg-transparent text-gray-500 border-gray-700 hover:text-gray-300'
                            }`}
                    >
                        <Mountain className="w-3 h-3" /> GAP
                    </button>
                )}
                {hasElevation && (
                    <button
                        onClick={() => setEnabledMetrics(p => ({ ...p, elevation: !p.elevation }))}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${enabledMetrics.elevation
                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                            : 'bg-transparent text-gray-500 border-gray-700 hover:text-gray-300'
                            }`}
                    >
                        <Mountain className="w-3 h-3" /> Elevation
                    </button>
                )}
                {hasCadence && (
                    <button
                        onClick={() => setEnabledMetrics(p => ({ ...p, cadence: !p.cadence }))}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${enabledMetrics.cadence
                            ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                            : 'bg-transparent text-gray-500 border-gray-700 hover:text-gray-300'
                            }`}
                    >
                        <Zap className="w-3 h-3" /> Cadence
                    </button>
                )}
            </div>

            <div className="h-[300px] md:h-[400px] w-full bg-white/5 rounded-xl border border-white/10 p-4">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" opacity={0.4} vertical={false} />
                        <XAxis
                            dataKey="time"
                            tickFormatter={formatXAxis}
                            stroke="#9CA3AF"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            minTickGap={30}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ paddingTop: '10px' }} />

                        {enabledMetrics.heartrate && hasHeartrate && (
                            <YAxis yAxisId="hr" domain={['dataMin - 10', 'dataMax + 10']} hide />
                        )}
                        {enabledMetrics.pace && hasPace && (
                            <YAxis
                                yAxisId="pace"
                                domain={[3, 15]}
                                reversed
                                hide
                                ticks={[0, 3, 6, 9, 12, 15]}
                            />
                        )}
                        {enabledMetrics.gap && hasGap && (
                            <YAxis
                                yAxisId="gap"
                                domain={[3, 15]}
                                reversed
                                hide
                                ticks={[0, 3, 6, 9, 12, 15]}
                            />
                        )}
                        {enabledMetrics.elevation && hasElevation && (
                            <YAxis yAxisId="elev" domain={['dataMin', 'dataMax']} hide />
                        )}
                        {enabledMetrics.cadence && hasCadence && (
                            <YAxis yAxisId="cad" domain={[120, 220]} hide />
                        )}

                        {enabledMetrics.heartrate && hasHeartrate && (
                            <Line
                                yAxisId="hr"
                                type="monotone"
                                dataKey="heartrate"
                                name="Heart Rate"
                                stroke="#F87171"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4 }}
                                isAnimationActive={false}
                                connectNulls
                            />
                        )}
                        {enabledMetrics.pace && hasPace && (
                            <Line
                                yAxisId="pace"
                                type="monotone"
                                dataKey="pace"
                                name="Pace"
                                stroke="#60A5FA"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4 }}
                                isAnimationActive={false}
                                connectNulls
                            />
                        )}
                        {enabledMetrics.gap && hasGap && (
                            <Line
                                yAxisId="gap"
                                type="monotone"
                                dataKey="gap"
                                name="GAP"
                                stroke="#22D3EE"
                                strokeWidth={2}
                                strokeDasharray="5 3"
                                dot={false}
                                activeDot={{ r: 4 }}
                                isAnimationActive={false}
                                connectNulls
                            />
                        )}
                        {enabledMetrics.elevation && hasElevation && (
                            <Line
                                yAxisId="elev"
                                type="monotone"
                                dataKey="elevation"
                                name="Elevation"
                                stroke="#4ADE80"
                                strokeWidth={2}
                                dot={false}
                                isAnimationActive={false}
                                connectNulls
                            />
                        )}
                        {enabledMetrics.cadence && hasCadence && (
                            <Line
                                yAxisId="cad"
                                type="monotone"
                                dataKey="cadence"
                                name="Cadence"
                                stroke="#FB923C"
                                strokeWidth={1}
                                strokeDasharray="5 5"
                                dot={false}
                                isAnimationActive={false}
                                connectNulls
                            />
                        )}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
