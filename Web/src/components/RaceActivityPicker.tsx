'use client';

import { useQuery } from '@tanstack/react-query';
import { format, subDays, addDays } from 'date-fns';
import { Activity, Check, Loader2, Search } from 'lucide-react';
import { useState } from 'react';
import { formatDistanceWithUnit, formatElevationWithUnit, formatPace, useUnits } from '@/lib/units';

interface RaceActivityPickerProps {
    raceDate: string | Date;
    selectedId: string | null;
    onSelect: (_activityId: string | null) => void;
}

interface RaceActivity {
    id: string;
    name: string;
    startDate: string;
    distance: number;
    movingTime: number;
    averageSpeed: number | null;
    averageHr: number | null;
    totalElevation: number | null;
}

function formatDuration(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
}

export default function RaceActivityPicker({ raceDate, selectedId, onSelect }: RaceActivityPickerProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const { useImperial } = useUnits();

    const raceDateObj = typeof raceDate === 'string' ? new Date(raceDate) : raceDate;
    const fromDate = subDays(raceDateObj, 7);
    const toDate = addDays(raceDateObj, 7);

    const { data, isLoading } = useQuery({
        queryKey: ['race-activities', raceDate],
        queryFn: async () => {
            const params = new URLSearchParams({
                type: 'RUN',
                fromDate: format(fromDate, 'yyyy-MM-dd'),
                toDate: format(toDate, 'yyyy-MM-dd'),
                limit: '50',
            });
            const res = await fetch(`/api/activities?${params}`);
            if (!res.ok) throw new Error('Failed to fetch activities');
            return res.json();
        },
        staleTime: 30000,
    });

    const activities: RaceActivity[] = (data?.activities || []).filter(
        (a: RaceActivity) => a.distance >= 3000
    );

    const filtered = searchQuery
        ? activities.filter((a: RaceActivity) =>
            a.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : activities;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8 text-foreground-muted">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Loading runs near your race date...
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <label className="block text-xs text-foreground-muted mb-2 uppercase">
                Select your race run ({format(fromDate, 'MMM d')} - {format(toDate, 'MMM d')})
            </label>

            <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
                <input
                    type="text"
                    placeholder="Search by name..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-foreground/5 border border-foreground/10 rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder-foreground-muted outline-hidden focus:ring-2 focus:ring-accent-orange transition-all"
                />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2">
                {filtered.length === 0 ? (
                    <div className="text-center py-6 text-foreground-muted">
                        <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No runs found near your race date</p>
                    </div>
                ) : (
                    filtered.map((activity: RaceActivity) => (
                        <button
                            key={activity.id}
                            type="button"
                            onClick={() => onSelect(activity.id)}
                            className={`w-full p-3 rounded-lg border text-left transition-all ${selectedId === activity.id
                                    ? 'border-accent-orange bg-accent-orange/10'
                                    : 'border-foreground/10 bg-foreground/5 hover:bg-foreground/10'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedId === activity.id ? 'bg-accent-orange/20 text-accent-orange' : 'bg-foreground/10 text-foreground-muted'
                                    }`}>
                                    {selectedId === activity.id
                                        ? <Check className="w-4 h-4" />
                                        : <Activity className="w-4 h-4" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium truncate ${selectedId === activity.id ? 'text-accent-orange' : 'text-foreground'}`}>
                                        {activity.name}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-foreground-muted">
                                        <span>{format(new Date(activity.startDate), 'MMM d, yyyy')}</span>
                                        <span>{formatDistanceWithUnit(activity.distance, useImperial, 1)}</span>
                                        <span>{formatDuration(activity.movingTime)}</span>
                                        <span>{formatPace(activity.movingTime / (activity.distance / 1000), useImperial)}</span>
                                        {activity.averageHr && <span>{Math.round(activity.averageHr)} bpm</span>}
                                        {activity.totalElevation && activity.totalElevation > 0 && (
                                            <span>{formatElevationWithUnit(activity.totalElevation, useImperial)} elev</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}
