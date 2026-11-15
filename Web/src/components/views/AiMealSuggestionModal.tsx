'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { X, Utensils, Loader2, ArrowRight } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getCurrentUtcDayKey } from '@/lib/health/dates';

const formatMealSuggestError = (
    rawMessage: unknown,
    fallback: string,
    retryAfterSeconds?: unknown,
    retryAfterHeader?: string | null
): string => {
    const cleaned = typeof rawMessage === 'string'
        ? rawMessage.replace(/^(?:[A-Za-z]*Error:\s*)+/i, '').trim()
        : '';
    const base = cleaned || fallback;
    const rawRetry = retryAfterSeconds ?? retryAfterHeader;
    const seconds = typeof rawRetry === 'number'
        ? rawRetry
        : typeof rawRetry === 'string' && rawRetry.trim()
            ? Number(rawRetry)
            : NaN;
    if (Number.isFinite(seconds) && seconds > 0 && !/\b\d+\s*s(?:ec(?:ond)?s?)?\b/i.test(base)) {
        const ceil = Math.ceil(seconds);
        return /[.!?]$/.test(base) ? `${base} Try again in ${ceil}s.` : `${base} (Try again in ${ceil}s)`;
    }
    return base;
};

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
    embedded?: boolean;
}

export function AiMealSuggestionModal({ isOpen, onClose, remainingMacros, onLogSuccess, embedded = false }: Props) {
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
            const contentType = res.headers?.get?.('content-type') || '';
            const isJson = contentType.includes('application/json');

            if (!res.ok) {
                const errorBody = await res.text().catch(() => '');
                let errData: { error?: unknown; message?: unknown; retryAfterSeconds?: unknown; retryAfter?: unknown } | null = null;
                if (errorBody && (isJson || errorBody.trim().startsWith('{'))) {
                    try {
                        errData = JSON.parse(errorBody);
                    } catch {
                        errData = null;
                    }
                }
                const message = formatMealSuggestError(
                    errData?.error ?? errData?.message,
                    `Failed to fetch suggestion (${res.status})`,
                    errData?.retryAfterSeconds ?? errData?.retryAfter,
                    res.headers?.get?.('retry-after')
                );
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
        onError: (err: unknown) => {
            const message = err instanceof Error
                ? formatMealSuggestError(err.message, 'Error generating suggestion.')
                : 'Error generating suggestion.';
            toast.error(message);
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
            if (!res.ok) {
                const errData = await res.json().catch(() => null);
                throw new Error(formatMealSuggestError(errData?.error, 'Failed to log suggestion'));
            }
            return res.json();
        },
        onSuccess: () => {
            toast.success('Meal logged successfully');
            queryClient.invalidateQueries({ queryKey: ['daily-health'] });
            onLogSuccess();
            onClose();
            setSuggestion(null);
        },
        onError: (err: unknown) => {
            const message = err instanceof Error
                ? formatMealSuggestError(err.message, 'Failed to log suggestion')
                : 'Failed to log suggestion';
            toast.error(message);
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

    const innerContent = (
        <div className={embedded ? 'flex flex-col flex-1 min-h-0' : 'bg-background-secondary border border-line w-full max-w-md rounded-md flex flex-col overflow-hidden animate-in zoom-in-95'}>
            {/* Header */}
            {!embedded && (
                <div className="flex items-center justify-between p-4 border-b border-line bg-background-tertiary">
                    <div className="flex items-center gap-2 text-foreground">
                        <Utensils className="w-5 h-5 text-workout-tempo" />
                        <h2 className="text-lg font-semibold">What should I eat?</h2>
                    </div>
                    <button onClick={onClose} className="p-2 -mr-2 text-foreground-muted hover:text-foreground transition-colors rounded-full hover:bg-glass-bg-hover">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            )}

                <div className="p-4 flex flex-col gap-4">
                    {!suggestion ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            {suggestMutation.isPending ? (
                                <>
                                    <div className="w-16 h-16 rounded-full bg-accent-blue/10 flex items-center justify-center mb-4 relative">
                                        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent-blue animate-spin"></div>
                                        <Utensils className="w-8 h-8 text-accent-blue" />
                                    </div>
                                    <h3 className="text-foreground font-semibold flex items-center gap-2">
                                        Analyzing your macros...
                                    </h3>
                                    <p className="text-sm text-foreground-muted mt-2 max-w-[250px]">
                                        Looking through your library and common foods for the perfect match.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <div className="w-16 h-16 rounded-full bg-workout-tempo/10 flex items-center justify-center mb-4">
                                        <Utensils className="w-8 h-8 text-workout-tempo" />
                                    </div>
                                    <h3 className="text-foreground font-semibold mb-2">Find the Perfect Meal</h3>
                                    <p className="text-sm text-foreground-muted max-w-[280px]">
                                        Let AI suggest a meal from your recipes or history that perfectly fits your remaining {Math.round(remainingMacros.calories)} calories.
                                    </p>
                                    {suggestMutation.isError && (
                                        <div
                                            role="alert"
                                            className="mt-4 w-full bg-negative/10 border border-negative/20 rounded-md p-3 text-sm text-negative text-left"
                                        >
                                            {formatMealSuggestError(
                                                suggestMutation.error instanceof Error
                                                    ? suggestMutation.error.message
                                                    : undefined,
                                                'Error generating suggestion.'
                                            )}
                                        </div>
                                    )}
                                    <button
                                        onClick={() => suggestMutation.mutate()}
                                        className="mt-6 w-full py-3 rounded-md bg-accent-orange text-white font-semibold hover:bg-accent-orange/90 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Utensils className="w-4 h-4" />
                                        Generate Suggestion
                                    </button>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4 animate-in slide-in-from-bottom-4 fade-in">
                            <div className="bg-background-tertiary border border-line rounded-md p-4">
                                <h3 className="text-xl font-semibold text-foreground mb-2">{suggestion.suggestionName}</h3>
                                <p className="text-sm text-foreground-muted italic mb-4">&ldquo;{suggestion.reasoning}&rdquo;</p>

                                <div className="grid grid-cols-4 gap-2 mb-4">
                                    <div className="bg-glass-bg rounded-md p-2 text-center">
                                        <div className="text-[10px] text-foreground-muted font-semibold mb-1">Cals</div>
                                        <div className="text-foreground font-semibold font-mono tabular-nums">{suggestion.totalCalories}</div>
                                    </div>
                                    <div className="bg-glass-bg rounded-md p-2 text-center border-b-2 border-negative">
                                        <div className="text-[10px] text-foreground-muted font-semibold mb-1">Pro</div>
                                        <div className="text-foreground font-semibold font-mono tabular-nums">{suggestion.totalProtein}</div>
                                    </div>
                                    <div className="bg-glass-bg rounded-md p-2 text-center border-b-2 border-accent-blue">
                                        <div className="text-[10px] text-foreground-muted font-semibold mb-1">Carb</div>
                                        <div className="text-foreground font-semibold font-mono tabular-nums">{suggestion.totalCarbs}</div>
                                    </div>
                                    <div className="bg-glass-bg rounded-md p-2 text-center border-b-2 border-workout-tempo">
                                        <div className="text-[10px] text-foreground-muted font-semibold mb-1">Fat</div>
                                        <div className="text-foreground font-semibold font-mono tabular-nums">{suggestion.totalFats}</div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {suggestion.items?.map((item: any, i: number) => (
                                        <div key={i} className="flex justify-between text-sm py-1 border-b border-line last:border-0">
                                            <span className="text-foreground-muted">{item.name}</span>
                                            <span className="text-foreground-muted font-mono tabular-nums">{item.calories} kcal</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={() => logMutation.mutate()}
                                disabled={logMutation.isPending}
                                className="w-full py-3 rounded-md bg-accent-orange text-white font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {logMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Log This Meal <ArrowRight className="w-4 h-4" /></>}
                            </button>

                            <button
                                onClick={() => setSuggestion(null)}
                                className="w-full py-2 text-sm text-foreground-muted hover:text-foreground transition-colors"
                            >
                                Try another suggestion
                            </button>
                        </div>
                    )}
                </div>

        </div>
    );

    if (embedded) return innerContent;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/60 sm:items-center sm:justify-center p-4">
            {innerContent}
        </div>
    );
}
