'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { X, Save, Bookmark, Loader2, Minus, Plus, ChefHat, Flame, ArrowLeft } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

interface FoodScanItem {
    name: string;
    estimatedGrams: number;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
}

interface ScanResult {
    mealName: string;
    items: FoodScanItem[];
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFats: number;
    confidence: 'high' | 'medium' | 'low';
}

interface Props {
    isOpen: boolean;
    result: ScanResult;
    onClose: () => void;
    onLogSuccess?: () => void;
}

const CONFIDENCE_COLORS = {
    high: 'text-green-400 bg-green-500/10 border-green-500/20',
    medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    low: 'text-red-400 bg-red-500/10 border-red-500/20',
};

export function FoodScanResultView({ isOpen, result, onClose, onLogSuccess }: Props) {
    const { data: session } = useSession();
    const userId = session?.user?.id;
    const queryClient = useQueryClient();

    // Allow editing quantities per item (multiplier)
    const [multipliers, setMultipliers] = useState<number[]>(
        result.items.map(() => 1)
    );
    const [mealType, setMealType] = useState('LUNCH');
    const [globalMultiplier, setGlobalMultiplier] = useState(1);
    const [isSaving, setIsSaving] = useState(false);
    const [savedMessage, setSavedMessage] = useState<string | null>(null);

    const adjustMultiplier = (index: number, delta: number) => {
        setMultipliers(prev => {
            const next = [...prev];
            next[index] = Math.max(0.1, Math.round((next[index] + delta) * 10) / 10);
            return next;
        });
    };

    // Calculate adjusted totals (combines per-item multiplier with global multiplier)
    const adjustedItems = result.items.map((item, i) => {
        const totalMult = multipliers[i] * globalMultiplier;
        return {
            ...item,
            estimatedGrams: Math.round(item.estimatedGrams * totalMult),
            calories: Math.round(item.calories * totalMult),
            protein: Math.round(item.protein * totalMult * 10) / 10,
            carbs: Math.round(item.carbs * totalMult * 10) / 10,
            fats: Math.round(item.fats * totalMult * 10) / 10,
        };
    });

    const totals = adjustedItems.reduce(
        (acc, item) => ({
            calories: acc.calories + item.calories,
            protein: Math.round((acc.protein + item.protein) * 10) / 10,
            carbs: Math.round((acc.carbs + item.carbs) * 10) / 10,
            fats: Math.round((acc.fats + item.fats) * 10) / 10,
        }),
        { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );

    // Log all items as individual food entries
    const logMutation = useMutation({
        mutationFn: async () => {
            if (!userId) throw new Error('Not logged in');

            const todayStr = format(new Date(), 'yyyy-MM-dd');

            // Log each item individually
            const promises = adjustedItems
                .filter((_, i) => multipliers[i] > 0)
                .map(item =>
                    fetch('/api/health/nutrition/log', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId,
                            date: todayStr,
                            mealType,
                            quantity: 1,
                            foodItem: {
                                name: item.name,
                                brand: 'AI Scan',
                                barcode: null,
                                calories: item.calories,
                                protein: item.protein,
                                carbs: item.carbs,
                                fats: item.fats,
                                servingSize: `${item.estimatedGrams}g`,
                            },
                        }),
                    })
                );

            const results = await Promise.all(promises);
            const failed = results.filter(r => !r.ok);
            if (failed.length > 0) {
                throw new Error(`Failed to log ${failed.length} item(s)`);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['daily-health'] });
            if (onLogSuccess) onLogSuccess();
            onClose();
        },
        onError: (err) => {
            alert(`Failed to log meal: ${err instanceof Error ? err.message : 'Unknown error'}`);
        },
    });

    // Save meal to library
    const handleSaveMeal = async () => {
        if (!userId) return;
        setIsSaving(true);
        setSavedMessage(null);

        try {
            const res = await fetch('/api/health/nutrition/meals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    name: result.mealName,
                    items: adjustedItems,
                    totalCalories: totals.calories,
                    totalProtein: totals.protein,
                    totalCarbs: totals.carbs,
                    totalFats: totals.fats,
                }),
            });

            if (!res.ok) throw new Error('Failed to save');
            setSavedMessage('Saved to meal library!');
            queryClient.invalidateQueries({ queryKey: ['saved-meals'] });
        } catch {
            alert('Failed to save meal');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/80 backdrop-blur-sm sm:items-center sm:justify-center">
            <div className="bg-[#1c1c1e] w-full max-w-md h-full sm:h-auto sm:max-h-[90vh] sm:rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom">
                {/* Header */}
                <div className="flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))] border-b border-white/10 shrink-0">
                    <div className="flex items-center gap-2">
                        <button onClick={onClose} className="p-1 -ml-2 text-gray-400 hover:text-white">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <ChefHat className="w-5 h-5 text-amber-400" />
                        <h2 className="text-lg font-bold text-white">Meal Breakdown</h2>
                    </div>
                    <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 flex flex-col overflow-y-auto">
                    {/* Meal Name + Confidence */}
                    <div className="p-4 pb-0">
                        <h3 className="text-xl font-bold text-white mb-2">{result.mealName}</h3>
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border ${CONFIDENCE_COLORS[result.confidence]}`}>
                            {result.confidence === 'high' ? '✓' : result.confidence === 'medium' ? '~' : '!'} {result.confidence} confidence
                        </span>
                    </div>

                    {/* Totals Bar */}
                    <div className="p-4">
                        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-4">
                            <div className="grid grid-cols-4 gap-2 text-center">
                                <div>
                                    <div className="flex items-center justify-center gap-1 mb-1">
                                        <Flame className="w-3 h-3 text-amber-400" />
                                        <span className="text-[10px] text-gray-400 uppercase">Cals</span>
                                    </div>
                                    <p className="text-lg font-bold text-amber-400">{totals.calories}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase mb-1">Protein</p>
                                    <p className="text-lg font-bold text-blue-400">{totals.protein}g</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase mb-1">Carbs</p>
                                    <p className="text-lg font-bold text-green-400">{totals.carbs}g</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase mb-1">Fats</p>
                                    <p className="text-lg font-bold text-pink-400">{totals.fats}g</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Component List */}
                    <div className="px-4 pb-4">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                            Ingredients ({adjustedItems.length})
                        </h4>
                        <div className="space-y-2">
                            {adjustedItems.map((item, index) => (
                                <div
                                    key={index}
                                    className="bg-white/5 border border-white/10 rounded-xl p-3"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-white text-sm">{item.name}</p>
                                            <p className="text-xs text-gray-400">{item.estimatedGrams}g</p>
                                        </div>
                                        <div className="text-right shrink-0 ml-2">
                                            <p className="text-sm font-bold text-amber-400">{item.calories}</p>
                                            <p className="text-[10px] text-gray-500 uppercase">kcal</p>
                                        </div>
                                    </div>

                                    {/* Macros row */}
                                    <div className="flex items-center gap-3 text-[11px] text-gray-400 mb-2">
                                        <span>P: <span className="text-blue-400 font-medium">{item.protein}g</span></span>
                                        <span>C: <span className="text-green-400 font-medium">{item.carbs}g</span></span>
                                        <span>F: <span className="text-pink-400 font-medium">{item.fats}g</span></span>
                                    </div>

                                    {/* Quantity adjuster */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] text-gray-500">Portion:</span>
                                        <button
                                            onClick={() => adjustMultiplier(index, -0.5)}
                                            className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                                        >
                                            <Minus className="w-3 h-3 text-gray-300" />
                                        </button>
                                        <span className="text-sm font-medium text-white w-10 text-center">
                                            {multipliers[index]}x
                                        </span>
                                        <button
                                            onClick={() => adjustMultiplier(index, 0.5)}
                                            className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                                        >
                                            <Plus className="w-3 h-3 text-gray-300" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Actions Footer */}
                <div className="p-4 border-t border-white/10 shrink-0 space-y-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                    {/* Global Portion Slider */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-white">Overall Portion Size</label>
                            <span className="text-sm font-bold text-amber-400">{globalMultiplier}x</span>
                        </div>
                        <input
                            type="range"
                            min="0.25"
                            max="3"
                            step="0.25"
                            value={globalMultiplier}
                            onChange={(e) => setGlobalMultiplier(parseFloat(e.target.value))}
                            className="w-full accent-amber-500 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-gray-500 mt-1 px-1">
                            <span>0.25x</span>
                            <span>1x</span>
                            <span>2x</span>
                            <span>3x</span>
                        </div>
                    </div>

                    {/* Meal Type */}
                    <select
                        value={mealType}
                        onChange={e => setMealType(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none appearance-none text-sm"
                    >
                        <option value="BREAKFAST">🌅 Breakfast</option>
                        <option value="LUNCH">☀️ Lunch</option>
                        <option value="DINNER">🌙 Dinner</option>
                        <option value="SNACK">🍿 Snack</option>
                    </select>

                    <div className="flex gap-2">
                        {/* Save Meal Button */}
                        <button
                            onClick={handleSaveMeal}
                            disabled={isSaving || !!savedMessage}
                            className="flex-shrink-0 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors rounded-xl px-4 py-3 flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                            {isSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                            ) : savedMessage ? (
                                <span className="text-xs text-green-400 font-medium">✓ Saved</span>
                            ) : (
                                <>
                                    <Bookmark className="w-4 h-4 text-amber-400" />
                                    <span className="text-xs text-gray-300 font-medium">Save</span>
                                </>
                            )}
                        </button>

                        {/* Log Meal Button */}
                        <button
                            onClick={() => logMutation.mutate()}
                            disabled={logMutation.isPending}
                            className="flex-1 py-3 bg-white text-black font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 disabled:opacity-50 transition-colors"
                        >
                            {logMutation.isPending ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Logging...</>
                            ) : (
                                <><Save className="w-4 h-4" /> Log {totals.calories} kcal</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
