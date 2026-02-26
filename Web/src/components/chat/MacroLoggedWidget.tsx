'use client';

import React from 'react';
import { Sparkles, Edit3 } from 'lucide-react';

interface MacroLoggedWidgetProps {
    mealName: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    onEditMacros?: () => void;
}

export default function MacroLoggedWidget({
    mealName,
    calories,
    protein,
    carbs,
    fats,
    onEditMacros,
}: MacroLoggedWidgetProps) {
    return (
        <div className="glass-card rounded-xl overflow-hidden shadow-2xl my-4 border border-purple-500/30 relative max-w-sm">
            {/* Top gradient accent */}
            <div className="h-1 w-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500" />

            <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="bg-purple-500/20 p-1.5 rounded-full">
                            <Sparkles className="w-4 h-4 text-purple-400" />
                        </div>
                        <h3 className="font-semibold text-white">Added to Log</h3>
                    </div>
                    {onEditMacros && (
                        <button
                            onClick={onEditMacros}
                            className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                            title="Edit macros"
                        >
                            <Edit3 className="w-4 h-4" />
                        </button>
                    )}
                </div>

                <div className="mb-4">
                    <h4 className="text-xl font-bold text-white mb-1 capitalize">{mealName}</h4>
                    <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                        {calories} <span className="text-sm font-medium text-gray-400 ml-1">kcal</span>
                    </p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    {/* Protein */}
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 text-center">
                        <p className="text-xs text-blue-300/80 mb-0.5 font-medium uppercase tracking-wider">Protein</p>
                        <p className="text-lg font-bold text-blue-400">{protein}<span className="text-xs font-normal">g</span></p>
                    </div>
                    {/* Carbs */}
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 text-center">
                        <p className="text-xs text-amber-300/80 mb-0.5 font-medium uppercase tracking-wider">Carbs</p>
                        <p className="text-lg font-bold text-amber-400">{carbs}<span className="text-xs font-normal">g</span></p>
                    </div>
                    {/* Fats */}
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-2 text-center">
                        <p className="text-xs text-purple-300/80 mb-0.5 font-medium uppercase tracking-wider">Fats</p>
                        <p className="text-lg font-bold text-purple-400">{fats}<span className="text-xs font-normal">g</span></p>
                    </div>
                </div>
            </div>

            <div className="bg-black/30 p-2 text-center border-t border-white/5">
                <p className="text-xs text-gray-400">View this entry in your <a href="/nutrition" className="text-purple-400 hover:underline">Nutrition Log</a></p>
            </div>
        </div>
    );
}
