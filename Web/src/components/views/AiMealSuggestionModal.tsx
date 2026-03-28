'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { X, Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getCurrentUtcDayKey } from '@/lib/health/dates';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    remainingMacros: {
        calories: number;
        protein: number;
        carbs: number;
        fats: number;
    };
    onLogSuccess: () => void;
}

export function AiMealSuggestionModal({ isOpen, onClose, remainingMacros, onLogSuccess }: Props) {
    const { data: session } = useSession();
    const userId = session?.user?.id;
    const queryClient = useQueryClient();

    const [suggestion, setSuggestion] = useState<any | null>(null);

    const suggestMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/health/nutrition/suggest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    remainingCalories: remainingMacros.calories,
                    remainingProtein: remainingMacros.protein,
                    remainingCarbs: remainingMacros.carbs,
                    remainingFats: remainingMacros.fats,
                }),
            });
            const contentType = res.headers.get('content-type') || '';
            const isJson = contentType.includes('application/json');

            if (!res.ok) {
                const errorBody = await res.text();
                let message = `Failed to fetch suggestion (${res.status})`;
                if (isJson) {
                    try {
                        const err = JSON.parse(errorBody);
                        if (err?.error) message = err.error;
                    } catch {
                        // Ignore JSON parse failure and use fallback message.
                    }
                }
                throw new Error(message);
            }

            if (!isJson) {
                await res.text();
                throw new Error('Unexpected response format from server.');
            }

            return res.json();
        },
        onSuccess: (data) => {
            setSuggestion(data);
        },
        onError: (err: any) => {
            toast.error(err.message || 'Error generating suggestion.');
        }
    });

    const logMutation = useMutation({
        mutationFn: async () => {
            if (!userId || !suggestion) throw new Error('Not logged in or no suggestion');

            const res = await fetch('/api/health/nutrition/log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    date: getCurrentUtcDayKey(),
                    mealType: 'SNACK',
                    quantity: 1,
                    foodItem: {
                        name: suggestion.suggestionName,
                        brand: 'AI Suggestion',
                        barcode: null,
                        calories: suggestion.totalCalories,
                        protein: suggestion.totalProtein,
                        carbs: suggestion.totalCarbs,
                        fats: suggestion.totalFats,
                        servingSize: '1 meal'
                    }
                })
            });
            if (!res.ok) throw new Error('Failed to log suggestion');
            return res.json();
        },
        onSuccess: () => {
            toast.success('Meal logged successfully');
            queryClient.invalidateQueries({ queryKey: ['daily-health'] });
            onLogSuccess();
            onClose();
            setSuggestion(null);
        },
        onError: (err: any) => {
            toast.error(err.message || 'Failed to log suggestion');
        }
    });

    // Reset state when the modal is closed
    useEffect(() => {
        if (!isOpen) {
            setSuggestion(null);
            suggestMutation.reset();
        }
    }, [isOpen, suggestMutation]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/80 backdrop-blur-sm sm:items-center sm:justify-center p-4">
            <div className="bg-[#1c1c1e] w-full max-w-md rounded-2xl flex flex-col shadow-2xl overflow-hidden border border-white/10 animate-in zoom-in-95">
                
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-blue-600/20 to-purple-600/20">
                    <div className="flex items-center gap-2 text-white">
                        <Sparkles className="w-5 h-5 text-amber-400" />
                        <h2 className="text-lg font-bold">What should I eat?</h2>
                    </div>
                    <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/10">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 flex flex-col gap-4">
                    {!suggestion ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            {suggestMutation.isPending ? (
                                <>
                                    <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mb-4 relative">
                                        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 animate-spin"></div>
                                        <Sparkles className="w-8 h-8 text-blue-400 animate-pulse" />
                                    </div>
                                    <h3 className="text-white font-semibold flex items-center gap-2">
                                        Analyzing your macros...
                                    </h3>
                                    <p className="text-sm text-gray-400 mt-2 max-w-[250px]">
                                        Looking through your library and common foods for the perfect match.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
                                        <Sparkles className="w-8 h-8 text-amber-400" />
                                    </div>
                                    <h3 className="text-white font-semibold mb-2">Find the Perfect Meal</h3>
                                    <p className="text-sm text-gray-400 max-w-[280px]">
                                        Let AI suggest a meal from your recipes or history that perfectly fits your remaining {Math.round(remainingMacros.calories)} calories.
                                    </p>
                                    <button 
                                        onClick={() => suggestMutation.mutate()}
                                        className="mt-6 w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95"
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        Generate Suggestion
                                    </button>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4 animate-in slide-in-from-bottom-4 fade-in">
                            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                <h3 className="text-xl font-bold text-white mb-2">{suggestion.suggestionName}</h3>
                                <p className="text-sm text-gray-300 italic mb-4">&ldquo;{suggestion.reasoning}&rdquo;</p>
                                
                                <div className="grid grid-cols-4 gap-2 mb-4">
                                    <div className="bg-black/40 rounded-lg p-2 text-center">
                                        <div className="text-[10px] uppercase text-gray-500 font-bold mb-1">Cals</div>
                                        <div className="text-white font-bold">{suggestion.totalCalories}</div>
                                    </div>
                                    <div className="bg-black/40 rounded-lg p-2 text-center border-b-2 border-pink-500">
                                        <div className="text-[10px] uppercase text-gray-500 font-bold mb-1">Pro</div>
                                        <div className="text-white font-bold">{suggestion.totalProtein}</div>
                                    </div>
                                    <div className="bg-black/40 rounded-lg p-2 text-center border-b-2 border-blue-500">
                                        <div className="text-[10px] uppercase text-gray-500 font-bold mb-1">Carb</div>
                                        <div className="text-white font-bold">{suggestion.totalCarbs}</div>
                                    </div>
                                    <div className="bg-black/40 rounded-lg p-2 text-center border-b-2 border-orange-500">
                                        <div className="text-[10px] uppercase text-gray-500 font-bold mb-1">Fat</div>
                                        <div className="text-white font-bold">{suggestion.totalFats}</div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {suggestion.items?.map((item: any, i: number) => (
                                        <div key={i} className="flex justify-between text-sm py-1 border-b border-white/5 last:border-0">
                                            <span className="text-gray-300">{item.name}</span>
                                            <span className="text-gray-500">{item.calories} kcal</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button 
                                onClick={() => logMutation.mutate()}
                                disabled={logMutation.isPending}
                                className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                            >
                                {logMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Log This Meal <ArrowRight className="w-4 h-4" /></>}
                            </button>
                            
                            <button 
                                onClick={() => setSuggestion(null)}
                                className="w-full py-2 text-sm text-gray-400 hover:text-white transition-colors"
                            >
                                Try another suggestion
                            </button>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
