'use client';

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Activity, Check, Loader2 } from 'lucide-react';

interface ActivityPickerProps {
    selectedId: string | null;
    onSelect: (_activityId: string | null) => void;
}

interface RecentActivity {
    id: string;
    name: string;
    startDate: string;
    distance: number;
    movingTime: number;
    type: string;
    isLinked?: boolean;
}

function formatPace(distanceMeters: number, timeSeconds: number): string {
    if (distanceMeters <= 0 || timeSeconds <= 0) return '-';
    const paceSecsPerKm = timeSeconds / (distanceMeters / 1000);
    const mins = Math.floor(paceSecsPerKm / 60);
    const secs = Math.round(paceSecsPerKm % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}/km`;
}

function formatDuration(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
}

export default function ActivityPicker({ selectedId, onSelect }: ActivityPickerProps) {
    const { data, isLoading, error } = useQuery({
        queryKey: ['recent-activities'],
        queryFn: async () => {
            const res = await fetch('/api/activities?limit=7');
            if (!res.ok) throw new Error('Failed to fetch activities');
            return res.json();
        },
        staleTime: 30000, // Cache for 30 seconds
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Loading activities...
            </div>
        );
    }

    if (error || !data?.activities?.length) {
        return (
            <div className="text-center py-6 text-gray-500">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No recent activities found</p>
            </div>
        );
    }

    // Filter out linked activities, unless it's the currently selected one
    const activities: RecentActivity[] = data.activities.filter((a: RecentActivity) =>
        !a.isLinked || a.id === selectedId
    );

    return (
        <div className="space-y-2">
            <label className="block text-xs text-gray-400 mb-2 uppercase">
                Link to Activity (optional)
            </label>

            {/* Skip option */}
            <button
                type="button"
                onClick={() => onSelect(null)}
                className={`w-full p-3 rounded-lg border text-left transition-all ${selectedId === null
                    ? 'border-accent-orange bg-accent-orange/10'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
            >
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedId === null ? 'bg-accent-orange/20 text-accent-orange' : 'bg-white/10 text-gray-400'
                        }`}>
                        <Check className="w-4 h-4" />
                    </div>
                    <div>
                        <p className={`text-sm font-medium ${selectedId === null ? 'text-accent-orange' : 'text-white'}`}>
                            Skip - Mark complete without linking
                        </p>
                    </div>
                </div>
            </button>

            {/* Activity list */}
            {activities.map((activity) => (
                <button
                    key={activity.id}
                    type="button"
                    onClick={() => onSelect(activity.id)}
                    className={`w-full p-3 rounded-lg border text-left transition-all ${selectedId === activity.id
                        ? 'border-accent-orange bg-accent-orange/10'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                        }`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedId === activity.id ? 'bg-accent-orange/20 text-accent-orange' : 'bg-white/10 text-gray-400'
                            }`}>
                            <Activity className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${selectedId === activity.id ? 'text-accent-orange' : 'text-white'}`}>
                                {activity.name}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-gray-400">
                                <span>{format(new Date(activity.startDate), 'MMM d')}</span>
                                <span>{(activity.distance / 1000).toFixed(1)} km</span>
                                <span>{formatDuration(activity.movingTime)}</span>
                                <span>{formatPace(activity.distance, activity.movingTime)}</span>
                            </div>
                        </div>
                        {selectedId === activity.id && (
                            <Check className="w-5 h-5 text-accent-orange shrink-0" />
                        )}
                    </div>
                </button>
            ))}
        </div>
    );
}
