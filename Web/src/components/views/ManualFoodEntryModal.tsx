'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useSession } from 'next-auth/react';
import { X, Search, Loader2, Save, ArrowLeft } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

interface FoodData {
    name: string;
    brand?: string;
    barcode?: string | null;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    servingSize?: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onLogSuccess?: () => void;
    initialFood?: FoodData | null;
}

export function ManualFoodEntryModal({ isOpen, onClose, onLogSuccess, initialFood }: Props) {
    const { data: session } = useSession();
    const userId = session?.user?.id;
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState<'search' | 'custom'>('search');

    // Search State
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Custom Entry State
    const [customName, setCustomName] = useState('');
    const [customCalories, setCustomCalories] = useState('');
    const [customProtein, setCustomProtein] = useState('');
    const [customCarbs, setCustomCarbs] = useState('');
    const [customFats, setCustomFats] = useState('');
    const [customServingSize, setCustomServingSize] = useState('100g'); // default

    // Log State (Step 2)
    const [selectedFood, setSelectedFood] = useState<any | null>(null);
    const [quantity, setQuantity] = useState('1');
    const [mealType, setMealType] = useState('SNACK');

    // When opened with initialFood (e.g. from barcode scan), jump straight to log view
    useEffect(() => {
        if (isOpen && initialFood) {
            setSelectedFood({
                name: initialFood.name,
                brand: initialFood.brand || '',
                barcode: initialFood.barcode || null,
                calories: initialFood.calories || 0,
                protein: initialFood.protein || 0,
                carbs: initialFood.carbs || 0,
                fats: initialFood.fats || 0,
                servingSize: initialFood.servingSize || '100g',
            });
        }
    }, [isOpen, initialFood]);

    useEffect(() => {
        if (!isOpen) return;

        window.history.pushState({ modal: 'ManualFoodEntry' }, '');

        const handlePopState = () => {
            onClose();
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
            if (window.history.state?.modal === 'ManualFoodEntry') {
                window.history.back();
            }
        };
    }, [isOpen, onClose]);

    const resetState = () => {
        setActiveTab('search');
        setQuery('');
        setSearchResults([]);
        setCustomName('');
        setCustomCalories('');
        setCustomProtein('');
        setCustomCarbs('');
        setCustomFats('');
        setCustomServingSize('100g');
        setSelectedFood(null);
        setQuantity('1');
        setMealType('SNACK');
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const searchFood = async (e: FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setIsSearching(true);
        try {
            const res = await fetch(`/api/health/nutrition/search?q=${encodeURIComponent(query)}`);
            if (!res.ok) throw new Error('Search failed');
            const data = await res.json();
            setSearchResults(data);
        } catch (error) {
            console.error(error);
            alert("Error searching database.");
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectFood = (food: any) => {
        setSelectedFood({
            name: food.name,
            brand: food.brand,
            barcode: food.barcode,
            calories: parseFloat(food.calories) || 0,
            protein: parseFloat(food.protein) || 0,
            carbs: parseFloat(food.carbs) || 0,
            fats: parseFloat(food.fats) || 0,
            servingSize: food.servingSize || '1 serving',
        });
    };

    const handleCustomSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!customName.trim() || !customCalories) return;

        setSelectedFood({
            name: customName,
            brand: 'Custom',
            barcode: null, // manual
            calories: parseFloat(customCalories) || 0,
            protein: parseFloat(customProtein) || 0,
            carbs: parseFloat(customCarbs) || 0,
            fats: parseFloat(customFats) || 0,
            servingSize: customServingSize,
        });
    };

    const logMutation = useMutation({
        mutationFn: async () => {
            if (!userId) throw new Error('Not logged in');
            const res = await fetch('/api/health/nutrition/log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    date: format(new Date(), 'yyyy-MM-dd'),
                    mealType,
                    quantity: parseFloat(quantity) || 1,
                    foodItem: selectedFood
                })
            });
            if (!res.ok) throw new Error('Failed to log food');
            return res.json();
        },
        onSuccess: () => {
            alert('Food logged successfully!');
            queryClient.invalidateQueries({ queryKey: ['daily-health'] });
            if (onLogSuccess) onLogSuccess();
            handleClose();
        },
        onError: (err) => {
            console.error(err);
            alert('Failed to log food. Try again.');
        }
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/80 backdrop-blur-sm sm:items-center sm:justify-center">
            <div className="bg-[#1c1c1e] w-full max-w-md h-full sm:h-auto sm:max-h-[90vh] sm:rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom">

                {/* Header */}
                <div className="flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))] border-b border-white/10 shrink-0">
                    <div className="flex items-center gap-2">
                        {selectedFood && (
                            <button onClick={() => setSelectedFood(null)} className="p-1 -ml-2 text-gray-400 hover:text-white">
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        )}
                        <h2 className="text-lg font-bold text-white">
                            {selectedFood ? 'Log Food' : 'Add Food'}
                        </h2>
                    </div>
                    <button onClick={handleClose} className="p-2 -mr-2 text-gray-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {!selectedFood ? (
                    <>
                        {/* Tabs */}
                        <div className="flex border-b border-white/10 shrink-0">
                            <button
                                onClick={() => setActiveTab('search')}
                                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'search' ? 'text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-gray-300'}`}
                            >
                                Search DB
                            </button>
                            <button
                                onClick={() => setActiveTab('custom')}
                                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'custom' ? 'text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-gray-300'}`}
                            >
                                Custom Entry
                            </button>
                        </div>

                        {/* Search Body */}
                        {activeTab === 'search' && (
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <form onSubmit={searchFood} className="p-4 shrink-0 flex gap-2">
                                    <input
                                        type="text"
                                        value={query}
                                        onChange={e => setQuery(e.target.value)}
                                        placeholder="Search bananas, apples..."
                                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                                    />
                                    <button
                                        type="submit"
                                        disabled={isSearching || !query.trim()}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
                                    >
                                        {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                                    </button>
                                </form>

                                <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
                                    {searchResults.length === 0 && !isSearching && query && (
                                        <p className="text-center text-gray-400 mt-8 text-sm">No results found.</p>
                                    )}
                                    {searchResults.map((food, i) => (
                                        <button
                                            key={food.id || i}
                                            onClick={() => handleSelectFood(food)}
                                            className="w-full text-left p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex justify-between items-center"
                                        >
                                            <div>
                                                <p className="font-medium text-white line-clamp-1">{food.name}</p>
                                                <p className="text-xs text-gray-400">{food.brand ? `${food.brand} • ` : ''}{food.servingSize}</p>
                                            </div>
                                            <div className="text-right shrink-0 ml-2">
                                                <p className="text-sm font-bold text-blue-400">{Math.round(food.calories)}</p>
                                                <p className="text-[10px] text-gray-500 uppercase">kcal</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Custom Body */}
                        {activeTab === 'custom' && (
                            <form onSubmit={handleCustomSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
                                <div>
                                    <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1.5 font-medium">Food Name *</label>
                                    <input required type="text" value={customName} onChange={e => setCustomName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-gray-600 focus:outline-none" placeholder="e.g. Homemade Pasta" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1.5 font-medium">Calories (kcal) *</label>
                                        <input required type="number" step="any" value={customCalories} onChange={e => setCustomCalories(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-gray-600 focus:outline-none" placeholder="0" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1.5 font-medium">Serving Size</label>
                                        <input type="text" value={customServingSize} onChange={e => setCustomServingSize(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-gray-600 focus:outline-none" placeholder="e.g. 100g or 1 piece" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1.5 font-medium">Protein (g)</label>
                                        <input type="number" step="any" value={customProtein} onChange={e => setCustomProtein(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-gray-600 focus:outline-none" placeholder="0" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1.5 font-medium">Carbs (g)</label>
                                        <input type="number" step="any" value={customCarbs} onChange={e => setCustomCarbs(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-gray-600 focus:outline-none" placeholder="0" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1.5 font-medium">Fats (g)</label>
                                        <input type="number" step="any" value={customFats} onChange={e => setCustomFats(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-gray-600 focus:outline-none" placeholder="0" />
                                    </div>
                                </div>
                                <button type="submit" disabled={!customName || !customCalories} className="w-full mt-2 bg-blue-600 disabled:bg-gray-600 text-white font-semibold py-3 flex items-center justify-center gap-2 rounded-xl transition-colors">
                                    Next <ArrowLeft className="w-4 h-4 rotate-180" />
                                </button>
                            </form>
                        )}
                    </>
                ) : (
                    /* Step 2: Logging Details */
                    <div className="flex-1 flex flex-col p-4 overflow-y-auto">
                        <div className="bg-white/5 border border-white/10 p-4 rounded-xl mb-6">
                            <h3 className="text-xl font-bold text-white mb-1">{selectedFood.name}</h3>
                            <p className="text-sm text-gray-400 mb-4">{selectedFood.brand ? `${selectedFood.brand} • ` : ''}{selectedFood.servingSize}</p>

                            <div className="grid grid-cols-4 gap-2 text-center">
                                <div className="bg-black/50 p-2 rounded-lg">
                                    <p className="text-[10px] text-gray-400 uppercase mb-1">Cals</p>
                                    <p className="font-bold text-blue-400">{Math.round(selectedFood.calories)}</p>
                                </div>
                                <div className="bg-black/50 p-2 rounded-lg">
                                    <p className="text-[10px] text-gray-400 uppercase mb-1">Pro</p>
                                    <p className="font-medium text-white">{Math.round(selectedFood.protein)}g</p>
                                </div>
                                <div className="bg-black/50 p-2 rounded-lg">
                                    <p className="text-[10px] text-gray-400 uppercase mb-1">Carb</p>
                                    <p className="font-medium text-white">{Math.round(selectedFood.carbs)}g</p>
                                </div>
                                <div className="bg-black/50 p-2 rounded-lg">
                                    <p className="text-[10px] text-gray-400 uppercase mb-1">Fat</p>
                                    <p className="font-medium text-white">{Math.round(selectedFood.fats)}g</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1.5 font-medium">Quantity (Number of servings)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={quantity}
                                    onChange={e => setQuantity(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-gray-600 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1.5 font-medium">Meal Type</label>
                                <select
                                    value={mealType}
                                    onChange={e => setMealType(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white focus:outline-none appearance-none"
                                >
                                    <option value="BREAKFAST">Breakfast</option>
                                    <option value="LUNCH">Lunch</option>
                                    <option value="DINNER">Dinner</option>
                                    <option value="SNACK">Snack</option>
                                </select>
                            </div>
                        </div>

                        <div className="mt-auto pt-6">
                            <button
                                onClick={() => logMutation.mutate()}
                                disabled={logMutation.isPending || !quantity}
                                className="w-full py-3 bg-white text-black font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 disabled:opacity-50 transition-colors"
                            >
                                {logMutation.isPending ? 'Logging...' : <><Save className="w-4 h-4" /> Log {quantity} x {Math.round(selectedFood.calories * (parseFloat(quantity) || 1))} kcal</>}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
