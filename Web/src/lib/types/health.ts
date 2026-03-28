import type { Prisma } from '@prisma/client';

export type Supplement = Prisma.SupplementGetPayload<{
    select: {
        id: true;
        userId: true;
        name: true;
        amount: true;
        unit: true;
        timeOfDay: true;
        daysOfWeek: true;
        order: true;
        isActive: true;
        stackId: true;
    };
}>;

export type SupplementStack = Prisma.SupplementStackGetPayload<{
    select: {
        id: true;
        userId: true;
        name: true;
        timeOfDay: true;
        isActive: true;
        order: true;
        supplements: { select: { id: true; name: true; amount: true; unit: true; timeOfDay: true; daysOfWeek: true; order: true; isActive: true; stackId: true } };
    };
}>;

export type SupplementLog = {
    id: string;
    supplementId: string;
    date: Date | string;
    taken: boolean;
};

export type NutritionLog = {
    id: string;
    userId: string;
    date: string;
    mealType: string | null;
    quantity: number;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber: number | null;
    sugar: number | null;
    foodItemId: string;
    createdAt: Date | string;
    foodItem?: {
        id: string;
        name: string;
        brand: string | null;
        servingSize?: string;
    };
};

export type NutritionTarget = {
    dailyCalories: number;
    proteinPercent: number;
    carbsPercent: number;
    fatsPercent: number;
    targetProtein: number;
    targetCarbs: number;
    targetFats: number;
    isDefault?: boolean;
};

export type DailyHealthData = {
    dailyHealth: {
        steps: number;
        weight: number | null;
        activeCalories: number | null;
    } | null;
    foodLogs: NutritionLog[];
    supplementLogs: SupplementLog[];
    exerciseCalories: number;
    meta: {
        date: string;
        hasLogs: boolean;
    };
};

export interface FoodScanItem {
    name: string;
    estimatedGrams: number;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
}

export interface FoodScanResult {
    mealName: string;
    items: FoodScanItem[];
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFats: number;
    confidence: 'high' | 'medium' | 'low';
}

export type UserNutritionTarget = {
    dailyCalories: number;
    proteinPercent: number;
    carbsPercent: number;
    fatsPercent: number;
    exerciseCalorieFactor: number;
    waterGoalMl: number;
    waterTrackingEnabled: boolean;
};
