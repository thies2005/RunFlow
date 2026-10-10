'use client';

import React from 'react';
import { Sparkles, Edit3 } from 'lucide-react';

interface MacroLoggedWidgetProps {
    mealName: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    items?: Array<{ name: string; calories: number; estimatedGrams?: number }>;
    onEditMacros?: () => void;
}

export default function MacroLoggedWidget({
    mealName,
    calories,
    protein,
    carbs,
    fats,
    items,
    onEditMacros,
}: MacroLoggedWidgetProps) {
    return (
        <div className="glass-card overflow-hidden my-4 border border-line relative max-w-sm">
            <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="bg-background-tertiary p-1.5 rounded-full">
                            <Sparkles className="w-4 h-4 text-accent-orange" />
                        </div>
                        <h3 className="font-semibold text-foreground">Added to Log</h3>
                    </div>
                    {onEditMacros && (
                        <button
                            onClick={onEditMacros}
                            className="p-1.5 rounded-full hover:bg-background-tertiary text-foreground-muted hover:text-foreground transition-colors"
                            title="Edit macros"
                        >
                            <Edit3 className="w-4 h-4" />
                        </button>
                    )}
                </div>

                <div className="mb-4">
                    <h4 className="text-xl font-bold text-foreground mb-1 capitalize">{mealName}</h4>
                    <p className="text-2xl font-semibold font-mono tabular-nums text-foreground">
                        {calories} <span className="text-sm font-medium text-foreground-muted ml-1">kcal</span>
                    </p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    {/* Protein */}
                    <div className="bg-background-tertiary border border-line rounded-md p-2 text-center">
                        <p className="text-xs text-foreground-muted mb-0.5 font-medium">Protein</p>
                        <p className="text-lg font-bold font-mono tabular-nums text-foreground">{protein}<span className="text-xs font-normal">g</span></p>
                    </div>
                    {/* Carbs */}
                    <div className="bg-background-tertiary border border-line rounded-md p-2 text-center">
                        <p className="text-xs text-foreground-muted mb-0.5 font-medium">Carbs</p>
                        <p className="text-lg font-bold font-mono tabular-nums text-foreground">{carbs}<span className="text-xs font-normal">g</span></p>
                    </div>
                    {/* Fats */}
                    <div className="bg-background-tertiary border border-line rounded-md p-2 text-center">
                        <p className="text-xs text-foreground-muted mb-0.5 font-medium">Fats</p>
                        <p className="text-lg font-bold font-mono tabular-nums text-foreground">{fats}<span className="text-xs font-normal">g</span></p>
                    </div>
                </div>

                {items && items.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-line">
                        {items.map((item, i) => (
                            <div key={i} className="flex justify-between items-center py-1">
                                <span className="text-xs text-foreground-muted">
                                    • {item.name}{item.estimatedGrams ? ` (${item.estimatedGrams}g)` : ''}
                                </span>
                                <span className="text-xs font-semibold font-mono tabular-nums text-foreground-muted">
                                    {item.calories} kcal
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="bg-background-tertiary p-2 text-center border-t border-line">
                <p className="text-xs text-foreground-muted">View this entry in your <a href="/nutrition" className="text-accent-blue hover:underline">Nutrition Log</a></p>
            </div>
        </div>
    );
}
