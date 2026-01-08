import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { GripVertical, Check, Settings } from 'lucide-react';
import { WorkoutWithLinkedActivity } from '@/lib/types';
import { workoutStyles, formatPace } from '@/lib/plan/utils';

interface DraggableWorkoutProps {
    workout: WorkoutWithLinkedActivity;
    isTodayItem: boolean;
    onClick: () => void;
    onComplete: (e: React.MouseEvent) => void;
    onActivityClick: (activity: NonNullable<WorkoutWithLinkedActivity['linkedActivity']>, e: React.MouseEvent) => void;
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
        data: { workout },
    });

    const style = workoutStyles[workout.workoutType] || workoutStyles.EASY;
    const Icon = style.icon;
    const linkedActivity = workout.linkedActivity;

    const dragStyle = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
        opacity: 0.9,
    } : undefined;

    if (isDragging) {
        return (
            <div ref={setNodeRef} style={dragStyle} className="bg-gray-800 p-4 rounded-lg shadow-xl border border-white/20 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-white/5 ${style.color}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <h4 className="font-medium text-white">{style.label}</h4>
                </div>
            </div>
        )
    }

    return (
        <div
            ref={setNodeRef}
            style={dragStyle}
            className={`group p-3 rounded-lg flex items-center gap-3 hover:bg-white/5 transition-colors border border-transparent ${isDragging ? 'opacity-0' : ''} ${isTodayItem ? 'bg-accent-orange/5 border-accent-orange/20' : 'bg-white/5'}`}
        >
            <div className="cursor-grab text-gray-600 hover:text-white" {...listeners} {...attributes}>
                <GripVertical className="w-4 h-4" />
            </div>

            <div
                className={`w-8 h-8 rounded-full flex items-center justify-center bg-white/5 ${style.color} cursor-pointer`}
                onClick={onClick}
            >
                <Icon className="w-4 h-4" />
            </div>

            <div className="flex-1 cursor-pointer min-w-0" onClick={onClick}>
                <div className="flex items-center justify-between">
                    <h4 className={`text-sm font-medium truncate ${workout.isCompleted ? 'text-gray-500 line-through' : 'text-white'}`}>
                        {style.label}
                    </h4>
                    <div className="flex items-center gap-2">
                        {(workout.targetDistance ?? 0) > 0 && (
                            <span className="text-xs text-gray-400 whitespace-nowrap">
                                {((workout.targetDistance ?? 0) / 1000).toFixed(1)}k
                            </span>
                        )}
                        {!workout.isCompleted && (
                            <button
                                onClick={onComplete}
                                className="p-1 hover:bg-green-500/20 text-gray-500 hover:text-green-400 rounded transition-colors"
                                title="Mark as Complete"
                            >
                                <Check className="w-4 h-4" />
                            </button>
                        )}
                        <Settings className="w-3 h-3 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                </div>
                <p className="text-xs text-gray-500 truncate">{workout.description}</p>

                {/* Linked Activity Data */}
                {linkedActivity && (
                    <div
                        className="mt-2 pt-2 border-t border-white/10 cursor-pointer hover:bg-white/5 transition-colors rounded -mx-1 px-1"
                        onClick={(e) => onActivityClick(linkedActivity, e)}
                    >
                        <p className="text-xs text-green-400 truncate font-medium flex items-center gap-1">
                            <Check className="w-3 h-3" /> {linkedActivity.name}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
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
