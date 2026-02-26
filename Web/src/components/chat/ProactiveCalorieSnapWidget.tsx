'use client';

import React, { useEffect, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';

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
            className="rounded-2xl border-2 border-dashed border-gray-600 bg-transparent py-8 px-6 cursor-pointer hover:bg-gray-800/30 hover:border-gray-500 transition-all flex flex-col items-center justify-center group"
            onClick={onOpenScanner}
        >
            <div className="w-14 h-14 rounded-full bg-gray-800 border border-gray-600 flex items-center justify-center mb-4 group-hover:bg-gray-700 transition-colors">
                <Camera className="w-6 h-6 text-gray-300 group-hover:text-white" />
            </div>

            <h4 className="text-xl font-bold text-white mb-2">Snap your recovery meal</h4>
            <p className="text-sm text-gray-400 text-center max-w-[200px]">
                AI will calculate macros and log it automatically.
            </p>
        </div>
    );
}
