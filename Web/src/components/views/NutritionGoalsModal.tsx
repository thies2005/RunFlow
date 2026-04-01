'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { X, Target, Info, Flame, Save, Loader2, AlertTriangle, Activity } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export function NutritionGoalsModal({ isOpen, onClose }: Props) {
    const { data: session } = useSession();
    const userId = session?.user?.id;
    const queryClient = useQueryClient();

    // Fetched target data
    const { data: targetData, isLoading } = useQuery({
        queryKey: ['nutrition-target', userId],
        queryFn: async () => {
            const res = await fetch(`/api/health/nutrition/target?userId=${userId}`);
            if (!res.ok) throw new Error('Failed to fetch targets');
            return res.json();
        },
        enabled: !!userId && isOpen
    });

    // Form states
    const [targetCalories, setTargetCalories] = useState<number>(2000);
    const [proteinMultiplier, setProteinMultiplier] = useState<number>(2.0); // g per kg
    const [fatPercent, setFatPercent] = useState<number>(30);
    const [carbPercent, setCarbPercent] = useState<number>(40);
    const [proteinPercent, setProteinPercent] = useState<number>(30);
    const [exerciseCalorieFactor, setExerciseCalorieFactor] = useState<number>(0.5);
    const [exerciseCalorieSource, setExerciseCalorieSource] = useState<'strava' | 'health_connect'>('strava');
    const [waterTrackingEnabled, setWaterTrackingEnabled] = useState<boolean>(false);
    const [waterGoalMl, setWaterGoalMl] = useState<number>(2500);

    const [fastingEnabled, setFastingEnabled] = useState<boolean>(false);
    const [fastingGoalHours, setFastingGoalHours] = useState<number>(16);

    // BMR & TDEE calcs
    const [bmr, setBmr] = useState(0);
    const [tdee, setTdee] = useState(0);
    const [weight, setWeight] = useState(70);

    useEffect(() => {
        if (!isOpen) return;

        let isCancelled = false;
        let backListener: any = null;
        const setupCapacitor = async () => {
            try {
                const { Capacitor } = await import('@capacitor/core');
                if (Capacitor.isNativePlatform()) {
                    const { App } = await import('@capacitor/app');
                    const listener = await App.addListener('backButton', () => {
                        onClose();
                    });
                    if (isCancelled) {
                        listener.remove();
                    } else {
                        backListener = listener;
                    }
                }
            } catch (e) {
                console.error('Failed to setup capacitor back button', e);
            }
        };
        setupCapacitor();

        return () => {
            isCancelled = true;
            if (backListener) {
                backListener.remove();
            }
        };
    }, [isOpen, onClose]);

    useEffect(() => {
        if (targetData) {
            setTargetCalories(targetData.dailyCalories || 2000);

            const pPct = targetData.proteinPercent || 30;
            const cPct = targetData.carbsPercent || 40;
            const fPct = targetData.fatsPercent || 30;

            setProteinPercent(pPct);
            setCarbPercent(cPct);
            setFatPercent(fPct);
            setExerciseCalorieFactor(targetData.exerciseCalorieFactor ?? 0.5);
            setExerciseCalorieSource(targetData.exerciseCalorieSource || 'strava');
            setWaterTrackingEnabled(targetData.waterTrackingEnabled ?? false);
            setWaterGoalMl(targetData.waterGoalMl ?? 2500);

            setFastingEnabled(targetData.fastingEnabled ?? false);
            setFastingGoalHours(targetData.fastingGoalHours ?? 16);

            let w = 70;
            if (targetData.userProfile?.weight) {
                w = targetData.userProfile.weight;
                setWeight(w);
            }

            // Derive BMR (Mifflin-St Jeor)
            let calculatedBmr = 1600; // default fallback
            if (targetData.userProfile) {
                const { weight: wUser, height: hUser, birthDate, sex } = targetData.userProfile;
                if (wUser && hUser && birthDate) {
                    const ageInMs = Date.now() - new Date(birthDate).getTime();
                    const age = Math.abs(new Date(ageInMs).getUTCFullYear() - 1970);

                    if (sex === 'MALE') {
                        calculatedBmr = (10 * wUser) + (6.25 * hUser) - (5 * age) + 5;
                    } else if (sex === 'FEMALE') {
                        calculatedBmr = (10 * wUser) + (6.25 * hUser) - (5 * age) - 161;
                    }
                }
            }
            setBmr(calculatedBmr);

            // TDEE = BMR + Active Calories + TEF
            // TEF (Thermic Effect of Food) is approx 10% of BMR
            const activeCals = targetData.avgActiveCalories || 0;
            const calculatedTdee = calculatedBmr + activeCals + (calculatedBmr * 0.1);
            setTdee(calculatedTdee);

            // Re-derive protein multiplier from percentage if weight exists
            if (w > 0) {
                const proteinGrams = (targetData.dailyCalories * (pPct / 100)) / 4;
                setProteinMultiplier(proteinGrams / w);
            }
        }
    }, [targetData]);

    // Handle Calorie changes
    const handleCalorieChange = (cals: number) => {
        setTargetCalories(cals);
        recalculateMacros(cals, proteinMultiplier);
    };

    // Handle Protein Multiplier changes
    const handleProteinChange = (mult: number) => {
        setProteinMultiplier(mult);
        recalculateMacros(targetCalories, mult);
    };

    // Keep calories static, adjust fat & carbs
    const handleFatChange = (newFatPct: number) => {
        const remainingPct = 100 - proteinPercent;
        const boundedFat = Math.min(Math.max(newFatPct, 0), remainingPct);
        const newCarbPct = remainingPct - boundedFat;
        setFatPercent(boundedFat);
        setCarbPercent(newCarbPct);
    };

    const recalculateMacros = (cals: number, mult: number) => {
        const pGrams = mult * weight;
        const pCals = pGrams * 4;
        const pPct = (pCals / cals) * 100;

        let safePPct = Math.min(pPct, 100);
        let remaining = 100 - safePPct;

        // Preserve fat/carb ratio
        const currentFatRatio = fatPercent / (fatPercent + carbPercent || 1);
        const fPct = remaining * currentFatRatio;
        const cPct = remaining * (1 - currentFatRatio);

        setProteinPercent(safePPct);
        setFatPercent(fPct);
        setCarbPercent(cPct);
    };

    // Derived actual grams
    const pGrams = (targetCalories * (proteinPercent / 100)) / 4;
    const cGrams = (targetCalories * (carbPercent / 100)) / 4;
    const fGrams = (targetCalories * (fatPercent / 100)) / 9;

    const isFatWarning = fGrams < 50;

    const saveMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/health/nutrition/target', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    dailyCalories: Math.round(targetCalories),
                    proteinPercent: proteinPercent,
                    carbsPercent: carbPercent,
                    fatsPercent: fatPercent,
                    exerciseCalorieFactor,
                    exerciseCalorieSource,
                    waterTrackingEnabled,
                    waterGoalMl,
                    fastingEnabled,
                    fastingGoalHours
                })
            });
            if (!res.ok) throw new Error('Failed to save');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['nutrition-analytics'] });
            queryClient.invalidateQueries({ queryKey: ['nutrition-target'] });
            toast.success('Nutrition goals saved');
            onClose();
        },
        onError: () => toast.error('Error saving nutrition goals')
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/80 backdrop-blur-xs sm:items-center sm:justify-center">
            <div className="bg-[#1c1c1e] w-full max-w-md h-full sm:h-auto sm:max-h-[90vh] sm:rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom">

                {/* Header */}
                <div className="flex items-center justify-between p-4 pt-safe border-b border-white/10 shrink-0">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Target className="w-5 h-5 text-pink-500" />
                        Nutrition Targets
                    </h2>
                    <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="w-8 h-8 flex animate-spin text-pink-500" />
                        </div>
                    ) : (
                        <>
                            {/* Insight box */}
                            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-gray-300 flex items-center gap-1.5"><Flame className="w-4 h-4 text-orange-400" /> Est. BMR</span>
                                    <span className="text-white font-bold">{Math.round(bmr)} kcal</span>
                                </div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-gray-300 flex items-center gap-1.5"><Activity className="w-4 h-4 text-blue-400" /> Avg Daily Activity</span>
                                    <span className="text-white font-bold">{Math.round(targetData?.avgActiveCalories || 0)} kcal</span>
                                </div>
                                <div className="h-px bg-white/10 my-2"></div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-300">Est. TDEE (Maintenance)</span>
                                    <span className="text-pink-400 font-bold">{Math.round(tdee)} kcal</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-3 flex gap-1">
                                    <Info className="w-3.5 h-3.5 shrink-0" />
                                    TDEE includes your Base Metabolic Rate + TEF (10%) + average activity from the past 30 days.
                                </p>
                            </div>

                            {/* Calories Slider */}
                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <label className="text-sm font-semibold text-white">Daily Calorie Target</label>
                                    <span className="text-2xl font-bold text-pink-500">{Math.round(targetCalories)} <span className="text-xs font-normal text-gray-400">kcal</span></span>
                                </div>

                                <input
                                    type="range"
                                    min="800"
                                    max="5000"
                                    step="50"
                                    value={targetCalories}
                                    onChange={(e) => handleCalorieChange(parseFloat(e.target.value))}
                                    className="w-full accent-pink-500 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                />
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>Extreme Diet (800)</span>
                                    <span className="text-pink-400/80 cursor-pointer" onClick={() => handleCalorieChange(tdee)}>Set Maintenance</span>
                                    <span>Extreme Bulk (5000)</span>
                                </div>
                            </div>

                            {/* Protein Slider */}
                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <label className="text-sm font-semibold text-white">Protein Target</label>
                                    <span className="text-lg font-bold text-blue-400">{proteinMultiplier.toFixed(1)} <span className="text-xs font-normal text-gray-400">g/kg</span></span>
                                </div>

                                <input
                                    type="range"
                                    min="0.8"
                                    max="3.0"
                                    step="0.1"
                                    value={proteinMultiplier}
                                    onChange={(e) => handleProteinChange(parseFloat(e.target.value))}
                                    className="w-full accent-blue-500 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                />
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>Min (0.8g)</span>
                                    <span>Max (3.0g)</span>
                                </div>
                            </div>

                            {/* Macros Result */}
                            <div>
                                <h3 className="text-sm font-semibold text-white mb-3">Macro Distribution</h3>

                                <div className="flex h-3 rounded-full overflow-hidden mb-4 bg-white/10">
                                    <div style={{ width: `${proteinPercent}%` }} className="bg-blue-500" />
                                    <div style={{ width: `${carbPercent}%` }} className="bg-green-500" />
                                    <div style={{ width: `${fatPercent}%` }} className="bg-orange-500" />
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                                    <div className="bg-white/5 rounded-lg p-2 border border-blue-500/20">
                                        <div className="text-blue-400 font-bold mb-0.5">{proteinPercent.toFixed(0)}%</div>
                                        <div className="text-white">{Math.round(pGrams)}g</div>
                                        <div className="text-xs text-gray-500">Protein</div>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-2 border border-green-500/20">
                                        <div className="text-green-400 font-bold mb-0.5">{carbPercent.toFixed(0)}%</div>
                                        <div className="text-white">{Math.round(cGrams)}g</div>
                                        <div className="text-xs text-gray-500">Carbs</div>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-2 border border-orange-500/20">
                                        <div className="text-orange-400 font-bold mb-0.5">{fatPercent.toFixed(0)}%</div>
                                        <div className="text-white">{Math.round(fGrams)}g</div>
                                        <div className="text-xs text-gray-500">Fats</div>
                                    </div>
                                </div>

                                {/* Fat & Carb Balancer */}
                                <div className="mt-4">
                                    <label className="text-xs font-medium text-gray-400 flex justify-between mb-2">
                                        <span>Balance Fats vs Carbs</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max={100 - proteinPercent}
                                        step="1"
                                        value={fatPercent}
                                        onChange={(e) => handleFatChange(parseFloat(e.target.value))}
                                        className="w-full accent-orange-500 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>

                                {isFatWarning && (
                                    <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-400 flex gap-2">
                                        <AlertTriangle className="w-4 h-4 shrink-0" />
                                        <span>
                                            Warning: Dietary fat below 50g per day is generally not recommended for hormone health and essential vitamin absorption. Consider increasing fats.
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Additional Settings */}
                            <div className="border-t border-white/10 pt-6">
                                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-blue-400" />
                                    Tracking Preferences
                                </h3>

                                {/* Exercise Calorie Source */}
                                <div className="mb-6">
                                    <label className="text-sm font-semibold text-white block mb-2">Exercise Calorie Source</label>
                                    <p className="text-xs text-gray-500 mb-3">
                                        Choose where your active calories are imported from.
                                    </p>
                                    <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
                                        <button
                                            onClick={() => setExerciseCalorieSource('strava')}
                                            className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${exerciseCalorieSource === 'strava' ? 'bg-[#fc4c02] text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                        >
                                            Strava
                                        </button>
                                        <button
                                            onClick={() => setExerciseCalorieSource('health_connect')}
                                            className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${exerciseCalorieSource === 'health_connect' ? 'bg-blue-500 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                        >
                                            Health Connect
                                        </button>
                                    </div>
                                    {exerciseCalorieSource === 'health_connect' && (
                                        <div className="mt-2 text-[10px] text-blue-400/80 bg-blue-500/10 px-2 py-1.5 rounded flex gap-1.5 items-start">
                                            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                            <p>Requires the mobile app with Health Connect permissions configured.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Exercise Calorie Factor */}
                                <div className="mb-6">
                                    <div className="flex justify-between items-end mb-2">
                                        <label className="text-sm font-semibold text-white">Exercise Calorie Factor</label>
                                        <span className="text-lg font-bold text-pink-400">{exerciseCalorieFactor.toFixed(2)}x</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-3">
                                        How heavily should tracked exercise calories impact your remaining budget? (0 = ignore exercise, 1 = full credit).
                                    </p>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={exerciseCalorieFactor}
                                        onChange={(e) => setExerciseCalorieFactor(parseFloat(e.target.value))}
                                        className="w-full accent-pink-500 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                                        <span>Ignore (0x)</span>
                                        <span>Half (0.5x)</span>
                                        <span>Full (1x)</span>
                                    </div>
                                </div>

                                {/* Water Tracking */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <label className="text-sm font-semibold text-white">Water Tracker</label>
                                            <p className="text-xs text-gray-500 mt-0.5">Enable the water logging card on your dashboard.</p>
                                        </div>
                                        <button
                                            onClick={() => setWaterTrackingEnabled(!waterTrackingEnabled)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${waterTrackingEnabled ? 'bg-blue-500' : 'bg-gray-600'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${waterTrackingEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>

                                    {waterTrackingEnabled && (
                                        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                                            <label className="text-xs font-semibold text-gray-400 mb-1 block">Daily Water Goal (ml)</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    value={waterGoalMl}
                                                    onChange={(e) => setWaterGoalMl(parseInt(e.target.value) || 0)}
                                                    className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full focus:outline-hidden focus:border-blue-500"
                                                    min="500"
                                                    step="100"
                                                />
                                                <span className="text-xs font-semibold text-gray-500 bg-white/5 py-2 px-3 rounded-lg">ml</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Intermittent Fasting */}
                                <div className="space-y-4 pt-4 border-t border-white/5">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <label className="text-sm font-semibold text-white">Intermittent Fasting Timer</label>
                                            <p className="text-xs text-gray-500 mt-0.5">Enable the fasting tracker on your dashboard.</p>
                                        </div>
                                        <button
                                            onClick={() => setFastingEnabled(!fastingEnabled)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${fastingEnabled ? 'bg-blue-500' : 'bg-gray-600'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${fastingEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>

                                    {fastingEnabled && (
                                        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                                            <label className="text-xs font-semibold text-gray-400 mb-1 block">Daily Fasting Goal (Hours)</label>
                                            <div className="flex gap-2">
                                                {[12, 16, 18, 20].map(h => (
                                                    <button
                                                        key={h}
                                                        onClick={() => setFastingGoalHours(h)}
                                                        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${fastingGoalHours === h ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' : 'bg-black/50 text-gray-400 border-white/10 hover:border-white/20'}`}
                                                    >
                                                        {h}h
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 pb-8 sm:pb-4 pb-safe border-t border-white/10 shrink-0">
                    <button
                        onClick={() => saveMutation.mutate()}
                        disabled={saveMutation.isPending || isLoading}
                        className="w-full py-3 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2 rounded-xl transition-colors"
                    >
                        {saveMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Save Targets
                    </button>
                </div>

            </div>
        </div>
    );
}
