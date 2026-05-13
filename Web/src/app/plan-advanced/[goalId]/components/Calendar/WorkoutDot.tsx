import { WORKOUT_COLORS } from '../Shared/WorkoutTypeColors';

interface WorkoutDotProps {
    type: string;
    size?: 'sm' | 'md';
}

export function WorkoutDot({ type, size = 'sm' }: WorkoutDotProps) {
    const colors = WORKOUT_COLORS[type] || WORKOUT_COLORS.OTHER;
    const sizeClass = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2.5 h-2.5';

    return (
        <div
            className={`${sizeClass} rounded-full ${colors.dot} shrink-0`}
            title={type}
        />
    );
}
