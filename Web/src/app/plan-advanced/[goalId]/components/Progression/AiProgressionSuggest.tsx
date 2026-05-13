'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Sparkles, Loader2, Check, X } from 'lucide-react';
import type { ProgressionWeekData } from '../Progression/types';
import { weekTotalDistance } from '../Progression/types';

interface AiProgressionSuggestProps {
    goalId: string;
    workoutType: string;
    startWeek: number;
    endWeek: number;
    raceType: string;
    vdot: number;
    onApply: (weeks: ProgressionWeekData[]) => void;
}

interface AiSuggestion {
    id: string;
    label: string;
    description: string;
    weeks: ProgressionWeekData[];
    peakWeek: number;
    totalVolume: number;
}

export function AiProgressionSuggest({
    goalId,
    workoutType,
    startWeek,
    endWeek,
    raceType,
    vdot,
    onApply,
}: AiProgressionSuggestProps) {
    const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);

    const generateMutation = useMutation({
        mutationFn: async () => {
            setIsGenerating(true);
            const res = await fetch(`/api/plan-advanced/${goalId}/progression/ai-suggest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    workoutType,
                    startWeek,
                    endWeek,
                    raceType,
                    vdot,
                }),
            });
            if (!res.ok) throw new Error('AI suggestion failed');
            return res.json() as Promise<{ suggestions: AiSuggestion[] }>;
        },
        onSuccess: (data) => {
            setSuggestions(data.suggestions || []);
        },
        onError: () => {
            setSuggestions([]);
        },
        onSettled: () => {
            setIsGenerating(false);
        },
    });

    const handleDismiss = () => {
        setSuggestions([]);
    };

    if (suggestions.length > 0) {
        return (
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-300 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-purple-400" />
                        AI Suggestions
                    </span>
                    <button
                        type="button"
                        onClick={handleDismiss}
                        className="p-0.5 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
                <div className="space-y-1.5">
                    {suggestions.map((suggestion) => (
                        <div
                            key={suggestion.id}
                            className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3"
                        >
                            <div className="flex items-start justify-between mb-1.5">
                                <div>
                                    <span className="text-xs font-medium text-zinc-200">{suggestion.label}</span>
                                    <p className="text-[10px] text-zinc-500 mt-0.5">{suggestion.description}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onApply(suggestion.weeks);
                                        setSuggestions([]);
                                    }}
                                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-purple-600 text-white hover:bg-purple-500 transition-colors"
                                >
                                    <Check className="w-3 h-3" />
                                    Apply
                                </button>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                                <span>{suggestion.weeks.length} weeks</span>
                                <span>
                                    Volume: {suggestion.totalVolume >= 1000
                                        ? `${(suggestion.totalVolume / 1000).toFixed(0)}km`
                                        : `${suggestion.totalVolume}m`}
                                </span>
                                <span>Peak: Week {suggestion.peakWeek}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={() => generateMutation.mutate()}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs hover:bg-purple-500/20 disabled:opacity-50 transition-colors"
        >
            {isGenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
                <Sparkles className="w-3.5 h-3.5" />
            )}
            AI Suggest Progression
        </button>
    );
}
