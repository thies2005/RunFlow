'use client';

import { Zap, ShieldCheck, Cpu } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ReferenceLine } from 'recharts';
import type { ActivityPowerMetrics, PowerStreamPoint } from './useActivityPowerMetrics';

interface CyclingPowerAnalysisPanelProps {
    powerMetrics: ActivityPowerMetrics;
    powerStreamData: PowerStreamPoint[];
    ftpWatts?: number | null;
    formatDuration: (seconds: number) => string;
}

export default function CyclingPowerAnalysisPanel({
    powerMetrics,
    powerStreamData,
    ftpWatts,
    formatDuration,
}: CyclingPowerAnalysisPanelProps) {
    return (
        <div className="mb-8 p-5 bg-background-tertiary rounded-xl border border-line space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-accent-orange/15 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-accent-orange" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-foreground">Cycling Power Analysis</h3>
                        <p className="text-[11px] text-foreground-muted">Normalized power, training stress, and physiological load</p>
                    </div>
                </div>

                {/* Power Meter vs Estimated Power Badge */}
                <div className="flex items-center gap-2">
                    {powerMetrics.deviceWatts ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-positive/15 text-positive border border-positive/30">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Power Meter
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-foreground/10 text-foreground-muted border border-line">
                            <Cpu className="w-3.5 h-3.5" />
                            Estimated Power
                        </span>
                    )}
                </div>
            </div>

            {/* 10 Power Metric Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {/* NP */}
                <div className="bg-background-secondary p-3 rounded-lg border border-line text-center whitespace-nowrap">
                    <span className="text-[11px] text-foreground-muted block mb-0.5">Normalized Power</span>
                    <span className="text-xl font-mono font-bold text-accent-orange tabular-nums">
                        {powerMetrics.npWatts ? (
                            <>{powerMetrics.npWatts}<span className="text-xs font-normal text-foreground-muted ml-0.5">W</span></>
                        ) : '-'}
                    </span>
                </div>
                {/* Avg Power */}
                <div className="bg-background-secondary p-3 rounded-lg border border-line text-center whitespace-nowrap">
                    <span className="text-[11px] text-foreground-muted block mb-0.5">Avg Power</span>
                    <span className="text-xl font-mono font-bold text-foreground tabular-nums">
                        {powerMetrics.avgWatts ? (
                            <>{powerMetrics.avgWatts}<span className="text-xs font-normal text-foreground-muted ml-0.5">W</span></>
                        ) : '-'}
                    </span>
                </div>
                {/* Max Power */}
                <div className="bg-background-secondary p-3 rounded-lg border border-line text-center whitespace-nowrap">
                    <span className="text-[11px] text-foreground-muted block mb-0.5">Max Power</span>
                    <span className="text-xl font-mono font-bold text-foreground tabular-nums">
                        {powerMetrics.maxWatts ? (
                            <>{powerMetrics.maxWatts}<span className="text-xs font-normal text-foreground-muted ml-0.5">W</span></>
                        ) : '-'}
                    </span>
                </div>
                {/* Intensity Factor (IF) */}
                <div className="bg-background-secondary p-3 rounded-lg border border-line text-center whitespace-nowrap">
                    <span className="text-[11px] text-foreground-muted block mb-0.5">Intensity Factor (IF)</span>
                    <span className="text-xl font-mono font-bold text-accent-orange tabular-nums">
                        {powerMetrics.intensityFactor ? powerMetrics.intensityFactor.toFixed(2) : '-'}
                    </span>
                </div>
                {/* Variability Index (VI) */}
                <div className="bg-background-secondary p-3 rounded-lg border border-line text-center whitespace-nowrap">
                    <span className="text-[11px] text-foreground-muted block mb-0.5">Variability Index (VI)</span>
                    <span className="text-xl font-mono font-bold text-positive tabular-nums">
                        {powerMetrics.variabilityIndex ? powerMetrics.variabilityIndex.toFixed(2) : '-'}
                    </span>
                </div>
                {/* Bike TSS */}
                <div className="bg-background-secondary p-3 rounded-lg border border-line text-center whitespace-nowrap">
                    <span className="text-[11px] text-foreground-muted block mb-0.5">Bike TSS</span>
                    <span className="text-xl font-mono font-bold text-accent-orange tabular-nums">
                        {powerMetrics.bikeTss ? Math.round(powerMetrics.bikeTss) : '-'}
                    </span>
                </div>
                {/* Work (kJ) */}
                <div className="bg-background-secondary p-3 rounded-lg border border-line text-center whitespace-nowrap">
                    <span className="text-[11px] text-foreground-muted block mb-0.5">Work (kJ)</span>
                    <span className="text-xl font-mono font-bold text-foreground tabular-nums">
                        {powerMetrics.kilojoules ? (
                            <>{Math.round(powerMetrics.kilojoules)}<span className="text-xs font-normal text-foreground-muted ml-0.5">kJ</span></>
                        ) : '-'}
                    </span>
                </div>
                {/* W/kg */}
                <div className="bg-background-secondary p-3 rounded-lg border border-line text-center whitespace-nowrap">
                    <span className="text-[11px] text-foreground-muted block mb-0.5">Power-to-Weight</span>
                    <span className="text-xl font-mono font-bold text-foreground tabular-nums">
                        {powerMetrics.wPerKg ? (
                            <>{powerMetrics.wPerKg}<span className="text-xs font-normal text-foreground-muted ml-0.5">W/kg</span></>
                        ) : '-'}
                    </span>
                </div>
                {/* Efficiency Factor (EF) */}
                <div className="bg-background-secondary p-3 rounded-lg border border-line text-center whitespace-nowrap">
                    <span className="text-[11px] text-foreground-muted block mb-0.5">Efficiency Factor (EF)</span>
                    <span className="text-xl font-mono font-bold text-negative tabular-nums">
                        {powerMetrics.efficiencyFactor ? `${powerMetrics.efficiencyFactor.toFixed(2)}` : '-'}
                    </span>
                </div>
                {/* Aerobic Decoupling */}
                <div className="bg-background-secondary p-3 rounded-lg border border-line text-center whitespace-nowrap">
                    <span className="text-[11px] text-foreground-muted block mb-0.5">Decoupling (Pw:HR)</span>
                    <span className={`text-xl font-mono font-bold tabular-nums ${powerMetrics.decouplingPct !== null && powerMetrics.decouplingPct < 5 ? 'text-positive' : 'text-accent-orange'}`}>
                        {powerMetrics.decouplingPct !== null ? `${powerMetrics.decouplingPct > 0 ? '+' : ''}${powerMetrics.decouplingPct.toFixed(1)}%` : '-'}
                    </span>
                </div>
            </div>

            {/* 7-Zone Coggan Power Breakdown */}
            <div className="pt-2">
                <div className="flex items-center justify-between border-b border-line pb-2 mb-3">
                    <h4 className="text-xs font-semibold text-foreground-muted">
                        Cycling Power Zones (Coggan 7-Zone · FTP {powerMetrics.ftp}W)
                    </h4>
                    {powerMetrics.totalPowerZoneSec > 0 && (
                        <span className="text-[11px] text-foreground-muted font-mono">
                            Time in Zone
                        </span>
                    )}
                </div>
                {powerMetrics.totalPowerZoneSec > 0 && (
                    <div className="w-full h-8 rounded-lg overflow-hidden flex bg-background-secondary mb-3">
                        {powerMetrics.activePowerZones.map((z, idx) => {
                            const pct = (z.time / powerMetrics.totalPowerZoneSec) * 100;
                            return (
                                <div
                                    key={idx}
                                    className={`${z.color} hover:brightness-110 transition-all flex items-center justify-center`}
                                    style={{ width: `${pct}%` }}
                                    title={`${z.name} ${z.label}: ${formatDuration(z.time)} (${pct.toFixed(1)}%)`}
                                >
                                    {pct >= 8 && (
                                        <span className="text-[10px] font-bold text-white drop-shadow-xs">
                                            {z.name}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Zone Breakdown List (always shows watt targets; includes time in zone when stream exists) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {powerMetrics.cogganZones.map((z, idx) => {
                        const pct = powerMetrics.totalPowerZoneSec > 0 ? (z.time / powerMetrics.totalPowerZoneSec) * 100 : 0;
                        return (
                            <div key={idx} className="flex items-center justify-between py-1.5 px-2.5 rounded-md bg-background-secondary/60 text-xs">
                                <div className="flex items-center gap-2">
                                    <span className={`w-2.5 h-2.5 rounded-xs ${z.color}`} />
                                    <span className={`font-semibold ${z.textColor}`}>{z.name}</span>
                                    <span className="text-foreground-muted text-[11px]">{z.label}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-[11px] text-foreground-muted">
                                        {z.minW}–{z.maxW ?? '∞'}W
                                    </span>
                                    {powerMetrics.totalPowerZoneSec > 0 && (
                                        <>
                                            <span className="font-mono text-foreground font-medium">{formatDuration(z.time)}</span>
                                            <span className="font-mono text-foreground-muted w-8 text-right">{pct.toFixed(0)}%</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Power Stream Line Chart (if watts stream exists) */}
            {powerStreamData.length > 0 && (
                <div className="pt-2">
                    <h4 className="text-xs font-semibold text-foreground-muted border-b border-line pb-2 mb-3">
                        Ride Power Stream (Watts)
                    </h4>
                    <div className="h-44 w-full" role="img" aria-label="Activity power stream chart">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={powerStreamData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                                <XAxis
                                    dataKey="timeFormatted"
                                    stroke="var(--foreground-muted)"
                                    tick={{ fill: 'var(--foreground-muted)', fontSize: 10 }}
                                    axisLine={{ stroke: 'var(--line)' }}
                                    tickLine={false}
                                />
                                <YAxis
                                    stroke="var(--foreground-muted)"
                                    tick={{ fill: 'var(--foreground-muted)', fontSize: 10 }}
                                    axisLine={{ stroke: 'var(--line)' }}
                                    tickLine={false}
                                    unit="W"
                                />
                                <RechartsTooltip
                                    content={({ active, payload }) => {
                                        if (!active || !payload?.length) return null;
                                        const d = payload[0]?.payload;
                                        return (
                                            <div className="bg-background-secondary border border-line rounded-md p-2 text-xs">
                                                <div className="text-foreground-muted">{d.timeFormatted}</div>
                                                <div className="font-mono font-bold text-accent-orange">{d.watts} W</div>
                                            </div>
                                        );
                                    }}
                                />
                                {ftpWatts && (
                                    <ReferenceLine
                                        y={ftpWatts}
                                        stroke="#06b6d4"
                                        strokeDasharray="3 3"
                                        label={{ value: `FTP ${ftpWatts}W`, fill: '#06b6d4', fontSize: 10, position: 'right' }}
                                    />
                                )}
                                <Line
                                    type="monotone"
                                    dataKey="watts"
                                    stroke="#f97316"
                                    strokeWidth={1.5}
                                    dot={false}
                                    isAnimationActive={false}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
}
