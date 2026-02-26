'use client';

import React, { useEffect, useState } from 'react';
import { Camera, Loader2, Utensils } from 'lucide-react';

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
            className="p-4 rounded-xl border-2 border-dashed border-pink-500/30 bg-black/40 hover:bg-black/60 hover:border-pink-500/50 transition-all cursor-pointer group"
            onClick={onOpenScanner}
        >
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center group-hover:bg-pink-500/30 transition-colors">
                        <Utensils className="w-4 h-4 text-pink-400" />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-white">Next Meal</h4>
                        <p className="text-xs text-gray-400">
                            {targetData.remainingCalories} kcal remaining today
                        </p>
                    </div>
                </div>
            </div>

            <div className="mt-3 flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-pink-500/10 text-pink-300 text-sm font-medium border border-pink-500/20 group-hover:border-pink-500/40 transition-colors">
                <Camera className="w-4 h-4" />
                Snap your meal with Calorie Snap
            </div>
        </div>
    );
}
