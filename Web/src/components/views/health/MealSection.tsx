import { Copy, Plus, Loader2 } from 'lucide-react';
import { NutritionLog } from '@/lib/types/health';

interface Props {
    foodLogs: NutritionLog[];
    copyYesterdayMutation: { mutate: (_variables: { mealType: string }) => void; isPending: boolean; variables?: { mealType: string } };
    onOpenHistory: () => void;
    onQuickAddMeal: (_mealType: string) => void;
}

export function MealSection({ foodLogs, copyYesterdayMutation, onOpenHistory, onQuickAddMeal }: Props) {
    return (
        <div className="space-y-3">
            {['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'].map(mealName => {
                const logsForMeal = foodLogs.filter((l: NutritionLog) =>
                    mealName === 'SNACK' ? (l.mealType === 'SNACK' || !l.mealType) : l.mealType === mealName
                );
                const totalCals = logsForMeal.reduce((sum: number, log: NutritionLog) => sum + (log.calories || 0), 0);
                const isPopulated = logsForMeal.length > 0;

                return (
                    <div key={mealName} className="glass-card border border-glass-border rounded-2xl overflow-hidden transition-all">
                        <div className="w-full px-4 py-3 flex items-center justify-between bg-white/5 hover:bg-white/10 text-left">
                            <button type="button" className="flex items-center gap-2 text-left flex-1" onClick={onOpenHistory}>
                                <h4 className="text-sm font-bold text-white capitalize">{mealName.toLowerCase()}</h4>
                                {totalCals > 0 && <span className="text-xs font-semibold text-pink-400">{Math.round(totalCals)} kcal</span>}
                            </button>
                            <div className="flex items-center gap-2">
                                {!isPopulated && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            copyYesterdayMutation.mutate({ mealType: mealName });
                                        }}
                                        disabled={copyYesterdayMutation.isPending}
                                        className="h-8 px-3 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors text-xs font-medium text-gray-400 hover:text-white disabled:opacity-50"
                                    >
                                        {copyYesterdayMutation.isPending && copyYesterdayMutation.variables?.mealType === mealName ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                                        Yesterday
                                    </button>
                                )}
                                <button
                                    type="button"
                                    aria-label={`Add food to ${mealName.toLowerCase()}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onQuickAddMeal(mealName);
                                    }}
                                    className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors shrink-0"
                                >
                                    <Plus className="w-4 h-4 text-white" />
                                </button>
                            </div>
                        </div>
                        {isPopulated && (
                            <div className="p-4 pt-1 space-y-3">
                                {logsForMeal.map((log: NutritionLog) => (
                                    <button
                                        key={log.id}
                                        type="button"
                                        className="w-full flex justify-between items-center group text-left"
                                        onClick={onOpenHistory}
                                    >
                                        <div className="flex-1 min-w-0 pr-4">
                                            <p className="text-sm font-medium text-gray-200 truncate group-hover:text-white transition-colors">{log.foodItem?.name || 'Unknown Food'}</p>
                                            <p className="text-xs text-gray-500">{log.quantity}x {log.foodItem?.servingSize ? ` (${log.foodItem.servingSize})` : ''}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-sm font-bold text-pink-400/90">{Math.round(log.calories)}</p>
                                            <p className="text-[10px] text-gray-500">{Math.round(log.protein)}P · {Math.round(log.carbs)}C · {Math.round(log.fats)}F</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
