'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2 } from 'lucide-react';
import { EventCard } from './EventCard';
import type { Goal } from '../Progression/types';

interface EventsPanelProps {
    goals: Goal[];
    onAddSubGoal: () => void;
    onEditSubGoal: (id: string) => void;
    onRemoveSubGoal: (id: string) => void;
}

export function EventsPanel({ goals, onAddSubGoal, onEditSubGoal, onRemoveSubGoal }: EventsPanelProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const primaryGoal = goals.find((g) => g.priority === 'PRIMARY');
    const subGoals = goals.filter((g) => g.priority !== 'PRIMARY');

    if (goals.length === 0) return null;

    return (
        <div className="border-b border-glass-border">
            <div className="px-4 py-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">Events</span>
                        <span className="text-[10px] text-foreground-muted">{goals.length}</span>
                    </div>
                    <button
                        type="button"
                        onClick={onAddSubGoal}
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-foreground-muted hover:text-foreground-secondary hover:bg-background-tertiary transition-colors"
                    >
                        <Plus className="w-3 h-3" />
                        Add Event
                    </button>
                </div>
            </div>

            <div className="px-4 pb-2 space-y-1">
                {primaryGoal && (
                    <div>
                        <button
                            type="button"
                            onClick={() => setExpandedId(expandedId === primaryGoal.id ? null : primaryGoal.id)}
                            className="flex items-center gap-1 w-full text-left"
                        >
                            {expandedId === primaryGoal.id ? (
                                <ChevronDown className="w-3 h-3 text-foreground-muted" />
                            ) : (
                                <ChevronRight className="w-3 h-3 text-foreground-muted" />
                            )}
                        </button>
                        <EventCard
                            goal={primaryGoal}
                            isExpanded={expandedId === primaryGoal.id}
                            onToggle={() => setExpandedId(expandedId === primaryGoal.id ? null : primaryGoal.id)}
                        />
                    </div>
                )}

                {subGoals.map((goal) => (
                    <div key={goal.id}>
                        <button
                            type="button"
                            onClick={() => setExpandedId(expandedId === goal.id ? null : goal.id)}
                            className="flex items-center gap-1 w-full text-left"
                        >
                            {expandedId === goal.id ? (
                                <ChevronDown className="w-3 h-3 text-foreground-muted" />
                            ) : (
                                <ChevronRight className="w-3 h-3 text-foreground-muted" />
                            )}
                        </button>
                        <div className="flex items-center gap-1">
                            <div className="flex-1">
                                <EventCard
                                    goal={goal}
                                    isExpanded={expandedId === goal.id}
                                    onToggle={() => setExpandedId(expandedId === goal.id ? null : goal.id)}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => onEditSubGoal(goal.id)}
                                className="p-1 text-foreground-muted hover:text-foreground-secondary transition-colors"
                            >
                                <Pencil className="w-3 h-3" />
                            </button>
                            <button
                                type="button"
                                onClick={() => onRemoveSubGoal(goal.id)}
                                className="p-1 text-foreground-muted hover:text-red-400 transition-colors"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
