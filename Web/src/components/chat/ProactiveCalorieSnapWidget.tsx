'use client';

import React from 'react';
import { Camera } from 'lucide-react';

export interface TargetData {
    dailyCalories: number;
    proteinPercent: number;
    carbsPercent: number;
    fatsPercent: number;
    remainingCalories: number;
}

interface ProactiveCalorieSnapWidgetProps {
    targetData: TargetData;
    onOpenScanner: () => void;
}

export default function ProactiveCalorieSnapWidget({ targetData, onOpenScanner }: ProactiveCalorieSnapWidgetProps) {
    if (!targetData) return null;

    return (
        <div
            className="rounded-md border border-dashed border-line-strong bg-transparent py-8 px-6 cursor-pointer hover:bg-surface-hover hover:border-line-strong transition-colors flex flex-col items-center justify-center group"
            onClick={onOpenScanner}
        >
            <div className="w-14 h-14 rounded-full bg-background-tertiary border border-line flex items-center justify-center mb-4 group-hover:bg-surface-hover transition-colors">
                <Camera className="w-6 h-6 text-foreground-muted group-hover:text-foreground" />
            </div>

            <h4 className="text-xl font-bold text-foreground mb-2">Snap your recovery meal</h4>
            <p className="text-sm text-foreground-muted text-center max-w-[200px]">
                AI will calculate macros and log it automatically.
            </p>
        </div>
    );
}
