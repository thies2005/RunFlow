'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Search, Camera, ScanBarcode, BookOpen, Utensils } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { ManualFoodEntryModal } from '../ManualFoodEntryModal';
import { FoodScannerModal } from '../FoodScannerModal';
import { MealLibraryModal } from '../MealLibraryModal';
import { AiMealSuggestionModal } from '../AiMealSuggestionModal';
import type { FoodScanResult } from '@/lib/types/health';

const BarcodeScannerModal = dynamic(
    () => import('../BarcodeScannerModal').then((mod) => mod.BarcodeScannerModal),
    { ssr: false }
);

export type AddFoodTab = 'search' | 'photo' | 'barcode' | 'meals' | 'suggestions';

const FOOD_TABS: Array<{
    id: AddFoodTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
}> = [
    { id: 'search', label: 'Search & Log', icon: Search },
    { id: 'photo', label: 'Photo Scan', icon: Camera },
    { id: 'barcode', label: 'Barcode', icon: ScanBarcode },
    { id: 'meals', label: 'Saved Meals', icon: BookOpen },
    { id: 'suggestions', label: 'Suggestions', icon: Utensils },
];

export interface ScannedFoodItem {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    brand?: string;
    barcode?: string | null;
    servingSize?: string;
}

export interface AddFoodSheetProps {
    isOpen: boolean;
    onClose: () => void;
    initialTab?: AddFoodTab;
    defaultMealType?: string;
    preAuthorizedStream?: MediaStream | null;
    remainingMacros: {
        calories: number;
        protein: number;
        carbs: number;
        fats: number;
    };
    onLogSuccess: () => void;
    onScanResult: (_result: FoodScanResult) => void;
}

export function AddFoodSheet({
    isOpen,
    onClose,
    initialTab = 'search',
    defaultMealType,
    preAuthorizedStream,
    remainingMacros,
    onLogSuccess,
    onScanResult,
}: AddFoodSheetProps) {
    const [activeTab, setActiveTab] = useState<AddFoodTab>(initialTab);
    const [scannedFood, setScannedFood] = useState<ScannedFoodItem | null>(null);
    const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

    useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab);
        } else {
            setScannedFood(null);
        }
    }, [isOpen, initialTab]);

    const handleBarcodeScanned = useCallback(async (barcode: string) => {
        try {
            const res = await fetch(`/api/health/nutrition/scan?barcode=${barcode}`);
            const data = await res.json();
            if (res.ok && data.name) {
                setScannedFood(data);
                setActiveTab('search');
            } else {
                toast.error(data.error || 'Product not found');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error finding food');
        }
    }, []);

    const handleTabKeyDown = (e: React.KeyboardEvent, index: number) => {
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            const next = (index + 1) % FOOD_TABS.length;
            setActiveTab(FOOD_TABS[next].id);
            tabRefs.current[next]?.focus();
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            const prev = (index - 1 + FOOD_TABS.length) % FOOD_TABS.length;
            setActiveTab(FOOD_TABS[prev].id);
            tabRefs.current[prev]?.focus();
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Log food"
            maxWidth="lg"
        >
            <div className="flex flex-col min-h-[420px] max-h-[75vh]">
                <div
                    role="tablist"
                    aria-label="Food logging methods"
                    className="flex items-center gap-1 border-b border-line pb-2 mb-3 overflow-x-auto no-scrollbar shrink-0"
                >
                    {FOOD_TABS.map((tab, index) => {
                        const Icon = tab.icon;
                        const isSelected = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                ref={(el) => {
                                    tabRefs.current[index] = el;
                                }}
                                id={`add-food-tab-${tab.id}`}
                                role="tab"
                                type="button"
                                aria-selected={isSelected}
                                aria-controls={`add-food-panel-${tab.id}`}
                                tabIndex={isSelected ? 0 : -1}
                                onClick={() => setActiveTab(tab.id)}
                                onKeyDown={(e) => handleTabKeyDown(e, index)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-sm border whitespace-nowrap transition-colors ${
                                    isSelected
                                        ? 'bg-background-tertiary border-accent-orange text-foreground'
                                        : 'border-transparent text-foreground-muted hover:text-foreground'
                                }`}
                            >
                                <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                <div
                    id={`add-food-panel-${activeTab}`}
                    role="tabpanel"
                    aria-labelledby={`add-food-tab-${activeTab}`}
                    className="flex-1 min-h-0 flex flex-col overflow-y-auto"
                >
                    {activeTab === 'search' && (
                        <ManualFoodEntryModal
                            isOpen={isOpen && activeTab === 'search'}
                            onClose={onClose}
                            onLogSuccess={onLogSuccess}
                            initialFood={scannedFood}
                            defaultTab="search"
                            defaultMealType={defaultMealType}
                            embedded={true}
                        />
                    )}

                    {activeTab === 'photo' && (
                        <FoodScannerModal
                            isOpen={isOpen && activeTab === 'photo'}
                            onClose={onClose}
                            onScanComplete={(result) => {
                                onClose();
                                onScanResult(result);
                            }}
                            embedded={true}
                        />
                    )}

                    {activeTab === 'barcode' && (
                        <BarcodeScannerModal
                            isOpen={isOpen && activeTab === 'barcode'}
                            onClose={onClose}
                            onScan={handleBarcodeScanned}
                            preAuthorizedStream={preAuthorizedStream}
                            embedded={true}
                        />
                    )}

                    {activeTab === 'meals' && (
                        <MealLibraryModal
                            isOpen={isOpen && activeTab === 'meals'}
                            onClose={onClose}
                            onSelectMeal={(meal) => {
                                onClose();
                                onScanResult({
                                    mealName: meal.name,
                                    items: meal.items,
                                    totalCalories: meal.totalCalories,
                                    totalProtein: meal.totalProtein,
                                    totalCarbs: meal.totalCarbs,
                                    totalFats: meal.totalFats,
                                    confidence: 'high' as const,
                                });
                            }}
                            embedded={true}
                        />
                    )}

                    {activeTab === 'suggestions' && (
                        <AiMealSuggestionModal
                            isOpen={isOpen && activeTab === 'suggestions'}
                            onClose={onClose}
                            remainingMacros={remainingMacros}
                            onLogSuccess={onLogSuccess}
                            embedded={true}
                        />
                    )}
                </div>
            </div>
        </Modal>
    );
}

export default AddFoodSheet;
