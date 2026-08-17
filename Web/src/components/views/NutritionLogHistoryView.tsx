'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { X, Calendar, Trash2, Edit2, Loader2, Check, Bookmark } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

interface NutritionLog {
    id: string;
    date: string;
    mealType: string;
    quantity: number;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    foodItem: {
        id: string;
        name: string;
        brand: string | null;
        servingSize: string | null;
    };
    createdAt: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export function NutritionLogHistoryView({ isOpen, onClose }: Props) {
    const { data: session } = useSession();
    const userId = session?.user?.id;
    const queryClient = useQueryClient();
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [savingMealId, setSavingMealId] = useState<string | null>(null);
    const [savedMealIds, setSavedMealIds] = useState<Set<string>>(new Set());

    // Edit state
    const [editQuantity, setEditQuantity] = useState('1');
    const [editMealType, setEditMealType] = useState('SNACK');
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        window.history.pushState({ modal: 'NutritionHistory' }, '');
        const handlePopState = () => onClose();
        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('popstate', handlePopState);
            if (window.history.state?.modal === 'NutritionHistory') {
                window.history.back();
            }
        };
    }, [isOpen, onClose]);

    const { data: historyGroups, isLoading } = useQuery({
        queryKey: ['nutrition-history', userId],
        queryFn: async () => {
            const res = await fetch(`/api/health/nutrition/log/history`);
            if (!res.ok) throw new Error('Failed to fetch history');
            return res.json() as Promise<Record<string, NutritionLog[]>>;
        },
        enabled: isOpen && !!userId,
    });

    const deleteMutation = useMutation({
        mutationFn: async (logId: string) => {
            setDeletingId(logId);
            const res = await fetch(`/api/health/nutrition/log/${logId}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['nutrition-history'] });
            queryClient.invalidateQueries({ queryKey: ['daily-health'] }); // update today's logs in background
            setDeletingId(null);
            setEditingId(null);
            toast.success('Food log deleted');
        },
        onError: () => {
            toast.error('Failed to delete food log');
            setDeletingId(null);
        },
    });

    const editMutation = useMutation({
        mutationFn: async (logId: string) => {
            setIsSavingEdit(true);
            const res = await fetch(`/api/health/nutrition/log/${logId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quantity: parseFloat(editQuantity), mealType: editMealType }),
            });
            if (!res.ok) throw new Error('Failed to update');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['nutrition-history'] });
            queryClient.invalidateQueries({ queryKey: ['daily-health'] });
            setIsSavingEdit(false);
            setEditingId(null);
            toast.success('Food log updated');
        },
        onError: () => {
            toast.error('Failed to update food log');
            setIsSavingEdit(false);
        }
    });

    const saveToLibraryMutation = useMutation({
        mutationFn: async (log: NutritionLog) => {
            setSavingMealId(log.id);
            const foodName = log.foodItem?.name || 'Saved Food';

            // Re-calculate the macros based on the quantity stored in the log
            // (Assuming log macro fields represent the TOTAL macros for that log entry)
            const res = await fetch('/api/health/nutrition/meals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    name: foodName,
                    totalCalories: log.calories,
                    totalProtein: log.protein,
                    totalCarbs: log.carbs,
                    totalFats: log.fats,
                    items: [{
                        name: foodName,
                        estimatedGrams: 100 * log.quantity, // Rough estimate, adjust if serving size parsing is needed
                        calories: log.calories,
                        protein: log.protein,
                        carbs: log.carbs,
                        fats: log.fats,
                    }]
                }),
            });
            if (!res.ok) throw new Error('Failed to save to library');
        },
        onSuccess: (_, log) => {
            queryClient.invalidateQueries({ queryKey: ['saved-meals'] });
            setSavingMealId(null);
            setSavedMealIds((prev) => new Set(prev).add(log.id));
            toast.success('Saved to Meal Library');
        },
        onError: () => {
            toast.error('Failed to save to Meal Library');
            setSavingMealId(null);
        }
    });

    const startEditing = (log: NutritionLog) => {
        setEditingId(log.id);
        setEditQuantity(log.quantity.toString());
        setEditMealType(log.mealType || 'SNACK');
    };

    if (!isOpen) return null;

    // Convert grouped dates object to an array and sort descending
    const sortedDates = historyGroups ? Object.keys(historyGroups).sort((a, b) => b.localeCompare(a)) : [];

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/80 backdrop-blur-xs sm:items-center sm:justify-center">
            <div className="bg-background-secondary w-full max-w-md h-full sm:h-auto sm:max-h-[90vh] sm:rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom">
                {/* Header */}
                <div className="flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))] border-b border-foreground/10 shrink-0">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-pink-400" />
                        <h2 className="text-lg font-bold text-foreground">Food History</h2>
                    </div>
                    <button onClick={onClose} className="p-2 -mr-2 text-foreground-muted hover:text-foreground transition-colors rounded-full hover:bg-foreground/10">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-foreground-muted" />
                        </div>
                    ) : sortedDates.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 rounded-full bg-foreground/5 flex items-center justify-center mx-auto mb-4">
                                <Calendar className="w-8 h-8 text-foreground-secondary" />
                            </div>
                            <p className="text-foreground-muted font-medium mb-1">No food logged yet</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {sortedDates.map(dateStr => {
                                const logs = historyGroups![dateStr];
                                const dateObj = parseISO(dateStr);
                                const isToday = dateStr === new Date().toISOString().split('T')[0];

                                return (
                                    <div key={dateStr} className="space-y-2">
                                        <h3 className="text-sm font-semibold text-foreground-muted sticky top-0 bg-background-secondary py-1 z-10">
                                            {isToday ? 'Today' : format(dateObj, 'EEEE, MMM do')}
                                        </h3>
                                        <div className="space-y-2">
                                            {logs.map((log) => {
                                                const isEditing = editingId === log.id;

                                                return (
                                                    <div key={log.id} className={`bg-foreground/5 border ${isEditing ? 'border-pink-500/50 block shadow-[0_0_15px_rgba(236,72,153,0.15)]' : 'border-foreground/10'} rounded-xl overflow-hidden transition-all duration-200`}>
                                                        <div className="p-3">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div className="flex-1 pr-3">
                                                                    <p className="text-sm font-medium text-foreground line-clamp-2">{log.foodItem?.name || log.mealType}</p>
                                                                    {log.foodItem?.brand && (
                                                                        <p className="text-[11px] text-foreground-muted">{log.foodItem.brand}</p>
                                                                    )}
                                                                    {!isEditing && (
                                                                        <p className="text-xs text-foreground-muted mt-1">
                                                                            <span className="text-foreground font-medium">{log.quantity}x</span> {log.mealType || 'SNACK'}
                                                                            {log.foodItem?.servingSize ? ` (${log.foodItem.servingSize})` : ''}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                                <div className="text-right shrink-0">
                                                                    <p className="text-sm font-bold text-pink-400">{Math.round(log.calories)} kcal</p>
                                                                    <p className="text-[10px] text-foreground-muted mt-0.5">{Math.round(log.protein)}g P · {Math.round(log.carbs)}g C · {Math.round(log.fats)}g F</p>
                                                                </div>
                                                            </div>

                                                            {isEditing && (
                                                                <div className="mt-3 bg-foreground/5 rounded-lg p-3 border border-foreground/5">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="flex-1">
                                                                            <label className="text-[10px] text-foreground-muted uppercase tracking-wider font-semibold mb-1 block">Quantity</label>
                                                                            <div className="flex">
                                                                                <input
                                                                                    type="number"
                                                                                    min="0.1"
                                                                                    step="0.1"
                                                                                    value={editQuantity}
                                                                                    onChange={(e) => setEditQuantity(e.target.value)}
                                                                                    className="w-full bg-foreground/5 border border-foreground/10 rounded-l-lg px-3 py-1.5 text-sm text-foreground focus:outline-hidden focus:border-pink-500/50"
                                                                                />
                                                                                <div className="bg-foreground/10 border border-foreground/10 border-l-0 rounded-r-lg px-3 py-1.5 flex items-center justify-center text-xs text-foreground-muted">
                                                                                    srv
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex-1">
                                                                            <label className="text-[10px] text-foreground-muted uppercase tracking-wider font-semibold mb-1 block">Meal</label>
                                                                            <select
                                                                                value={editMealType}
                                                                                onChange={(e) => setEditMealType(e.target.value)}
                                                                                className="w-full bg-foreground/5 border border-foreground/10 rounded-lg px-2 py-1.5 text-sm text-foreground focus:outline-hidden focus:border-pink-500/50"
                                                                            >
                                                                                <option value="BREAKFAST" className="bg-background-secondary">Breakfast</option>
                                                                                <option value="LUNCH" className="bg-background-secondary">Lunch</option>
                                                                                <option value="DINNER" className="bg-background-secondary">Dinner</option>
                                                                                <option value="SNACK" className="bg-background-secondary">Snack</option>
                                                                            </select>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="border-t border-foreground/5 px-2 py-1.5 flex justify-between items-center bg-foreground/5">
                                                            {isEditing ? (
                                                                <>
                                                                    <button
                                                                        onClick={() => setEditingId(null)}
                                                                        className="text-[11px] text-foreground-muted hover:text-foreground px-2 py-1 transition-colors"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                    <button
                                                                        onClick={() => editMutation.mutate(log.id)}
                                                                        disabled={isSavingEdit || !editQuantity || isNaN(Number(editQuantity))}
                                                                        className="text-[11px] bg-pink-500/20 text-pink-400 hover:bg-pink-500/30 px-3 py-1 rounded transition-colors flex items-center gap-1 disabled:opacity-50"
                                                                    >
                                                                        {isSavingEdit ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                                                        Save
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <span className="text-[10px] text-foreground-muted pl-1">{format(parseISO(log.createdAt), 'h:mm a')}</span>
                                                                    <div className="flex gap-1">
                                                                        <button
                                                                            onClick={() => {
                                                                                if (!savedMealIds.has(log.id)) {
                                                                                    saveToLibraryMutation.mutate(log);
                                                                                }
                                                                            }}
                                                                            disabled={savingMealId === log.id || savedMealIds.has(log.id)}
                                                                            className="text-[11px] text-amber-400/80 hover:text-amber-400 flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-foreground/5 disabled:opacity-50"
                                                                        >
                                                                            {savingMealId === log.id ? (
                                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                                            ) : savedMealIds.has(log.id) ? (
                                                                                <Check className="w-3 h-3 text-green-400" />
                                                                            ) : (
                                                                                <Bookmark className="w-3 h-3" />
                                                                            )}
                                                                            {savedMealIds.has(log.id) ? 'Saved' : 'Save'}
                                                                        </button>
                                                                        <button
                                                                            onClick={() => startEditing(log)}
                                                                            className="text-[11px] text-foreground-muted hover:text-foreground flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-foreground/5"
                                                                        >
                                                                            <Edit2 className="w-3 h-3" />
                                                                            Edit
                                                                        </button>
                                                                        <button
                                                                            onClick={() => {
                                                                                if (confirm('Delete this food entry?')) {
                                                                                    deleteMutation.mutate(log.id);
                                                                                }
                                                                            }}
                                                                            disabled={deletingId === log.id}
                                                                            className="text-[11px] text-red-400/70 hover:text-red-400 flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-foreground/5 disabled:opacity-50"
                                                                        >
                                                                            {deletingId === log.id ? (
                                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                                            ) : (
                                                                                <Trash2 className="w-3 h-3" />
                                                                            )}
                                                                            Delete
                                                                        </button>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
