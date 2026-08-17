import { ChevronRight, Sparkles, Target } from 'lucide-react';
import { MacroRing } from './shared';
import type { NutritionTarget } from '@/lib/types/health';

interface Props {
    targetData: NutritionTarget;
    effectiveTarget: number;
    totalCalories: number;
    exerciseBudget: number;
    exerciseCalories: number;
    exerciseFactor: number;
    totalProtein: number;
    totalCarbs: number;
    totalFats: number;
    targetProtein: number;
    targetCarbs: number;
    targetFats: number;
    onOpenGoals: () => void;
    onOpenAnalytics: () => void;
    onOpenMealSuggestion: () => void;
}

export function NutritionSummary({
    targetData,
    effectiveTarget,
    totalCalories,
    exerciseBudget,
    exerciseCalories,
    exerciseFactor,
    totalProtein,
    totalCarbs,
    totalFats,
    targetProtein,
    targetCarbs,
    targetFats,
    onOpenGoals,
    onOpenAnalytics,
    onOpenMealSuggestion,
}: Props) {
    return (
        <>
            {targetData?.isDefault ? (
                <div className="bg-pink-500/10 border border-pink-500/20 rounded-2xl p-4 flex items-start gap-3 glass-card border-glass-border">
                    <Target className="w-5 h-5 text-pink-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <h4 className="text-sm font-semibold text-pink-400 mb-1">Set Your Nutrition Goals</h4>
                        <p className="text-xs text-pink-200/70 mb-3">Define your calorie and macro targets to unlock personalized insights and detailed adherence scoring.</p>
                        <button
                            type="button"
                            onClick={onOpenGoals}
                            className="bg-pink-500 text-white text-xs font-semibold px-4 py-2 rounded-lg w-full shadow-lg shadow-pink-500/20 hover:bg-pink-600 transition-colors"
                        >
                            Setup Goals
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={onOpenAnalytics}
                    className="w-full text-left bg-gradient-to-br from-foreground/10 to-foreground/5 border border-foreground/10 rounded-2xl p-4 transition-all hover:bg-foreground/10 active:scale-[0.98]"
                >
                    <div className="flex justify-between items-end mb-3">
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-foreground-muted mb-1">
                                {(effectiveTarget - totalCalories) < 0 ? 'Calories Over' : 'Calories Remaining'}
                            </h3>
                            <div className="flex items-baseline gap-1">
                                <p className="text-3xl font-bold text-foreground">{Math.abs(Math.round(effectiveTarget - totalCalories))}</p>
                                <span className="text-sm text-foreground-muted font-normal">kcal</span>
                                {exerciseBudget > 0 && (
                                    <span className="text-sm font-semibold text-green-400 ml-1 bg-green-500/10 px-2 py-0.5 rounded-md border border-green-500/20">
                                        +{exerciseBudget} active
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="text-right">
                            <ChevronRight className="w-5 h-5 text-foreground-muted" />
                        </div>
                    </div>
                    <div className="h-2 w-full bg-foreground/10 rounded-full mb-3 overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${(effectiveTarget - totalCalories) < 0 ? 'bg-amber-500/80 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-pink-500'}`}
                            style={{ width: `${Math.min(100, (totalCalories / (effectiveTarget || 1)) * 100)}%` }}
                        />
                    </div>
                    {exerciseCalories > 0 ? (
                        <div className="flex items-center justify-between text-xs text-foreground-muted mb-4 bg-foreground/5 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-3">
                                <span>{Math.round(totalCalories)} eaten</span>
                                <span className="text-green-400">-{Math.round(exerciseCalories)} burned</span>
                                <span className="text-foreground-muted">x{exerciseFactor}</span>
                            </div>
                            <span className="text-foreground font-medium">{Math.round(totalCalories - exerciseBudget)} net</span>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between text-xs text-foreground-muted mb-4">
                            <span>{Math.round(totalCalories)} / {Math.round(effectiveTarget)} kcal eaten</span>
                        </div>
                    )}
                    <div className="flex justify-between">
                        <MacroRing value={totalProtein} target={targetProtein} color="#ec4899" label="Protein" />
                        <MacroRing value={totalCarbs} target={targetCarbs} color="#3b82f6" label="Carbs" />
                        <MacroRing value={totalFats} target={targetFats} color="#f97316" label="Fats" />
                    </div>
                </button>
            )}

            <button
                type="button"
                onClick={onOpenMealSuggestion}
                className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 hover:from-blue-600/20 hover:to-purple-600/20 border border-blue-500/20 rounded-2xl p-4 transition-all active:scale-[0.98] w-full flex items-center justify-between group"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(59,130,246,0.15)] border border-blue-500/20">
                        <Sparkles className="w-5 h-5 text-amber-400/90" />
                    </div>
                    <div className="text-left font-sans">
                        <h3 className="text-sm font-bold text-blue-100 flex items-center gap-2">What should I eat?</h3>
                        <p className="text-xs text-blue-200/50 mt-0.5">Perfect meals for your macros</p>
                    </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-foreground/5 flex items-center justify-center group-hover:bg-foreground/10 transition-colors">
                    <ChevronRight className="w-4 h-4 text-blue-300" />
                </div>
            </button>
        </>
    );
}
