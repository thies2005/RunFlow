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
                <div className="glass-card border-accent-pink/20 p-4 flex items-start gap-3">
                    <Target className="w-5 h-5 text-accent-pink shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <h4 className="text-sm font-semibold text-accent-pink mb-1">Set Your Nutrition Goals</h4>
                        <p className="text-xs text-foreground-muted mb-3">Define your calorie and macro targets to unlock personalized insights and detailed adherence scoring.</p>
                        <button
                            type="button"
                            onClick={onOpenGoals}
                            className="bg-accent-orange text-white text-xs font-semibold px-4 py-2 rounded-md w-full hover:bg-accent-orange/90 transition-colors"
                        >
                            Setup Goals
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={onOpenAnalytics}
                    className="w-full text-left glass-card glass-card-hover p-4"
                >
                    <div className="flex justify-between items-end mb-3">
                        <div>
                            <h3 className="text-xs font-semibold text-foreground-muted mb-1">
                                {(effectiveTarget - totalCalories) < 0 ? 'Calories Over' : 'Calories Remaining'}
                            </h3>
                            <div className="flex items-baseline gap-1">
                                <p className="text-3xl font-semibold font-mono tabular-nums text-foreground">{Math.abs(Math.round(effectiveTarget - totalCalories))}</p>
                                <span className="text-sm text-foreground-muted font-normal">kcal</span>
                                {exerciseBudget > 0 && (
                                    <span className="text-sm font-semibold font-mono text-positive ml-1 bg-positive/10 px-2 py-0.5 rounded-md border border-positive/20">
                                        +{exerciseBudget} active
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="text-right">
                            <ChevronRight className="w-5 h-5 text-foreground-muted" />
                        </div>
                    </div>
                    <div className="h-2 w-full bg-background-tertiary rounded-full mb-3 overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${(effectiveTarget - totalCalories) < 0 ? 'bg-accent-pink' : 'bg-accent-orange'}`}
                            style={{ width: `${Math.min(100, (totalCalories / (effectiveTarget || 1)) * 100)}%` }}
                        />
                    </div>
                    {exerciseCalories > 0 ? (
                        <div className="flex items-center justify-between text-xs text-foreground-muted mb-4 bg-background-tertiary rounded-md px-3 py-2">
                            <div className="flex items-center gap-3">
                                <span className="font-mono tabular-nums">{Math.round(totalCalories)} eaten</span>
                                <span className="text-positive font-mono tabular-nums">-{Math.round(exerciseCalories)} burned</span>
                                <span className="text-foreground-muted font-mono tabular-nums">x{exerciseFactor}</span>
                            </div>
                            <span className="text-foreground font-medium font-mono tabular-nums">{Math.round(totalCalories - exerciseBudget)} net</span>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between text-xs text-foreground-muted mb-4">
                            <span className="font-mono tabular-nums">{Math.round(totalCalories)} / {Math.round(effectiveTarget)} kcal eaten</span>
                        </div>
                    )}
                    <div className="flex justify-between">
                        <MacroRing value={totalProtein} target={targetProtein} color="var(--accent-pink)" label="Protein" />
                        <MacroRing value={totalCarbs} target={targetCarbs} color="var(--accent-blue)" label="Carbs" />
                        <MacroRing value={totalFats} target={targetFats} color="var(--workout-tempo)" label="Fats" />
                    </div>
                </button>
            )}

            <button
                type="button"
                onClick={onOpenMealSuggestion}
                className="glass-card glass-card-hover p-4 w-full flex items-center justify-between"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent-blue/10 flex items-center justify-center flex-shrink-0 border border-accent-blue/20">
                        <Sparkles className="w-5 h-5 text-workout-tempo" />
                    </div>
                    <div className="text-left font-sans">
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">What should I eat?</h3>
                        <p className="text-xs text-foreground-muted mt-0.5">Perfect meals for your macros</p>
                    </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-background-tertiary flex items-center justify-center">
                    <ChevronRight className="w-4 h-4 text-foreground-muted" />
                </div>
            </button>
        </>
    );
}
