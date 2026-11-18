'use client';

import { X, Calendar, TrendingUp, Activity as ActivityIcon, Heart, Zap, BarChart2, Tag, Edit2, Check, MessageSquare, Loader2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import type { ActivityListItem, WorkoutType, Activity } from '@/lib/types';
import InteractiveStreamsChart from './InteractiveStreamsChart';
import ActivityRoute from './ActivityRoute';
import { useActivityPowerMetrics } from './activity-details/useActivityPowerMetrics';
import ActivityStatsAndZonesSection from './activity-details/ActivityStatsAndZonesSection';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import DOMPurify from 'dompurify';

export function getDisplayActivityName(activity: {
    name?: string | null;
    type?: string | null;
    trainingType?: string | null;
    startDate?: string | Date | null;
}): string {
    if (activity.name && activity.name.trim().length > 0) {
        return activity.name.trim();
    }
    const d = activity.startDate ? new Date(activity.startDate) : new Date();
    const hour = !isNaN(d.getTime()) ? d.getHours() : 12;
    let timeOfDay = 'Morning';
    if (hour >= 12 && hour < 17) {
        timeOfDay = 'Afternoon';
    } else if (hour >= 17 && hour < 21) {
        timeOfDay = 'Evening';
    } else if (hour >= 21 || hour < 5) {
        timeOfDay = 'Night';
    }

    const type = (activity.type || '').toUpperCase();
    const trainingType = (activity.trainingType || '').toUpperCase();

    let sport = 'Activity';
    if (type === 'VIRTUAL_RIDE') {
        sport = 'Virtual Ride';
    } else if (type === 'RIDE') {
        sport = 'Ride';
    } else if (type === 'RUN') {
        sport = 'Run';
    } else if (type === 'SWIM') {
        sport = 'Swim';
    } else if (type === 'HIKE') {
        sport = 'Hike';
    } else if (type === 'WALK') {
        sport = 'Walk';
    } else if (type === 'WORKOUT' || trainingType === 'STRENGTH') {
        sport = 'Strength Session';
    } else if (type) {
        sport = type.charAt(0) + type.slice(1).toLowerCase();
    }

    return `${timeOfDay} ${sport}`;
}

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
    const [cyclingSettings, setCyclingSettings] = useState<{ weightKg: number | null; ftpWatts: number | null } | null>(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(true);
    const [detailsError, setDetailsError] = useState<string | null>(null);
    const [detailsReloadKey, setDetailsReloadKey] = useState(0);
    const [aiFeedback, setAiFeedback] = useState<any>(null);
    const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
    const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
    const [feedbackError, setFeedbackError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        setMounted(true);
        if (activity) {
            setTrainingType(activity.trainingType || 'EASY');
            setName(getDisplayActivityName(activity));
            setAiFeedback(null);
            setIsLoadingFeedback(false);
            setIsGeneratingFeedback(false);
            setFeedbackError(null);
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden';

            const fetchCyclingSettings = async () => {
                try {
                    const res = await fetch('/api/settings/cycling');
                    if (res.ok) {
                        const data = await res.json();
                        setCyclingSettings({
                            weightKg: data.weightKg ?? null,
                            ftpWatts: data.ftpWatts ?? data.eFtpWatts ?? null,
                        });
                    }
                } catch (error) {
                    console.error('Failed to fetch cycling settings:', error);
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
            
            fetchCyclingSettings();
            fetchFeedback();
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [activity]);

    // Details retry is isolated so an in-progress name or type edit stays intact.
    useEffect(() => {
        const controller = new AbortController();
        setDetailedActivity(null);
        setDetailsError(null);
        if (!activity) {
            setIsLoadingDetails(false);
            return () => controller.abort();
        }
        const fetchDetails = async () => {
            setIsLoadingDetails(true);
            try {
                const res = await fetch(`/api/activities/${activity.id}`, { signal: controller.signal });
                if (!res.ok) throw new Error('Failed to load activity details');
                const data = await res.json();
                if (!controller.signal.aborted) setDetailedActivity(data);
            } catch (error) {
                if (!controller.signal.aborted) {
                    setDetailsError('Could not load GPS route. Please try again.');
                    console.error('Failed to fetch activity details:', error);
                }
            } finally {
                if (!controller.signal.aborted) setIsLoadingDetails(false);
            }
        };
        fetchDetails();
        return () => controller.abort();
    }, [activity, detailsReloadKey]);

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

    const formatFeedbackError = useCallback(
        (
            rawMessage: unknown,
            fallback: string,
            retryAfterSeconds?: unknown,
            retryAfterHeader?: string | null
        ): string => {
            const cleaned = typeof rawMessage === 'string'
                ? rawMessage.replace(/^(?:[A-Za-z]*Error:\s*)+/i, '').trim()
                : '';
            const base = cleaned || fallback;
            const rawRetry = retryAfterSeconds ?? retryAfterHeader;
            const seconds = typeof rawRetry === 'number'
                ? rawRetry
                : typeof rawRetry === 'string' && rawRetry.trim()
                    ? Number(rawRetry)
                    : NaN;
            if (Number.isFinite(seconds) && seconds > 0 && !/\b\d+\s*s(?:ec(?:ond)?s?)?\b/i.test(base)) {
                const ceil = Math.ceil(seconds);
                return /[.!?]$/.test(base) ? `${base} Try again in ${ceil}s.` : `${base} (Try again in ${ceil}s)`;
            }
            return base;
        },
        []
    );

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
                    setFeedbackError(formatFeedbackError(data.error, 'Failed to generate AI feedback'));
                } else if (data.queued) {
                    setFeedbackError(
                        formatFeedbackError(
                            data.message,
                            'Your feedback has been queued and will appear shortly.'
                        )
                    );
                }
            } else {
                const errorData = await res.json().catch(() => null);
                const retryHeader = res.headers?.get?.('retry-after');
                if (res.status === 429) {
                    if (errorData?.queued) {
                        setFeedbackError(
                            formatFeedbackError(
                                errorData.message || errorData.error,
                                'Server rate limited. Your feedback is being prepared and will appear shortly.'
                            )
                        );
                    } else {
                        setFeedbackError(
                            formatFeedbackError(
                                errorData?.error,
                                'Quota exhausted. Please upgrade your plan or contact your administrator.',
                                errorData?.retryAfterSeconds ?? errorData?.retryAfter,
                                retryHeader
                            )
                        );
                    }
                } else {
                    setFeedbackError(
                        formatFeedbackError(
                            errorData?.error,
                            'Failed to generate AI feedback',
                            errorData?.retryAfterSeconds ?? errorData?.retryAfter,
                            retryHeader
                        )
                    );
                }
            }
        } catch (error) {
            console.error('Failed to generate AI feedback:', error);
            setFeedbackError('An error occurred while generating AI feedback.');
        } finally {
            setIsGeneratingFeedback(false);
        }
    }, [activity, formatFeedbackError]);

    const isRide = Boolean(
        activity &&
        (activity.type === 'RIDE' ||
         (activity as any).type === 'VIRTUAL_RIDE' ||
         (activity as any).sportType?.toLowerCase().includes('ride'))
    );

    const { powerMetrics, powerStreamData } = useActivityPowerMetrics({
        activity,
        detailedActivity,
        cyclingSettings,
        name,
        userHrMax,
    });

    // Early return AFTER all hooks have been called
    if (!isOpen || !activity || !mounted) return null;

    const WORKOUT_TYPES: WorkoutType[] = [
        'EASY', 'LONG_RUN', 'TEMPO', 'INTERVALS', 'FARTLEK', 'REPETITIONS', 'RECOVERY', 'RACE', 'REST'
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/[var(--modal-backdrop-opacity)] animate-fade-in">
            <div className="relative w-full max-w-2xl bg-background border border-line rounded-md overflow-hidden animate-slide-in max-h-[90vh] flex flex-col" role="dialog" aria-modal="true" aria-labelledby="activity-title">
                {/* Header */}
                <div className="relative p-6 border-b border-line bg-background-secondary shrink-0">
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 p-2 text-foreground-muted hover:text-foreground hover:bg-surface-hover rounded-md transition-colors"
                        aria-label="Close activity details"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex items-start gap-4 pr-10">
                        <div className={`w-12 h-12 rounded-md ${isRide ? 'bg-accent-orange/15' : 'bg-accent-orange/15'} flex items-center justify-center`}>
                            {activity.type === 'RUN' ? <ActivityIcon className="w-6 h-6 text-accent-orange" /> :
                                isRide ? <Zap className="w-6 h-6 text-accent-orange" /> :
                                    <ActivityIcon className="w-6 h-6 text-accent-orange" />}
                        </div>
                        <div>
                            {isEditingName ? (
                                <div className="flex items-center gap-2 mb-1">
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="text-xl font-bold text-foreground bg-background-secondary border border-line rounded-md px-2 py-1 focus:outline-hidden focus:border-accent-orange w-full"
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
                                        className="p-1.5 bg-positive/10 text-positive hover:bg-positive/20 rounded-md transition-colors"
                                        aria-label="Save activity name"
                                    >
                                        <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsEditingName(false);
                                            setName(getDisplayActivityName(activity));
                                        }}
                                        className="p-1.5 hover:bg-surface-hover text-foreground-muted hover:text-foreground rounded-md transition-colors"
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
                                        className="p-1 text-foreground-muted opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 hover:text-foreground transition-all"
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
                            className="flex items-center gap-2 px-4 py-2 bg-accent-orange hover:bg-accent-orange/90 rounded-md text-white font-medium transition-colors"
                        >
                            <BarChart2 className="w-4 h-4" />
                            Analyse
                        </Link>

                        <div className="relative group">
                            <div className="flex items-center gap-2 px-3 py-2 bg-background-tertiary hover:bg-background-secondary rounded-md border border-line transition-colors cursor-pointer">
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
                        <div className="mb-8 bg-background-tertiary rounded-md p-4 border border-line">
                            <p className="text-foreground italic">&quot;{activity.description}&quot;</p>
                        </div>
                    )}

                    <ActivityStatsAndZonesSection
                        activity={activity}
                        isRide={isRide}
                        powerMetrics={powerMetrics}
                        powerStreamData={powerStreamData}
                        ftpWatts={cyclingSettings?.ftpWatts}
                        userHrMax={userHrMax}
                        vdotCorrectionFactor={vdotCorrectionFactor}
                        formatDuration={formatDuration}
                        formatPace={formatPace}
                    />

                    <ActivityRoute loading={isLoadingDetails} error={detailsError} onRetry={() => setDetailsReloadKey(key => key + 1)} latlng={detailedActivity?.id === activity.id ? detailedActivity.streams?.latlng : undefined} />

                    {/* Detailed Analysis Chart */}
                    <div className="mb-8">
                        <h3 className="text-sm font-semibold text-foreground-muted border-b border-line pb-2 mb-4">Detailed Analysis</h3>
                        {isLoadingDetails ? (
                            <div className="h-[400px] flex items-center justify-center bg-background-tertiary rounded-md border border-line">
                                <div className="text-foreground-muted">Loading detailed analysis...</div>
                            </div>
                        ) : detailedActivity?.streams ? (
                            <InteractiveStreamsChart streams={detailedActivity.streams} activityType={activity.type} />
                        ) : (
                            <div className="h-32 flex items-center justify-center bg-background-tertiary rounded-md border border-line">
                                <div className="text-foreground-muted italic">Detailed analysis data not available</div>
                            </div>
                        )}
                    </div>

                    {/* AI Coach Feedback Section */}
                    {aiFeedback ? (
                        <div className="mb-8">
                            <div className="flex items-center justify-between border-b border-line pb-2 mb-4">
                                <h3 className="text-sm font-semibold text-foreground-muted flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4 text-accent-orange" />
                                    AI Coach Feedback
                                </h3>
                                <button
                                    onClick={handleGenerateFeedback}
                                    disabled={isGeneratingFeedback}
                                    className="text-xs text-accent-orange hover:text-accent-orange flex items-center gap-1 transition-colors disabled:opacity-50"
                                >
                                    {isGeneratingFeedback ? <Loader2 className="w-3 h-3 animate-spin"/> : <RefreshCw className="w-3 h-3"/>}
                                    {isGeneratingFeedback ? 'Regenerating...' : 'Regenerate'}
                                </button>
                            </div>

                            {feedbackError && (
                                <div className="mb-4 p-3 bg-negative/10 border border-negative/20 text-negative text-sm rounded-md flex items-center justify-between">
                                    <span>{feedbackError}</span>
                                    <button onClick={() => setFeedbackError(null)} className="hover:bg-negative/20 p-1 rounded-md transition-colors"><X className="w-4 h-4"/></button>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {(aiFeedback.plannedComparison || (!aiFeedback.progressAnalysis && !aiFeedback.goalTrajectory)) && (
                                    <div className="bg-background-tertiary p-4 rounded-md border border-line">
                                        <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-2">
                                            <Calendar className="w-3 h-3 text-positive" />
                                            {aiFeedback.plannedComparison ? 'Vs Planned Workout' : 'Coach Analysis'}
                                        </h4>
                                        <div className="text-sm text-foreground-muted prose dark:prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-a:text-positive hover:prose-a:text-accent-orange [\[&_details]:bg-foreground/10_details]:bg-foreground/10 [&_details]:p-3 [&_details]:rounded-md [&_details_summary]:cursor-pointer [&_details_summary]:font-medium [&_details_summary]:mb-2 [&_details_summary]:text-accent-orange">
                                            <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeSanitize]}>
                                                {DOMPurify.sanitize(aiFeedback.plannedComparison || aiFeedback.progressAnalysis || aiFeedback.goalTrajectory || 'No detailed analysis available.')}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                )}

                                {aiFeedback.progressAnalysis && (aiFeedback.plannedComparison || aiFeedback.goalTrajectory) && (
                                    <div className="bg-background-tertiary p-4 rounded-md border border-line">
                                        <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-2">
                                            <TrendingUp className="w-3 h-3 text-positive" />
                                            Progress & Execution
                                        </h4>
                                        <div className="text-sm text-foreground-muted prose dark:prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-a:text-positive hover:prose-a:text-accent-orange [\[&_details]:bg-foreground/10_details]:bg-foreground/10 [&_details]:p-3 [&_details]:rounded-md [&_details_summary]:cursor-pointer [&_details_summary]:font-medium [&_details_summary]:mb-2 [&_details_summary]:text-accent-orange">
                                            <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeSanitize]}>
                                                {DOMPurify.sanitize(aiFeedback.progressAnalysis)}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                )}

                                {aiFeedback.goalTrajectory && (
                                    <div className={`bg-background-tertiary p-4 rounded-md border border-line ${(aiFeedback.plannedComparison || aiFeedback.progressAnalysis) ? 'md:col-span-1' : 'md:col-span-2'}`}>
                                        <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-2">
                                            <Heart className="w-3 h-3 text-accent-orange" />
                                            Goal Trajectory
                                        </h4>
                                        <div className="text-sm text-foreground-muted prose dark:prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-a:text-positive hover:prose-a:text-accent-orange [\[&_details]:bg-foreground/10_details]:bg-foreground/10 [&_details]:p-3 [&_details]:rounded-md [&_details_summary]:cursor-pointer [&_details_summary]:font-medium [&_details_summary]:mb-2 [&_details_summary]:text-accent-orange">
                                            <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeSanitize]}>
                                                {DOMPurify.sanitize(aiFeedback.goalTrajectory)}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="mb-8">
                            <h3 className="text-sm font-semibold text-foreground-muted flex items-center gap-2 border-b border-line pb-2 mb-4">
                                <MessageSquare className="w-4 h-4 text-accent-orange" />
                                AI Coach Feedback
                            </h3>

                            {feedbackError ? (
                                <div className="bg-negative/10 border border-negative/20 rounded-md p-6 flex flex-col items-center justify-center text-center">
                                    <div className="text-negative mb-3"><X className="w-10 h-10 opacity-70" /></div>
                                    <p className="text-sm text-foreground mb-4 font-medium">{feedbackError}</p>
                                    <button
                                        onClick={handleGenerateFeedback}
                                        disabled={isGeneratingFeedback || isLoadingFeedback}
                                        className="px-4 py-2 bg-background border border-line hover:bg-surface-hover rounded-md text-sm text-foreground font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {isGeneratingFeedback ? <Loader2 className="w-4 h-4 animate-spin"/> : <RefreshCw className="w-4 h-4 text-accent-orange"/>}
                                        {isGeneratingFeedback ? 'Trying again...' : 'Try Again'}
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-background-tertiary border border-line rounded-md p-6 flex flex-col items-center justify-center text-center">
                                    <MessageSquare className="w-10 h-10 text-foreground-muted mb-3 opacity-50" />
                                    <p className="text-sm text-foreground mb-4">Get personalized analysis comparing this run to your planned workout and goals.</p>
                                    <button
                                        onClick={handleGenerateFeedback}
                                        disabled={isGeneratingFeedback || isLoadingFeedback}
                                        className="px-4 py-2 bg-background-secondary hover:bg-surface-hover border border-line rounded-md text-sm text-foreground font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {isGeneratingFeedback ? <Loader2 className="w-4 h-4 animate-spin"/> : <ActivityIcon className="w-4 h-4 text-accent-orange"/>}
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
