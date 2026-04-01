'use client';

import { X, Calendar, Clock, MapPin, TrendingUp, Activity as ActivityIcon, Heart, Zap, BarChart2, Tag, Edit2, Check, Bot, Loader2, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import type { ActivityListItem, WorkoutType, Activity } from '@/lib/types';
import InteractiveStreamsChart from './InteractiveStreamsChart';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

interface ActivityDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    activity: ActivityListItem | null;
    userHrMax?: number;
    vdotCorrectionFactor?: number;
}

export default function ActivityDetailsModal({ isOpen, onClose, activity, userHrMax, vdotCorrectionFactor = 1.0 }: ActivityDetailsModalProps) {
    const [mounted, setMounted] = useState(false);
    const [trainingType, setTrainingType] = useState<WorkoutType | null>(null);
    const [isUpdatingType, setIsUpdatingType] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [name, setName] = useState('');
    const [isSavingName, setIsSavingName] = useState(false);
    const [detailedActivity, setDetailedActivity] = useState<Activity | null>(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [aiFeedback, setAiFeedback] = useState<any>(null);
    const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
    const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
    const [feedbackError, setFeedbackError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        setMounted(true);
        if (activity) {
            setTrainingType(activity.trainingType || 'EASY');
            setName(activity.name);
            setAiFeedback(null);
            setIsLoadingFeedback(false);
            setIsGeneratingFeedback(false);
            setFeedbackError(null);
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden';

            // Fetch full details including streams
            const fetchDetails = async () => {
                setIsLoadingDetails(true);
                try {
                    const res = await fetch(`/api/activities/${activity.id}`);
                    if (res.ok) {
                        const data = await res.json();
                        setDetailedActivity(data);
                    }
                } catch (error) {
                    console.error('Failed to fetch activity details:', error);
                } finally {
                    setIsLoadingDetails(false);
                }
            };
            
            const fetchFeedback = async () => {
                setIsLoadingFeedback(true);
                setFeedbackError(null);
                try {
                    const res = await fetch(`/api/ai/activity-feedback?activityId=${activity.id}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.feedback) {
                            setAiFeedback(data.feedback);
                        }
                    }
                } catch (error) {
                    console.error('Failed to fetch AI feedback:', error);
                } finally {
                    setIsLoadingFeedback(false);
                }
            };
            
            fetchDetails();
            fetchFeedback();
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [activity]);

    // All useCallback hooks must be called before any early returns (React hooks rules)
    const handleTypeChange = useCallback(async (newType: WorkoutType) => {
        if (!activity) return;
        const previousType = trainingType;
        setTrainingType(newType); // Optimistic update
        setIsUpdatingType(true);
        try {
            const res = await fetch(`/api/activities/${activity.id}/type`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ trainingType: newType }),
            });
            if (!res.ok) throw new Error('Failed to update type');
        } catch (error) {
            console.error('Failed to update training type:', error);
            setTrainingType(previousType); // Revert on error
        } finally {
            setIsUpdatingType(false);
        }
    }, [activity, trainingType]);

    const handleSaveName = useCallback(async () => {
        if (!activity || !name.trim()) return;

        setIsSavingName(true);
        try {
            const res = await fetch(`/api/activities/${activity.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.trim() }),
            });

            if (!res.ok) throw new Error('Failed to update name');

            setIsEditingName(false);
            router.refresh(); // Refresh server components to show new name globally
        } catch (error) {
            console.error('Failed to update name:', error);
            // Optionally add toast here
        } finally {
            setIsSavingName(false);
        }
    }, [activity, name, router]);

    const handleGenerateFeedback = useCallback(async () => {
        if (!activity) return;
        setIsGeneratingFeedback(true);
        setFeedbackError(null);
        try {
            const res = await fetch('/api/ai/activity-feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ activityId: activity.id, regenerate: true }),
            });
            if (res.ok) {
                const data = await res.json();
                if (data.feedback) {
                    setAiFeedback(data.feedback);
                } else if (data.error) {
                    setFeedbackError(data.error);
                }
            } else {
                const errorData = await res.json().catch(() => null);
                if (res.status === 429) {
                    if (errorData?.queued) {
                        setFeedbackError(errorData.message || 'Server rate limited. Your feedback is being prepared and will appear shortly.');
                    } else {
                        setFeedbackError("Quota exhausted. Please upgrade your plan or contact admin.");
                    }
                } else {
                    setFeedbackError(errorData?.error || 'Failed to generate AI feedback');
                }
            }
        } catch (error) {
            console.error('Failed to generate AI feedback:', error);
            setFeedbackError('An error occurred while generating AI feedback.');
        } finally {
            setIsGeneratingFeedback(false);
        }
    }, [activity]);

    // Early return AFTER all hooks have been called
    if (!isOpen || !activity || !mounted) return null;

    const WORKOUT_TYPES: WorkoutType[] = [
        'EASY', 'LONG_RUN', 'TEMPO', 'INTERVALS', 'REPETITIONS', 'RECOVERY', 'RACE', 'REST'
    ];

    // Helper to format duration
    const formatDuration = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return hours > 0 ? `${hours}h ${mins}m ${secs}s` : `${mins}m ${secs}s`;
    };

    // Helper to format pace
    const formatPace = (speedMs: number | null | undefined) => {
        if (speedMs === null || speedMs === undefined || speedMs <= 0) return '-';
        const paceSecsPerKm = 1000 / speedMs;
        const mins = Math.floor(paceSecsPerKm / 60);
        const secs = Math.round(paceSecsPerKm % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}/km`;
    };

    // Safe date formatting
    const getFormattedDate = (dateStr: string | Date) => {
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return 'Invalid Date';
            return format(date, 'EEEE, MMMM d, yyyy • h:mm a');
        } catch {
            return 'Invalid Date';
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/[var(--modal-backdrop-opacity)] backdrop-blur-xs animate-in fade-in duration-200">
            <div className="relative w-full max-w-2xl bg-background border border-glass-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col" role="dialog" aria-modal="true" aria-labelledby="activity-title">
                {/* Header */}
                <div className="relative p-6 border-b border-glass-border bg-gradient-to-r from-accent-purple/10 to-accent-pink/10 shrink-0">
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 p-2 text-foreground-muted hover:text-foreground hover:bg-surface-hover rounded-lg transition-colors"
                        aria-label="Close activity details"
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
                            {isEditingName ? (
                                <div className="flex items-center gap-2 mb-1">
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="text-xl font-bold text-foreground bg-background-secondary border border-glass-border rounded px-2 py-1 focus:outline-hidden focus:border-accent-purple w-full"
                                        autoFocus
                                        aria-label="Activity name input"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveName();
                                            if (e.key === 'Escape') {
                                                setIsEditingName(false);
                                                setName(activity.name);
                                            }
                                        }}
                                    />
                                    <button
                                        onClick={handleSaveName}
                                        disabled={isSavingName}
                                        className="p-1.5 bg-green-500/10 text-green-500 hover:bg-green-500/20 rounded transition-colors"
                                        aria-label="Save activity name"
                                    >
                                        <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsEditingName(false);
                                            setName(activity.name);
                                        }}
                                        className="p-1.5 hover:bg-surface-hover text-foreground-muted hover:text-foreground rounded transition-colors"
                                        aria-label="Cancel editing name"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-start gap-2 mb-1 group">
                                    <h2 id="activity-title" className="text-xl font-bold text-foreground">{name}</h2>
                                    <button
                                        onClick={() => setIsEditingName(true)}
                                        className="p-1 text-foreground-muted opacity-0 group-hover:opacity-100 hover:text-foreground transition-all"
                                        aria-label="Edit activity name"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                            <div className="flex items-center gap-2 text-sm text-foreground-muted">
                                <Calendar className="w-4 h-4" />
                                <span>{getFormattedDate(activity.startDate)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {/* Actions Row */}
                    <div className="flex flex-wrap items-center gap-4 mb-6">
                        <Link
                            href={`/activity/${activity.id}/analysis`}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent-purple to-accent-pink hover:opacity-90 rounded-lg text-white font-medium transition-all shadow-lg shadow-accent-purple/20"
                        >
                            <BarChart2 className="w-4 h-4" />
                            Analyse
                        </Link>

                        <div className="relative group">
                            <div className="flex items-center gap-2 px-3 py-2 bg-background-tertiary hover:bg-background-secondary rounded-lg border border-glass-border transition-colors cursor-pointer">
                                <Tag className="w-4 h-4 text-foreground-muted" />
                                <select
                                    value={trainingType || 'EASY'}
                                    onChange={(e) => handleTypeChange(e.target.value as WorkoutType)}
                                    className="bg-transparent border-none text-sm text-foreground focus:ring-0 cursor-pointer appearance-none pr-8 outline-hidden"
                                    disabled={isUpdatingType}
                                    aria-label="Select workout type"
                                >
                                    {WORKOUT_TYPES.map(type => (
                                        <option key={type} value={type} className="bg-background-secondary text-foreground">
                                            {type.replace('_', ' ')}
                                        </option>
                                    ))}
                                    <option value="RIDE" className="bg-background-secondary text-foreground">RIDE</option>
                                    <option value="SWIM" className="bg-background-secondary text-foreground">SWIM</option>
                                    <option value="STRENGTH" className="bg-background-secondary text-foreground">STRENGTH</option>
                                    <option value="OTHER" className="bg-background-secondary text-foreground">OTHER</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    {/* Description if available */}
                    {activity.description && (
                        <div className="mb-8 bg-background-tertiary rounded-xl p-4 border border-glass-border">
                            <p className="text-foreground italic">&quot;{activity.description}&quot;</p>
                        </div>
                    )}

                    {/* Primary Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="glass-card p-4 text-center">
                            <div className="text-foreground-muted text-xs uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                                <MapPin className="w-3 h-3" /> Distance
                            </div>
                            <div className="text-2xl font-bold text-foreground">{(activity.distance / 1000).toFixed(2)}</div>
                            <div className="text-xs text-foreground-muted">km</div>
                        </div>
                        <div className="glass-card p-4 text-center">
                            <div className="text-foreground-muted text-xs uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                                <Clock className="w-3 h-3" /> Time
                            </div>
                            <div className="text-2xl font-bold text-foreground">{formatDuration(activity.movingTime)}</div>
                            <div className="text-xs text-foreground-muted">moving</div>
                        </div>
                        <div className="glass-card p-4 text-center">
                            <div className="text-foreground-muted text-xs uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                                <TrendingUp className="w-3 h-3" /> Pace
                            </div>
                            <div className="text-2xl font-bold text-foreground">{formatPace(activity.averageSpeed)}</div>
                            <div className="text-xs text-foreground-muted">avg</div>
                        </div>
                        <div className="glass-card p-4 text-center">
                            <div className="text-foreground-muted text-xs uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                                <Heart className="w-3 h-3" /> Heart Rate
                            </div>
                            <div className="text-2xl font-bold text-foreground">{activity.averageHr ? Math.round(activity.averageHr) : '-'}</div>
                            <div className="text-xs text-foreground-muted">bpm</div>
                        </div>
                        <div className="glass-card p-4 text-center">
                            <div className="text-foreground-muted text-xs uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                                <Zap className="w-3 h-3" /> Cadence
                            </div>
                            <div className="text-2xl font-bold text-foreground">{activity.averageCadence ? Math.round(activity.averageCadence) : '-'}</div>
                            <div className="text-xs text-foreground-muted">spm</div>
                        </div>
                    </div>

                    {/* Secondary Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        {/* Elevation Stats */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-widest border-b border-glass-border pb-2">Elevation</h3>
                            <div className="flex justify-between items-center">
                                <span className="text-foreground-muted">Total Gain</span>
                                <span className="text-foreground font-medium">{activity.totalElevation ? Math.round(activity.totalElevation) : 0} m</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-foreground-muted">High Point</span>
                                <span className="text-foreground font-medium">{activity.elevHigh ? Math.round(activity.elevHigh) : '-'} m</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-foreground-muted">Low Point</span>
                                <span className="text-foreground font-medium">{activity.elevLow ? Math.round(activity.elevLow) : '-'} m</span>
                            </div>
                            <div className="flex justify-between items-center border-t border-glass-border pt-2 mt-2">
                                <span className="text-foreground-muted">GAP</span>
                                <span className="text-accent-cyan font-medium">{formatPace(activity.gradeAdjustedSpeed)}</span>
                            </div>
                        </div>

                        {/* Training Load */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-widest border-b border-glass-border pb-2">Training Load</h3>
                            <div className="flex justify-between items-center">
                                <span className="text-foreground-muted">TRIMP</span>
                                <span className="text-accent-cyan font-medium">{activity.trimp ? activity.trimp.toFixed(0) : '-'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-foreground-muted">rTSS</span>
                                <span className="text-accent-orange font-medium">{activity.runningTss ? activity.runningTss.toFixed(0) : '-'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-foreground-muted">Intensity</span>
                                <span className="text-foreground font-medium">
                                    {(activity.averageHr && (userHrMax || activity.maxHr))
                                        ? `${Math.round((activity.averageHr / (userHrMax || activity.maxHr!)) * 100)}% HRmax`
                                        : '-'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center border-t border-glass-border pt-2 mt-2">
                                <span className="text-foreground-muted">Eff. VO2 Max</span>
                                <span className="text-accent-purple font-medium">{activity.estimatedVdot ? (activity.estimatedVdot * vdotCorrectionFactor).toFixed(1) : '-'}</span>
                            </div>
                        </div>

                        {/* Device / Other */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-widest border-b border-glass-border pb-2">Details</h3>
                            <div className="flex justify-between items-center">
                                <span className="text-foreground-muted">Calories</span>
                                <span className="text-foreground font-medium">{activity.calories ? Math.round(activity.calories) : '-'} kcal</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-foreground-muted">Cadence</span>
                                <span className="text-foreground font-medium">{activity.averageCadence ? Math.round(activity.averageCadence) : '-'} spm</span>
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
                            { name: 'Z1', label: 'Recovery', color: 'bg-green-400', textColor: 'text-green-400', time: activity.hrZone1Time || 0 },
                            { name: 'Z2', label: 'Aerobic', color: 'bg-lime-400', textColor: 'text-lime-400', time: activity.hrZone2Time || 0 },
                            { name: 'Z3', label: 'Tempo', color: 'bg-yellow-400', textColor: 'text-yellow-400', time: activity.hrZone3Time || 0 },
                            { name: 'Z4', label: 'Threshold', color: 'bg-orange-400', textColor: 'text-orange-400', time: activity.hrZone4Time || 0 },
                            { name: 'Z5', label: 'VO2max', color: 'bg-red-500', textColor: 'text-red-500', time: activity.hrZone5Time || 0 },
                            { name: 'Z6', label: 'Anaerobic', color: 'bg-indigo-500', textColor: 'text-indigo-500', time: activity.hrZone6Time || 0 },
                            { name: 'Z7', label: 'Neuromuscular', color: 'bg-purple-600', textColor: 'text-purple-600', time: activity.hrZone7Time || 0 }
                        ];
                        const total = zones.reduce((sum, z) => sum + z.time, 0);
                        const activeZones = zones.filter(z => z.time > 0);

                        if (total === 0) return null;

                        return (
                            <div className="mt-6 mb-8">
                                <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-widest border-b border-glass-border pb-2 mb-4">Heart Rate Zones</h3>

                                {/* Horizontal Bar Chart */}
                                <div className="flex h-10 rounded-lg overflow-hidden w-full bg-background-tertiary">
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
                                                    <span className="text-xs font-bold text-white drop-shadow-md">{zone.name}</span>
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
                                            <div key={i} className="flex items-center justify-between py-1.5 px-2 hover:bg-white/5 rounded text-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-3 h-3 rounded-xs ${zone.color}`} />
                                                    <span className={`font-medium ${zone.textColor}`}>{zone.name}</span>
                                                    <span className="text-foreground-muted text-xs">{zone.label}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-foreground font-mono text-xs">
                                                        {mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`}
                                                    </span>
                                                    <span className="text-foreground-muted text-xs w-10 text-right">
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

                    {/* Detailed Analysis Chart */}
                    <div className="mb-8">
                        <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-widest border-b border-glass-border pb-2 mb-4">Detailed Analysis</h3>
                        {isLoadingDetails ? (
                            <div className="h-[400px] flex items-center justify-center bg-background-tertiary rounded-xl border border-glass-border">
                                <div className="text-foreground-muted animate-pulse">Loading detailed analysis...</div>
                            </div>
                        ) : detailedActivity?.streams ? (
                            <InteractiveStreamsChart streams={detailedActivity.streams} />
                        ) : (
                            <div className="h-32 flex items-center justify-center bg-background-tertiary rounded-xl border border-glass-border">
                                <div className="text-foreground-muted italic">Detailed analysis data not available</div>
                            </div>
                        )}
                    </div>

                    {/* AI Coach Feedback Section */}
                    {aiFeedback ? (
                        <div className="mb-8">
                            <div className="flex items-center justify-between border-b border-glass-border pb-2 mb-4">
                                <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-widest flex items-center gap-2">
                                    <Bot className="w-4 h-4 text-accent-purple" />
                                    AI Coach Feedback
                                </h3>
                                <button
                                    onClick={handleGenerateFeedback}
                                    disabled={isGeneratingFeedback}
                                    className="text-xs text-accent-purple hover:text-accent-pink flex items-center gap-1 transition-colors disabled:opacity-50"
                                >
                                    {isGeneratingFeedback ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3"/>}
                                    {isGeneratingFeedback ? 'Regenerating...' : 'Regenerate'}
                                </button>
                            </div>
                            
                            {feedbackError && (
                                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-lg flex items-center justify-between">
                                    <span>{feedbackError}</span>
                                    <button onClick={() => setFeedbackError(null)} className="hover:bg-red-500/20 p-1 rounded transition-colors"><X className="w-4 h-4"/></button>
                                </div>
                            )}
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {aiFeedback.plannedComparison && (
                                    <div className="bg-background-tertiary p-4 rounded-xl border border-glass-border">
                                        <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-2">
                                            <Calendar className="w-3 h-3 text-accent-cyan" />
                                            Vs Planned Workout
                                        </h4>
                                        <div className="text-sm text-foreground-muted prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-a:text-accent-cyan hover:prose-a:text-accent-purple [&_details]:bg-black/20 [&_details]:p-3 [&_details]:rounded-lg [&_details_summary]:cursor-pointer [&_details_summary]:font-medium [&_details_summary]:mb-2 [&_details_summary]:text-accent-pink">
                                            <ReactMarkdown rehypePlugins={[rehypeRaw]}>{aiFeedback.plannedComparison}</ReactMarkdown>
                                        </div>
                                    </div>
                                )}
                                
                                {aiFeedback.progressAnalysis && (
                                    <div className="bg-background-tertiary p-4 rounded-xl border border-glass-border">
                                        <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-2">
                                            <TrendingUp className="w-3 h-3 text-accent-pink" />
                                            Progress & Execution
                                        </h4>
                                        <div className="text-sm text-foreground-muted prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-a:text-accent-cyan hover:prose-a:text-accent-purple [&_details]:bg-black/20 [&_details]:p-3 [&_details]:rounded-lg [&_details_summary]:cursor-pointer [&_details_summary]:font-medium [&_details_summary]:mb-2 [&_details_summary]:text-accent-pink">
                                            <ReactMarkdown rehypePlugins={[rehypeRaw]}>{aiFeedback.progressAnalysis}</ReactMarkdown>
                                        </div>
                                    </div>
                                )}
                                
                                {aiFeedback.goalTrajectory && (
                                    <div className="bg-background-tertiary p-4 rounded-xl border border-glass-border md:col-span-2">
                                        <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-2">
                                            <Heart className="w-3 h-3 text-accent-purple" />
                                            Goal Trajectory
                                        </h4>
                                        <div className="text-sm text-foreground-muted prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-a:text-accent-cyan hover:prose-a:text-accent-purple [&_details]:bg-black/20 [&_details]:p-3 [&_details]:rounded-lg [&_details_summary]:cursor-pointer [&_details_summary]:font-medium [&_details_summary]:mb-2 [&_details_summary]:text-accent-pink">
                                            <ReactMarkdown rehypePlugins={[rehypeRaw]}>{aiFeedback.goalTrajectory}</ReactMarkdown>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="mb-8">
                            <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-widest flex items-center gap-2 border-b border-glass-border pb-2 mb-4">
                                <Bot className="w-4 h-4 text-accent-purple" />
                                AI Coach Feedback
                            </h3>
                            
                            {feedbackError ? (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 flex flex-col items-center justify-center text-center">
                                    <div className="text-red-500 mb-3"><X className="w-10 h-10 opacity-70" /></div>
                                    <p className="text-sm text-foreground mb-4 font-medium">{feedbackError}</p>
                                    <button
                                        onClick={handleGenerateFeedback}
                                        disabled={isGeneratingFeedback || isLoadingFeedback}
                                        className="px-4 py-2 bg-background border border-glass-border hover:bg-surface-hover rounded-lg text-sm text-foreground font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {isGeneratingFeedback ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4 text-accent-purple"/>}
                                        {isGeneratingFeedback ? 'Trying again...' : 'Try Again'}
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-gradient-to-r from-accent-purple/5 to-accent-pink/5 border border-glass-border rounded-xl p-6 flex flex-col items-center justify-center text-center">
                                    <Bot className="w-10 h-10 text-foreground-muted mb-3 opacity-50" />
                                    <p className="text-sm text-foreground mb-4">Get personalized analysis comparing this run to your planned workout and goals.</p>
                                    <button
                                        onClick={handleGenerateFeedback}
                                        disabled={isGeneratingFeedback || isLoadingFeedback}
                                        className="px-4 py-2 bg-background-secondary hover:bg-surface-hover border border-glass-border rounded-lg text-sm text-foreground font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {isGeneratingFeedback ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4 text-accent-purple"/>}
                                        {isGeneratingFeedback ? 'Generating Analysis...' : isLoadingFeedback ? 'Checking...' : 'Generate AI Analysis'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
