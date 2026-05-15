import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { GripVertical, Check, Settings } from 'lucide-react';
import { WorkoutWithLinkedActivity, ActivityListItem } from '@/lib/types';
import { workoutStyles, formatPace } from '@/lib/plan/utils';

interface DraggableWorkoutProps {
    workout: WorkoutWithLinkedActivity;
    isTodayItem: boolean;
    onClick: (_workout: WorkoutWithLinkedActivity) => void;
    onComplete: (_workout: WorkoutWithLinkedActivity, _e: React.MouseEvent) => void;
    onActivityClick: (_activity: ActivityListItem, _e: React.MouseEvent) => void;
}

export function DraggableWorkout({
    workout,
    isTodayItem,
    onClick,
    onComplete,
    onActivityClick
}: DraggableWorkoutProps) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: workout.id,
    });

    const style = workoutStyles[workout.workoutType] || workoutStyles.EASY;
    const Icon = style.icon;
    const linkedActivity = workout.linkedActivity;
    const isSwim = workout.workoutType === 'SWIM';

    const dragStyle = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
        opacity: 0.9,
    } : undefined;

    // Simple inline functions - they only exist during render and don't cause re-renders
    const handleClick = () => onClick(workout);
    const handleComplete = (e: React.MouseEvent) => onComplete(workout, e);
    const handleActivityClick = (e: React.MouseEvent) => {
        if (linkedActivity) {
            onActivityClick(linkedActivity, e);
        }
    };

    if (isDragging) {
        return (
            <div ref={setNodeRef} style={dragStyle} className="bg-surface p-4 rounded-lg shadow-xl border border-glass-border flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-background-tertiary ${style.color}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <h4 className="font-medium text-foreground">{style.label}</h4>
                </div>
            </div>
        )
    }

    return (
        <div
            ref={setNodeRef}
            style={dragStyle}
            className={`group p-3 rounded-lg flex items-center gap-3 hover:bg-surface-hover transition-colors border border-transparent select-none ${isDragging ? 'opacity-0' : ''} ${isTodayItem ? 'bg-accent-orange/5 border-accent-orange/20' : 'bg-surface'}`}
        >
            <div className="cursor-grab touch-none text-foreground-muted hover:text-foreground p-2 -m-2 opacity-50 hover:opacity-100 transition-opacity" {...listeners} {...attributes}>
                <GripVertical className="w-4 h-4" />
            </div>

            <div
                className={`w-8 h-8 rounded-full flex items-center justify-center bg-background-tertiary ${style.color} cursor-pointer`}
                onClick={handleClick}
            >
                <Icon className="w-4 h-4" />
            </div>

            <div className="flex-1 cursor-pointer min-w-0" onClick={handleClick}>
                <div className="flex items-center justify-between">
                    <h4 className={`text-sm font-medium truncate ${workout.isCompleted ? 'text-foreground-muted line-through' : 'text-foreground'}`}>
                        {style.label}
                    </h4>
                    <div className="flex items-center gap-2">
                        {(workout.targetDistance ?? 0) > 0 && (
                            <span className="text-xs text-foreground-muted whitespace-nowrap">
                                {isSwim
                                    ? `${workout.targetDistance}m`
                                    : `${((workout.targetDistance ?? 0) / 1000).toFixed(1)}k`
                                }
                            </span>
                        )}
                        {!workout.isCompleted && (
                            <button
                                onClick={handleComplete}
                                className="p-1 hover:bg-green-500/20 text-foreground-muted hover:text-green-400 rounded transition-colors"
                                title="Mark as Complete"
                            >
                                <Check className="w-4 h-4" />
                            </button>
                        )}
                        <Settings className="w-3 h-3 text-foreground-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                </div>
                <p className="text-xs text-foreground-muted truncate">{workout.displayDesc || workout.description}</p>

                {/* Linked Activity Data */}
                {linkedActivity && (
                    <div
                        className="mt-2 pt-2 border-t border-glass-border cursor-pointer hover:bg-surface-hover transition-colors rounded -mx-1 px-1"
                        onClick={handleActivityClick}
                    >
                        <p className="text-xs text-green-400 truncate font-medium flex items-center gap-1">
                            <Check className="w-3 h-3" /> {linkedActivity.name}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-foreground-muted mt-1">
                            <span>{(linkedActivity.distance / 1000).toFixed(1)} km</span>
                            <span>{Math.floor(linkedActivity.movingTime / 60)}m</span>
                            <span>{formatPace(linkedActivity.distance, linkedActivity.movingTime)}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
