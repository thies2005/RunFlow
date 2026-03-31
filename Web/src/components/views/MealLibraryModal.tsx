'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { X, BookOpen, Trash2, ChevronRight, Loader2, Search } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface MealItem {
    id: string;
    name: string;
    estimatedGrams: number;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
}

interface SavedMeal {
    id: string;
    name: string;
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFats: number;
    items: MealItem[];
    createdAt: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSelectMeal: (_meal: SavedMeal) => void;
}

export function MealLibraryModal({ isOpen, onClose, onSelectMeal }: Props) {
    const { data: session } = useSession();
    const userId = session?.user?.id;
    const queryClient = useQueryClient();
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        window.history.pushState({ modal: 'MealLibrary' }, '');
        const handlePopState = () => onClose();
        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('popstate', handlePopState);
            if (window.history.state?.modal === 'MealLibrary') {
                window.history.back();
            }
        };
    }, [isOpen, onClose]);

    const { data: meals, isLoading } = useQuery({
        queryKey: ['saved-meals', userId],
        queryFn: async () => {
            const res = await fetch(`/api/health/nutrition/meals?userId=${userId}`);
            if (!res.ok) throw new Error('Failed to fetch meals');
            return res.json() as Promise<SavedMeal[]>;
        },
        enabled: isOpen && !!userId,
    });

    const deleteMutation = useMutation({
        mutationFn: async (mealId: string) => {
            setDeletingId(mealId);
            const res = await fetch(`/api/health/nutrition/meals?id=${mealId}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['saved-meals'] });
            setDeletingId(null);
            toast.success('Meal deleted');
        },
        onError: () => {
            toast.error('Failed to delete meal');
            setDeletingId(null);
        },
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/80 backdrop-blur-xs sm:items-center sm:justify-center">
            <div className="bg-[#1c1c1e] w-full max-w-md h-full sm:h-auto sm:max-h-[90vh] sm:rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom">
                {/* Header */}
                <div className="flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))] border-b border-white/10 shrink-0">
                    <div className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-amber-400" />
                        <h2 className="text-lg font-bold text-white">Meal Library</h2>
                    </div>
                    <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-4 border-b border-white/5 shrink-0 bg-[#1c1c1e] sticky top-0 z-10">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search meals..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-hidden focus:border-amber-500/50 transition-colors"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                        </div>
                    ) : !meals?.length ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                                <BookOpen className="w-8 h-8 text-gray-600" />
                            </div>
                            <p className="text-gray-400 font-medium mb-1">No saved meals yet</p>
                            <p className="text-gray-500 text-sm">
                                Scan food with AI and tap &quot;Save&quot; to build your library
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {meals.filter(meal => meal.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-gray-400 font-medium">No meals match &quot;{searchQuery}&quot;</p>
                                </div>
                            ) : (
                                meals.filter(meal => meal.name.toLowerCase().includes(searchQuery.toLowerCase())).map(meal => (
                                    <div
                                        key={meal.id}
                                        className="bg-white/5 border border-white/10 rounded-xl overflow-hidden"
                                    >
                                        <button
                                            onClick={() => onSelectMeal(meal)}
                                            className="w-full text-left p-4 hover:bg-white/5 transition-colors flex items-center gap-3"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-white text-sm line-clamp-1">{meal.name}</p>
                                                <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400">
                                                    <span className="text-amber-400 font-medium">{Math.round(meal.totalCalories)} kcal</span>
                                                    <span>•</span>
                                                    <span>P: {Math.round(meal.totalProtein)}g</span>
                                                    <span>C: {Math.round(meal.totalCarbs)}g</span>
                                                    <span>F: {Math.round(meal.totalFats)}g</span>
                                                </div>
                                                <p className="text-[10px] text-gray-500 mt-1">
                                                    {meal.items.length} ingredient{meal.items.length !== 1 ? 's' : ''}
                                                </p>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />
                                        </button>
                                        <div className="border-t border-white/5 px-4 py-2 flex justify-end">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm('Delete this saved meal?')) {
                                                        deleteMutation.mutate(meal.id);
                                                    }
                                                }}
                                                disabled={deletingId === meal.id}
                                                className="text-xs text-red-400/70 hover:text-red-400 flex items-center gap-1 transition-colors disabled:opacity-50"
                                            >
                                                {deletingId === meal.id ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-3 h-3" />
                                                )}
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
