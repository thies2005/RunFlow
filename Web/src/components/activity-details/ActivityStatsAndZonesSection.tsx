'use client';

import { Clock, MapPin, TrendingUp, Heart, Zap } from 'lucide-react';
import type { ActivityListItem } from '@/lib/types';
import type { ActivityPowerMetrics, PowerStreamPoint } from './useActivityPowerMetrics';
import CyclingPowerAnalysisPanel from './CyclingPowerAnalysisPanel';

interface ActivityStatsAndZonesSectionProps {
    activity: ActivityListItem;
    isRide: boolean;
    powerMetrics: ActivityPowerMetrics | null;
    powerStreamData: PowerStreamPoint[];
    ftpWatts?: number | null;
    userHrMax?: number;
    vdotCorrectionFactor: number;
    formatDuration: (seconds: number) => string;
    formatPace: (speedMs: number | null | undefined) => string;
}

export default function ActivityStatsAndZonesSection({
    activity,
    isRide,
    powerMetrics,
    powerStreamData,
    ftpWatts,
    userHrMax,
    vdotCorrectionFactor,
    formatDuration,
    formatPace,
}: ActivityStatsAndZonesSectionProps) {
    return (
        <>
            {/* Primary Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="glass-card p-4 text-center">
                    <div className="text-foreground-muted text-xs mb-1 flex items-center justify-center gap-1">
                        <MapPin className="w-3 h-3" /> Distance
                    </div>
                    <div className="text-2xl font-mono tabular-nums font-semibold text-foreground">{(activity.distance / 1000).toFixed(2)}</div>
                    <div className="text-xs text-foreground-muted">km</div>
                </div>
                <div className="glass-card p-4 text-center">
                    <div className="text-foreground-muted text-xs mb-1 flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3" /> Time
                    </div>
                    <div className="text-2xl font-mono tabular-nums font-semibold text-foreground">{formatDuration(activity.movingTime)}</div>
                    <div className="text-xs text-foreground-muted">moving</div>
                </div>
                <div className="glass-card p-4 text-center">
                    <div className="text-foreground-muted text-xs mb-1 flex items-center justify-center gap-1">
                        <TrendingUp className="w-3 h-3" /> {isRide ? 'Speed' : 'Pace'}
                    </div>
                    <div className="text-2xl font-mono tabular-nums font-semibold text-foreground">
                        {isRide
                            ? (activity.averageSpeed ? (activity.averageSpeed * 3.6).toFixed(1) : '-')
                            : formatPace(activity.averageSpeed)}
                    </div>
                    <div className="text-xs text-foreground-muted">{isRide ? 'km/h' : 'avg'}</div>
                </div>
                <div className="glass-card p-4 text-center">
                    <div className="text-foreground-muted text-xs mb-1 flex items-center justify-center gap-1">
                        <Heart className="w-3 h-3" /> Heart Rate
                    </div>
                    <div className="text-2xl font-mono tabular-nums font-semibold text-foreground">{activity.averageHr ? Math.round(activity.averageHr) : '-'}</div>
                    <div className="text-xs text-foreground-muted">bpm</div>
                </div>
                <div className="glass-card p-4 text-center">
                    <div className="text-foreground-muted text-xs mb-1 flex items-center justify-center gap-1">
                        <Zap className="w-3 h-3" /> Cadence
                    </div>
                    <div className="text-2xl font-mono tabular-nums font-semibold text-foreground">
                        {activity.averageCadence
                            ? Math.round(isRide && activity.averageCadence > 130 ? activity.averageCadence / 2 : activity.averageCadence)
                            : '-'}
                    </div>
                    <div className="text-xs text-foreground-muted">{isRide ? 'rpm' : 'spm'}</div>
                </div>
            </div>

            {/* Dedicated Cycling Power Analysis Panel */}
            {isRide && powerMetrics && (
                <CyclingPowerAnalysisPanel
                    powerMetrics={powerMetrics}
                    powerStreamData={powerStreamData}
                    ftpWatts={ftpWatts}
                    formatDuration={formatDuration}
                />
            )}

            {/* Secondary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Elevation Stats */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground-muted border-b border-line pb-2">Elevation</h3>
                    <div className="flex justify-between items-center">
                        <span className="text-foreground-muted">Total Gain</span>
                        <span className="text-foreground font-medium font-mono tabular-nums">{activity.totalElevation ? Math.round(activity.totalElevation) : 0} m</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-foreground-muted">High Point</span>
                        <span className="text-foreground font-medium font-mono tabular-nums">{activity.elevHigh ? Math.round(activity.elevHigh) : '-'} m</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-foreground-muted">Low Point</span>
                        <span className="text-foreground font-medium font-mono tabular-nums">{activity.elevLow ? Math.round(activity.elevLow) : '-'} m</span>
                    </div>
                    {activity.type === 'RUN' ? (
                        <div className="flex justify-between items-center border-t border-line pt-2 mt-2">
                            <span className="text-foreground-muted">GAP</span>
                            <span className="text-positive font-medium font-mono tabular-nums">{formatPace(activity.gradeAdjustedSpeed)}</span>
                        </div>
                    ) : isRide ? (
                        <div className="flex justify-between items-center border-t border-line pt-2 mt-2">
                            <span className="text-foreground-muted">Avg Speed</span>
                            <span className="text-positive font-medium font-mono tabular-nums">
                                {activity.averageSpeed ? `${(activity.averageSpeed * 3.6).toFixed(1)} km/h` : '-'}
                            </span>
                        </div>
                    ) : null}
                </div>

                {/* Training Load */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground-muted border-b border-line pb-2">Training Load</h3>
                    <div className="flex justify-between items-center">
                        <span className="text-foreground-muted">TRIMP</span>
                        <span className="text-positive font-medium font-mono tabular-nums">{activity.trimp ? activity.trimp.toFixed(0) : '-'}</span>
                    </div>
                    {isRide ? (
                        <div className="flex justify-between items-center">
                            <span className="text-foreground-muted">Bike TSS</span>
                            <span className="text-accent-orange font-medium font-mono tabular-nums">
                                {powerMetrics?.bikeTss ? Math.round(powerMetrics.bikeTss) : '-'}
                            </span>
                        </div>
                    ) : activity.type === 'RUN' ? (
                        <div className="flex justify-between items-center">
                            <span className="text-foreground-muted">rTSS</span>
                            <span className="text-accent-orange font-medium font-mono tabular-nums">{activity.runningTss ? activity.runningTss.toFixed(0) : '-'}</span>
                        </div>
                    ) : null}
                    <div className="flex justify-between items-center">
                        <span className="text-foreground-muted">Intensity</span>
                        <span className="text-foreground font-medium font-mono tabular-nums">
                            {(activity.averageHr && (userHrMax || activity.maxHr))
                                ? `${Math.round((activity.averageHr / (userHrMax || activity.maxHr!)) * 100)}% HRmax`
                                : '-'}
                        </span>
                    </div>
                    {activity.type === 'RUN' ? (
                        <div className="flex justify-between items-center border-t border-line pt-2 mt-2">
                            <span className="text-foreground-muted">Aerobic Fitness (VO2max)</span>
                            <span className="text-accent-orange font-medium font-mono tabular-nums">{activity.estimatedVdot ? (activity.estimatedVdot * vdotCorrectionFactor).toFixed(1) : '-'}</span>
                        </div>
                    ) : isRide ? (
                        <>
                            <div className="flex justify-between items-center border-t border-line pt-2 mt-2">
                                <span className="text-foreground-muted">Normalized Power</span>
                                <span className="text-accent-orange font-medium font-mono tabular-nums">
                                    {powerMetrics?.npWatts ? `${powerMetrics.npWatts} W` : '-'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-foreground-muted">Cycling VO2max</span>
                                <span className="text-accent-orange font-medium font-mono tabular-nums">
                                    {powerMetrics?.cyclingVo2max ? `${powerMetrics.cyclingVo2max.toFixed(1)} mL/kg/min` : '-'}
                                </span>
                            </div>
                        </>
                    ) : null}
                </div>

                {/* Device / Other */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground-muted border-b border-line pb-2">Details</h3>
                    <div className="flex justify-between items-center">
                        <span className="text-foreground-muted">Calories</span>
                        <span className="text-foreground font-medium font-mono tabular-nums">{activity.calories ? Math.round(activity.calories) : '-'} kcal</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-foreground-muted">Cadence</span>
                        <span className="text-foreground font-medium font-mono tabular-nums">
                            {activity.averageCadence
                                ? `${Math.round(isRide && activity.averageCadence > 130 ? activity.averageCadence / 2 : activity.averageCadence)} ${isRide ? 'rpm' : 'spm'}`
                                : `- ${isRide ? 'rpm' : 'spm'}`}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-foreground-muted">Device</span>
                        <span className="text-foreground font-medium text-xs truncate max-w-[120px]">Strava Sync</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-foreground-muted">ID</span>
                        <span className="text-foreground font-mono text-xs opacity-50">{activity.id.slice(0, 8)}</span>
                    </div>
                </div>
            </div>

            {/* Zone Distribution Visualization - Enhanced 7-Zone Display */}
            {(activity.hrZone1Time || activity.hrZone2Time) && (() => {
                const zones = [
                    { name: 'Z1', label: 'Recovery', color: 'bg-zone-1', textColor: 'text-zone-1', time: activity.hrZone1Time || 0 },
                    { name: 'Z2', label: 'Aerobic', color: 'bg-zone-2', textColor: 'text-zone-2', time: activity.hrZone2Time || 0 },
                    { name: 'Z3', label: 'Tempo', color: 'bg-zone-3', textColor: 'text-zone-3', time: activity.hrZone3Time || 0 },
                    { name: 'Z4', label: 'Threshold', color: 'bg-zone-4', textColor: 'text-zone-4', time: activity.hrZone4Time || 0 },
                    { name: 'Z5', label: 'VO2max', color: 'bg-zone-5', textColor: 'text-zone-5', time: activity.hrZone5Time || 0 },
                    { name: 'Z6', label: 'Anaerobic', color: 'bg-accent-blue', textColor: 'text-accent-blue', time: activity.hrZone6Time || 0 },
                    { name: 'Z7', label: 'Neuromuscular', color: 'bg-workout-long-run', textColor: 'text-workout-long-run', time: activity.hrZone7Time || 0 }
                ];
                const total = zones.reduce((sum, z) => sum + z.time, 0);
                const activeZones = zones.filter(z => z.time > 0);

                if (total === 0) return null;

                return (
                    <div className="mt-6 mb-8">
                        <h3 className="text-sm font-semibold text-foreground-muted border-b border-line pb-2 mb-4">
                            {isRide ? 'Cycling Heart Rate Zones' : 'Running Heart Rate Zones'}
                        </h3>

                        {/* Horizontal Bar Chart */}
                        <div className="flex h-10 rounded-md overflow-hidden w-full bg-background-tertiary">
                            {activeZones.map((zone, i) => {
                                const pct = (zone.time / total) * 100;
                                return (
                                    <div
                                        key={i}
                                        className={`${zone.color} hover:brightness-110 transition-all flex items-center justify-center`}
                                        style={{ width: `${pct}%` }}
                                        title={`${zone.name} ${zone.label}: ${formatDuration(zone.time)} (${Math.round(pct)}%)`}
                                    >
                                        {pct >= 10 && (
                                            <span className="text-xs font-semibold text-background">{zone.name}</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Detailed Zone Breakdown */}
                        <div className="mt-4 space-y-1">
                            {activeZones.map((zone, i) => {
                                const pct = (zone.time / total) * 100;
                                const mins = Math.floor(zone.time / 60);
                                const secs = zone.time % 60;
                                return (
                                    <div key={i} className="flex items-center justify-between py-1.5 px-2 hover:bg-surface-hover rounded-md text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-3 h-3 rounded-xs ${zone.color}`} />
                                            <span className={`font-medium ${zone.textColor}`}>{zone.name}</span>
                                            <span className="text-foreground-muted text-xs">{zone.label}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-foreground font-mono text-xs tabular-nums">
                                                {mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`}
                                            </span>
                                            <span className="text-foreground-muted text-xs w-10 text-right tabular-nums">
                                                {Math.round(pct)}%
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}
        </>
    );
}
