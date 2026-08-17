'use client';

import { Star, Footprints, Waves, Bike, Calendar, Clock } from 'lucide-react';
import type { Goal } from '../Progression/types';
import { PRIORITY_CONFIG } from '../Progression/types';

interface EventCardProps {
    goal: Goal;
    isExpanded: boolean;
    onToggle: () => void;
}

const SPORT_ICONS: Record<string, { icon: typeof Footprints; label: string }> = {
    RUNNING: { icon: Footprints, label: 'Run' },
    TRIATHLON: { icon: Waves, label: 'Tri' },
    CYCLING: { icon: Bike, label: 'Bike' },
    SWIMMING: { icon: Waves, label: 'Swim' },
};

function getWeeksUntil(dateStr: string | null): number | null {
    if (!dateStr) return null;
    const eventDate = new Date(dateStr);
    const now = new Date();
    const diffMs = eventDate.getTime() - now.getTime();
    const diffWeeks = Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000));
    return diffWeeks > 0 ? diffWeeks : 0;
}

function formatDate(dateStr: string | null): string {
    if (!dateStr) return 'No date';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function EventCard({ goal, isExpanded, onToggle }: EventCardProps) {
    const priorityConfig = PRIORITY_CONFIG[goal.priority] || PRIORITY_CONFIG.SECONDARY;
    const sportConfig = SPORT_ICONS[goal.sport] || SPORT_ICONS.RUNNING;
    const SportIcon = sportConfig.icon;
    const weeksUntil = getWeeksUntil(goal.raceDate);

    return (
        <button
            type="button"
            onClick={onToggle}
            className="w-full text-left"
        >
            <div className="flex items-center gap-2">
                {goal.priority === 'PRIMARY' && (
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 shrink-0" />
                )}
                <span className="text-xs text-foreground font-medium truncate">{goal.name}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border shrink-0 ${priorityConfig.color}`}>
                    {priorityConfig.label}
                </span>
                <SportIcon className="w-3 h-3 text-foreground-muted shrink-0 ml-auto" />
            </div>

            {isExpanded && (
                <div className="mt-1.5 ml-5 space-y-0.5">
                    <div className="flex items-center gap-2 text-[10px] text-foreground-muted">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(goal.raceDate)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-foreground-muted">
                        <Clock className="w-3 h-3" />
                        <span>
                            {weeksUntil !== null
                                ? `${weeksUntil} week${weeksUntil !== 1 ? 's' : ''} away`
                                : 'No date set'}
                        </span>
                    </div>
                    {goal.raceType && (
                        <div className="text-[10px] text-foreground-muted">
                            {goal.raceType}
                        </div>
                    )}
                </div>
            )}
        </button>
    );
}
