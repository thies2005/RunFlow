'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import { useSession } from 'next-auth/react';
import { X, Search, Loader2, Save, ArrowLeft, Bookmark, History, Star } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { getCurrentUtcDayKey } from '@/lib/health/dates';

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
    defaultTab?: 'search' | 'custom';
    defaultMealType?: string;
}

export function ManualFoodEntryModal({ isOpen, onClose, onLogSuccess, initialFood, defaultTab, defaultMealType }: Props) {
    const { data: session } = useSession();
    const userId = session?.user?.id;
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState<'search' | 'custom'>('search');

    // Search State
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isOffSearching, setIsOffSearching] = useState(false);
    const [isFsSearching, setIsFsSearching] = useState(false);

    // Recent & Frequent Foods
    const { data: recentFrequent, isLoading: isRecentLoading } = useQuery({
        queryKey: ['recent-frequent-foods'],
        queryFn: async () => {
            const res = await fetch('/api/health/nutrition/recent');
            if (!res.ok) throw new Error('Failed to fetch recent foods');
            return res.json() as Promise<{ recent: any[], frequent: any[] }>;
        },
        enabled: isOpen && activeTab === 'search' && !query.trim(),
    });

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

    const [isSaving, setIsSaving] = useState(false);
    const [savedMessage, setSavedMessage] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // When opened with initialFood (e.g. from barcode scan), jump straight to log view
    useEffect(() => {
        if (isOpen) {
            if (initialFood) {
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
            if (defaultTab) setActiveTab(defaultTab);
            if (defaultMealType) setMealType(defaultMealType);
        }
    }, [isOpen, initialFood, defaultTab, defaultMealType]);

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
        setIsSaving(false);
        setSavedMessage(null);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const searchFood = async (e: FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setIsSearching(true);
        setSearchResults([]); // Reset results for new search

        // Cancel previous search if it exists
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            // 1. Fetch instant local/BLS results
            const res = await fetch(`/api/health/nutrition/search?q=${encodeURIComponent(query)}`, {
                signal: controller.signal
            });
            if (!res.ok) throw new Error('Search failed');
            const data = await res.json();
            setSearchResults(data);

            // If we got results, we can stop the main loading spinner but show a subtle progress or just let them append
            setIsSearching(false);

            // 2. Background fetch Open Food Facts (v2 slow API)
            setIsOffSearching(true);
            fetch(`/api/health/nutrition/search-off?q=${encodeURIComponent(query)}`, {
                signal: controller.signal
            })
                .then(async (offRes) => {
                    if (!offRes.ok) return;
                    const offData = await offRes.json();
                    if (offData && offData.length > 0) {
                        setSearchResults(prev => {
                            const seenKeys = new Set(prev.map(item => `${String(item.name || '').toLowerCase().trim()}|${String(item.brand || '').toLowerCase().trim()}`));
                            const newItems = offData.filter((item: any) => {
                                const key = `${String(item.name || '').toLowerCase().trim()}|${String(item.brand || '').toLowerCase().trim()}`;
                                return !seenKeys.has(key);
                            });
                            return [...prev, ...newItems];
                        });
                    }
                })
                .catch(err => {
                    if (err.name !== 'AbortError') console.error("OFF search background error:", err);
                })
                .finally(() => setIsOffSearching(false));

            // 3. Background fetch FatSecret via new API
            setIsFsSearching(true);
            fetch(`/api/health/nutrition/search-fs?q=${encodeURIComponent(query)}`, {
                signal: controller.signal
            })
                .then(async (fsRes) => {
                    if (!fsRes.ok) return;
                    const fsData = await fsRes.json();
                    if (fsData && fsData.length > 0) {
                        setSearchResults(prev => {
                            const seenKeys = new Set(prev.map(item => `${String(item.name || '').toLowerCase().trim()}|${String(item.brand || '').toLowerCase().trim()}`));
                            const newItems = fsData.filter((item: any) => {
                                const key = `${String(item.name || '').toLowerCase().trim()}|${String(item.brand || '').toLowerCase().trim()}`;
                                return !seenKeys.has(key);
                            });
                            return [...prev, ...newItems];
                        });
                    }
                })
                .catch(err => {
                    if (err.name !== 'AbortError') console.error("FatSecret search background error:", err);
                })
                .finally(() => setIsFsSearching(false));

        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.error(error);
                toast.error('Error searching database.');
                setIsSearching(false);
            }
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

    const handleSaveToLibrary = async () => {
        if (!userId || !selectedFood) return;
        setIsSaving(true);
        setSavedMessage(null);

        const mult = parseFloat(quantity) || 1;

        try {
            const res = await fetch('/api/health/nutrition/meals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    name: selectedFood.name,
                    items: [{
                        name: selectedFood.name,
                        estimatedGrams: 100 * mult,
                        calories: Math.round(selectedFood.calories * mult),
                        protein: Math.round(selectedFood.protein * mult * 10) / 10,
                        carbs: Math.round(selectedFood.carbs * mult * 10) / 10,
                        fats: Math.round(selectedFood.fats * mult * 10) / 10,
                    }],
                    totalCalories: Math.round(selectedFood.calories * mult),
                    totalProtein: Math.round(selectedFood.protein * mult * 10) / 10,
                    totalCarbs: Math.round(selectedFood.carbs * mult * 10) / 10,
                    totalFats: Math.round(selectedFood.fats * mult * 10) / 10,
                }),
            });

            if (!res.ok) throw new Error('Failed to save');
            setSavedMessage('Saved to library!');
            queryClient.invalidateQueries({ queryKey: ['saved-meals'] });
        } catch {
            toast.error('Failed to save to library');
        } finally {
            setIsSaving(false);
        }
    };

    const logMutation = useMutation({
        mutationFn: async () => {
            if (!userId) throw new Error('Not logged in');
            const res = await fetch('/api/health/nutrition/log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    date: getCurrentUtcDayKey(),
                    mealType,
                    quantity: parseFloat(quantity) || 1,
                    foodItem: selectedFood
                })
            });
            if (!res.ok) throw new Error('Failed to log food');
            return res.json();
        },
        onSuccess: () => {
            toast.success('Food logged successfully');
            queryClient.invalidateQueries({ queryKey: ['daily-health'] });
            if (onLogSuccess) onLogSuccess();
            handleClose();
        },
        onError: (err) => {
            console.error(err);
            toast.error('Failed to log food. Try again.');
        }
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/80 backdrop-blur-xs sm:items-center sm:justify-center">
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
                                    <Input
                                        type="text"
                                        value={query}
                                        onChange={e => setQuery(e.target.value)}
                                        placeholder="Search bananas, apples..."
                                        className="flex-1 !bg-white/5 border-white/10"
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
                                    {!query.trim() && isRecentLoading && (
                                        <div className="flex items-center justify-center py-8 text-gray-500">
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        </div>
                                    )}

                                    {!query.trim() && (recentFrequent?.recent?.length ?? 0) > 0 && (
                                        <div className="mb-6">
                                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5 px-1"><History className="w-3.5 h-3.5"/> Recent Foods</h3>
                                            <div className="space-y-2">
                                                {recentFrequent?.recent?.map((food: any, i: number) => (
                                                    <button
                                                        key={`recent-${food.id || i}`}
                                                        onClick={() => handleSelectFood(food)}
                                                        className="w-full text-left p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex justify-between items-center"
                                                    >
                                                        <div>
                                                            <p className="font-medium text-white line-clamp-1">{food.name}</p>
                                                            <p className="text-xs text-gray-400">
                                                                {food.brand ? `${food.brand} • ` : ''}
                                                                {food.servingSize}
                                                            </p>
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

                                    {!query.trim() && (recentFrequent?.frequent?.length ?? 0) > 0 && (
                                        <div className="mb-6">
                                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5 px-1"><Star className="w-3.5 h-3.5 text-yellow-500/80"/> Frequent Foods</h3>
                                            <div className="space-y-2">
                                                {recentFrequent?.frequent?.map((food: any, i: number) => (
                                                    <button
                                                        key={`freq-${food.id || i}`}
                                                        onClick={() => handleSelectFood(food)}
                                                        className="w-full text-left p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex justify-between items-center"
                                                    >
                                                        <div>
                                                            <p className="font-medium text-white line-clamp-1">{food.name}</p>
                                                            <p className="text-xs text-gray-400">
                                                                {food.brand ? `${food.brand} • ` : ''}
                                                                {food.servingSize}
                                                            </p>
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

                                    {searchResults.length === 0 && !isSearching && !isOffSearching && !isFsSearching && query.trim() && (
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
                                                <p className="text-xs text-gray-400">
                                                    {food.brand ? `${food.brand} • ` : ''}
                                                    {food.servingSize}
                                                    {food.source === 'off' ? ' (OFF)' : food.source === 'fs' ? ' (FatSecret)' : ''}
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0 ml-2">
                                                <p className="text-sm font-bold text-blue-400">{Math.round(food.calories)}</p>
                                                <p className="text-[10px] text-gray-500 uppercase">kcal</p>
                                            </div>
                                        </button>
                                    ))}
                                    {(isOffSearching || isFsSearching) && (
                                        <div className="flex items-center justify-center gap-2 py-4 text-gray-500">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span className="text-xs">
                                                Searching {isOffSearching && isFsSearching ? 'external databases...' : isOffSearching ? 'Open Food Facts...' : 'FatSecret...'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Custom Body */}
                        {activeTab === 'custom' && (
                            <form onSubmit={handleCustomSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
                                <div>
                                    <Input required label="Food Name *" type="text" value={customName} onChange={e => setCustomName(e.target.value)} className="!bg-white/5 border-white/10" placeholder="e.g. Homemade Pasta" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Input required label="Calories (kcal) *" type="number" step="any" value={customCalories} onChange={e => setCustomCalories(e.target.value)} className="!bg-white/5 border-white/10" placeholder="0" />
                                    </div>
                                    <div>
                                        <Input label="Serving Size" type="text" value={customServingSize} onChange={e => setCustomServingSize(e.target.value)} className="!bg-white/5 border-white/10" placeholder="e.g. 100g or 1 piece" />
                                    </div>
                                    <div>
                                        <Input label="Protein (g)" type="number" step="any" value={customProtein} onChange={e => setCustomProtein(e.target.value)} className="!bg-white/5 border-white/10" placeholder="0" />
                                    </div>
                                    <div>
                                        <Input label="Carbs (g)" type="number" step="any" value={customCarbs} onChange={e => setCustomCarbs(e.target.value)} className="!bg-white/5 border-white/10" placeholder="0" />
                                    </div>
                                    <div>
                                        <Input label="Fats (g)" type="number" step="any" value={customFats} onChange={e => setCustomFats(e.target.value)} className="!bg-white/5 border-white/10" placeholder="0" />
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
                                <Input
                                    label="Quantity (Number of servings)"
                                    type="number"
                                    step="0.1"
                                    value={quantity}
                                    onChange={e => setQuantity(e.target.value)}
                                    className="!bg-white/5 border-white/10"
                                />
                            </div>

                            <div>
                                <Select
                                    label="Meal Type"
                                    value={mealType}
                                    onChange={e => setMealType(e.target.value)}
                                    className="!bg-white/5 border-white/10"
                                >
                                    <option value="BREAKFAST">Breakfast</option>
                                    <option value="LUNCH">Lunch</option>
                                    <option value="DINNER">Dinner</option>
                                    <option value="SNACK">Snack</option>
                                </Select>
                            </div>
                        </div>

                        <div className="mt-auto pt-6 flex gap-2">
                            <button
                                onClick={handleSaveToLibrary}
                                disabled={isSaving || !!savedMessage || !quantity}
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
                            <button
                                onClick={() => logMutation.mutate()}
                                disabled={logMutation.isPending || !quantity}
                                className="flex-1 py-3 bg-white text-black font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 disabled:opacity-50 transition-colors"
                            >
                                {logMutation.isPending ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Logging...</>
                                ) : (
                                    <><Save className="w-4 h-4" /> Log {quantity} x {Math.round(selectedFood.calories * (parseFloat(quantity) || 1))} kcal</>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
