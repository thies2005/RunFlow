'use client';

import React, { useEffect, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';

interface ProactiveCalorieSnapWidgetProps {
    onOpenScanner: () => void;
}

interface TargetData {
    dailyCalories: number;
    proteinPercent: number;
    carbsPercent: number;
    fatsPercent: number;
    remainingCalories: number;
}

export default function ProactiveCalorieSnapWidget({ onOpenScanner }: ProactiveCalorieSnapWidgetProps) {
    const [targetData, setTargetData] = useState<TargetData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchNutritionData() {
            try {
                // Fetch today's goals and remaining calories
                const targetRes = await fetch('/api/health/nutrition/target');
                if (targetRes.ok) {
                    const target = await targetRes.json();

                    // Also need today's totals to find remaining
                    const historyRes = await fetch('/api/health/nutrition/log/history');
                    let consumed = 0;

                    if (historyRes.ok) {
                        const historyData = await historyRes.json();
                        const todayStr = new Date().toISOString().split('T')[0];
                        const todayLogs = historyData.filter((log: any) => log.date === todayStr);

                        consumed = todayLogs.reduce((acc: number, log: any) => acc + (log.calories || 0), 0);
                    }

                    if (target) {
                        setTargetData({
                            ...target,
                            remainingCalories: Math.max(0, target.dailyCalories - consumed),
                        });
                    }
                }
            } catch (err) {
                console.error('Error fetching proactive nutrition data:', err);
            } finally {
                setIsLoading(false);
            }
        }

        fetchNutritionData();
    }, []);

    if (isLoading) {
        return (
            <div className="glass-card p-4 rounded-xl flex justify-center items-center border border-dashed border-gray-600">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
        );
    }

    // Don't show if there's no target set at all (user doesn't use nutrition tracking)
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
