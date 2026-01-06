'use client';

import { X, Calendar, Clock, MapPin, TrendingUp, Activity as ActivityIcon, Heart, Mountain, Zap } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { Activity } from '@/lib/types';

interface ActivityDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    activity: Activity | null;
}

export default function ActivityDetailsModal({ isOpen, onClose, activity }: ActivityDetailsModalProps) {
    if (!isOpen || !activity) return null;

    // Helper to format duration
    const formatDuration = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return hours > 0 ? `${hours}h ${mins}m ${secs}s` : `${mins}m ${secs}s`;
    };

    // Helper to format pace
    const formatPace = (speedMs: number | null) => {
        if (!speedMs || speedMs <= 0) return '-';
        const paceSecsPerKm = 1000 / speedMs;
        const mins = Math.floor(paceSecsPerKm / 60);
        const secs = Math.round(paceSecsPerKm % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}/km`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-2xl bg-[#0f1115] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="relative p-6 border-b border-white/10 bg-gradient-to-r from-accent-purple/10 to-accent-pink/10">
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex items-start gap-4 pr-10">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-purple to-accent-pink flex items-center justify-center shadow-lg shadow-accent-purple/20">
                            {activity.type === 'RUN' ? <ActivityIcon className="w-6 h-6 text-white" /> :
                                activity.type === 'RIDE' ? <Zap className="w-6 h-6 text-white" /> :
                                    <ActivityIcon className="w-6 h-6 text-white" />}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white mb-1">{activity.name}</h2>
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                <Calendar className="w-4 h-4" />
                                <span>{format(new Date(activity.startDate), 'EEEE, MMMM d, yyyy • h:mm a')}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto max-h-[80vh]">
                    {/* Description if available */}
                    {activity.description && (
                        <div className="mb-8 bg-white/5 rounded-xl p-4">
                            <p className="text-gray-300 italic">"{activity.description}"</p>
                        </div>
                    )}

                    {/* Primary Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="glass-card p-4 text-center">
                            <div className="text-gray-400 text-xs uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                                <MapPin className="w-3 h-3" /> Distance
                            </div>
                            <div className="text-2xl font-bold text-white">{(activity.distance / 1000).toFixed(2)}</div>
                            <div className="text-xs text-gray-500">km</div>
                        </div>
                        <div className="glass-card p-4 text-center">
                            <div className="text-gray-400 text-xs uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                                <Clock className="w-3 h-3" /> Time
                            </div>
                            <div className="text-2xl font-bold text-white">{formatDuration(activity.movingTime)}</div>
                            <div className="text-xs text-gray-500">moving</div>
                        </div>
                        <div className="glass-card p-4 text-center">
                            <div className="text-gray-400 text-xs uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                                <TrendingUp className="w-3 h-3" /> Pace
                            </div>
                            <div className="text-2xl font-bold text-white">{formatPace(activity.averageSpeed)}</div>
                            <div className="text-xs text-gray-500">avg</div>
                        </div>
                        <div className="glass-card p-4 text-center">
                            <div className="text-gray-400 text-xs uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                                <Heart className="w-3 h-3" /> Heart Rate
                            </div>
                            <div className="text-2xl font-bold text-white">{activity.averageHr ? Math.round(activity.averageHr) : '-'}</div>
                            <div className="text-xs text-gray-500">bpm</div>
                        </div>
                    </div>

                    {/* Secondary Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        {/* Elevation Stats */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest border-b border-white/10 pb-2">Elevation</h3>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Total Gain</span>
                                <span className="text-white font-medium">{activity.totalElevation ? Math.round(activity.totalElevation) : 0} m</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">High Point</span>
                                <span className="text-white font-medium">{activity.elevHigh ? Math.round(activity.elevHigh) : '-'} m</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Low Point</span>
                                <span className="text-white font-medium">{activity.elevLow ? Math.round(activity.elevLow) : '-'} m</span>
                            </div>
                        </div>

                        {/* Training Load */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest border-b border-white/10 pb-2">Training Load</h3>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">TRIMP</span>
                                <span className="text-accent-cyan font-medium">{activity.trimp ? activity.trimp.toFixed(0) : '-'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">rTSS</span>
                                <span className="text-accent-orange font-medium">{activity.runningTss ? activity.runningTss.toFixed(0) : '-'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Intensity</span>
                                <span className="text-white font-medium">
                                    {activity.averageHr && activity.maxHr
                                        ? `${Math.round((activity.averageHr / activity.maxHr) * 100)}% HRmax`
                                        : '-'}
                                </span>
                            </div>
                        </div>

                        {/* Device / Other */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest border-b border-white/10 pb-2">Details</h3>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Calories</span>
                                <span className="text-white font-medium">-</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Device</span>
                                <span className="text-white font-medium text-xs truncate max-w-[120px]">Strava Sync</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">ID</span>
                                <span className="text-white font-mono text-xs text-opacity-50">{activity.id.slice(0, 8)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Zone Distribution Visualization (if available) - simplified */}
                    {(activity.hrZone1Time || activity.hrZone2Time) && (
                        <div className="mt-6">
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest border-b border-white/10 pb-2 mb-4">Heart Rate Zones</h3>
                            <div className="flex h-4 rounded-full overflow-hidden w-full bg-white/5">
                                {[
                                    { color: 'bg-gray-400', time: activity.hrZone1Time },
                                    { color: 'bg-blue-400', time: activity.hrZone2Time },
                                    { color: 'bg-green-400', time: activity.hrZone3Time },
                                    { color: 'bg-orange-400', time: activity.hrZone4Time },
                                    { color: 'bg-red-500', time: activity.hrZone5Time }
                                ].map((zone, i) => {
                                    const total = (activity.hrZone1Time || 0) + (activity.hrZone2Time || 0) + (activity.hrZone3Time || 0) + (activity.hrZone4Time || 0) + (activity.hrZone5Time || 0);
                                    if (!total || !zone.time) return null;
                                    const pct = (zone.time / total) * 100;
                                    return <div key={i} className={`${zone.color}`} style={{ width: `${pct}%` }} title={`Zone ${i + 1}: ${Math.round(pct)}%`} />;
                                })}
                            </div>
                            <div className="flex justify-between mt-2 text-xs text-gray-500 px-1">
                                <span>Z1</span><span>Z2</span><span>Z3</span><span>Z4</span><span>Z5</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
