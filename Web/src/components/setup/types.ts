import { getRaceDefaults } from '@/lib/plans/defaults';

export interface RaceActivity {
    id: string;
    name: string;
    distance: number;
    movingTime: number;
    startDate: string;
}

export interface SubGoalForm {
    name: string;
    sport: string;
    raceType: string;
    raceDate: string;
    targetTime?: number;
}

export interface PlanSetupFormProps {
    mode: 'onboarding' | 'advanced' | 'modal' | 'settings';
    onSuccess?: () => void;
    onCancel?: () => void;
    currentVdot?: number;
    shapePercent?: number;
    planSource?: string;
    creationMode?: string;
    initialExperienceLevel?: string;
}

export const MAX_LONG_RUN_KM_BY_RACE: Record<string, number> = {
    FIVE_K: 18,
    TEN_K: 22,
    HALF_MARATHON: 24,
    MARATHON: 32,
    FIFTY_K: 35,
    FIFTY_MILE: 40,
    HUNDRED_K: 45,
    HUNDRED_MILE: 50,
    TWELVE_HOUR: 40,
    TWENTY_FOUR_HOUR: 50,
    BACKYARD_ULTRA: 35,
    CUSTOM_DISTANCE: 25,
    SPRINT_TRI: 15,
    OLYMPIC_TRI: 18,
    HALF_IRONMAN: 22,
    FULL_IRONMAN: 30,
    CUSTOM_TRI: 22,
};

export const TRIATHLON_RACE_TYPES = new Set([
    'SPRINT_TRI', 'OLYMPIC_TRI', 'HALF_IRONMAN', 'FULL_IRONMAN', 'CUSTOM_TRI',
]);

export const ULTRA_DISTANCE_MAP: Record<string, number> = {
    FIFTY_K: 50000,
    FIFTY_MILE: 80467,
    HUNDRED_K: 100000,
    HUNDRED_MILE: 160934,
};

export function getDefaultMaxLongRunKm(raceType: string, weeklyMileageKm: number): number {
    const defaults = getRaceDefaults(raceType);
    const calculated = Math.round(weeklyMileageKm * 0.55);
    return Math.max(6, Math.min(calculated, defaults.maxLongRunKm));
}
