'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, RefreshCw, Loader2, Brain, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { PlanScoreGauge } from './PlanScoreGauge';
import { WeekAnalysisCard } from './WeekAnalysisCard';
import { RiskFlagBadge } from './RiskFlagBadge';
import { RaceReadinessCard } from './RaceReadinessCard';
import type { PlanPhase } from '../Editor/PhaseSelector';

interface AiAnalysisPanelProps {
    goalId: string;
    isOpen: boolean;
    onClose: () => void;
    isNoRace?: boolean;
}

interface RiskFlag {
    flag: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    weekIndex?: number;
}

interface WeekAnalysis {
    weekIndex: number;
    score?: number;
    summary: string;
    phase?: string;
}

interface Suggestion {
    category: string;
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
}

interface RaceReadiness {
    overallScore?: number;
    enduranceScore?: number;
    speedScore?: number;
    recoveryScore?: number;
    mentalScore?: number;
}

interface AnalysisData {
    overallScore: number | null;
    overallSummary: string | null;
    weekAnalyses: WeekAnalysis[];
    riskFlags: RiskFlag[];
    raceReadiness: RaceReadiness;
    suggestions: Suggestion[];
}

export function AiAnalysisPanel({ goalId, isOpen, onClose, isNoRace }: AiAnalysisPanelProps) {
    const queryClient = useQueryClient();
    const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());

    const { data: existingData, isLoading: loadingExisting } = useQuery<{ analysis: AnalysisData | null }>({
        queryKey: ['ai-analysis', goalId],
        queryFn: async () => {
            const res = await fetch(`/api/plan-advanced/${goalId}/ai-analysis`);
            if (!res.ok) throw new Error('Failed to fetch analysis');
            return res.json();
        },
        enabled: isOpen,
    });

    const analyzeMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/plan-advanced/${goalId}/ai-analysis`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ analysisType: 'full' }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Analysis failed');
            }
            return res.json() as Promise<{ analysis: AnalysisData }>;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ai-analysis', goalId] });
            toast.success('Plan analysis complete');
        },
        onError: (err: Error) => {
            toast.error(err.message);
        },
    });

    const analysis = existingData?.analysis;

    const toggleWeek = (index: number) => {
        setExpandedWeeks((prev) => {
            const next = new Set(prev);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return next;
        });
    };

    const riskFlags = analysis?.riskFlags || [];
    const highRiskCount = riskFlags.filter((r) => r.severity === 'high').length;
    const medRiskCount = riskFlags.filter((r) => r.severity === 'medium').length;
    const suggestions = analysis?.suggestions || [];
    const weekAnalyses = analysis?.weekAnalyses || [];

    if (!isOpen) return null;

    return (
        <div className="w-80 border-l border-zinc-800 bg-zinc-950 flex flex-col overflow-hidden shrink-0">
            <div className="h-10 border-b border-zinc-800 flex items-center justify-between px-3 shrink-0">
                <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5 text-purple-400" />
                    AI Analysis
                </span>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => analyzeMutation.mutate()}
                        disabled={analyzeMutation.isPending}
                        className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                        title="Re-analyze"
                    >
                        {analyzeMutation.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {analyzeMutation.isPending && !analysis ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                        <p className="text-xs text-zinc-500">Analyzing your plan...</p>
                    </div>
                ) : !analysis ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <Brain className="w-8 h-8 text-zinc-700" />
                        <p className="text-xs text-zinc-500 text-center">
                            No analysis yet. Click the button below to analyze your plan.
                        </p>
                        <button
                            type="button"
                            onClick={() => analyzeMutation.mutate()}
                            disabled={analyzeMutation.isPending}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-50 transition-colors"
                        >
                            {analyzeMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Analyze Plan
                        </button>
                    </div>
                ) : (
                    <>
                        {analysis.overallScore != null && (
                            <div className="flex justify-center">
                                <PlanScoreGauge score={analysis.overallScore} />
                            </div>
                        )}

                        {analysis.overallSummary && (
                            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                                <p className="text-[11px] text-zinc-400 leading-relaxed">{analysis.overallSummary}</p>
                            </div>
                        )}

                        {riskFlags.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-[10px] text-zinc-500 uppercase tracking-wide font-medium flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    Risk Flags ({highRiskCount} high, {medRiskCount} medium)
                                </h4>
                                <div className="flex flex-wrap gap-1.5">
                                    {riskFlags.map((flag, i) => (
                                        <RiskFlagBadge
                                            key={i}
                                            type={flag.flag}
                                            severity={flag.severity}
                                            message={flag.description}
                                            weekIndex={flag.weekIndex}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {!isNoRace && analysis.raceReadiness && (
                            <RaceReadinessCard
                                predictedTime={analysis.raceReadiness.enduranceScore ?? null}
                                confidence={analysis.raceReadiness.overallScore ?? 50}
                                trajectory={analysis.raceReadiness.overallScore != null
                                    ? (analysis.raceReadiness.overallScore >= 70 ? 'on_track' : analysis.raceReadiness.overallScore >= 40 ? 'at_risk' : 'behind')
                                    : 'on_track'}
                            />
                        )}

                        {weekAnalyses.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-[10px] text-zinc-500 uppercase tracking-wide font-medium">
                                    Week-by-Week Analysis
                                </h4>
                                <div className="space-y-1.5">
                                    {weekAnalyses.slice(0, 5).map((wa, i) => (
                                        <WeekAnalysisCard
                                            key={i}
                                            weekIndex={wa.weekIndex}
                                            phase={(wa.phase as PlanPhase) || 'BASE'}
                                            commentary={wa.summary}
                                            severity={wa.score != null ? (wa.score >= 75 ? 'ok' : wa.score >= 50 ? 'warning' : 'error') : 'ok'}
                                            score={wa.score}
                                        />
                                    ))}
                                    {weekAnalyses.length > 5 && (
                                        <div className="space-y-1.5">
                                            {weekAnalyses.slice(5).map((wa, i) => {
                                                const weekNum = wa.weekIndex;
                                                const isExpanded = expandedWeeks.has(weekNum);
                                                return (
                                                    <div key={i}>
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleWeek(weekNum)}
                                                            className="w-full flex items-center gap-1 px-1 py-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
                                                        >
                                                            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                                            Week {wa.weekIndex}
                                                            {wa.score != null && (
                                                                <span className="text-zinc-600">({wa.score}pts)</span>
                                                            )}
                                                        </button>
                                                        {isExpanded && (
                                                            <WeekAnalysisCard
                                                                weekIndex={wa.weekIndex}
                                                                phase={(wa.phase as PlanPhase) || 'BASE'}
                                                                commentary={wa.summary}
                                                                severity={wa.score != null ? (wa.score >= 75 ? 'ok' : wa.score >= 50 ? 'warning' : 'error') : 'ok'}
                                                                score={wa.score}
                                                            />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {suggestions.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-[10px] text-zinc-500 uppercase tracking-wide font-medium">
                                    Suggestions ({suggestions.length})
                                </h4>
                                <div className="space-y-1.5">
                                    {suggestions.map((s, i) => (
                                        <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900 p-2.5">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                                    s.priority === 'high' ? 'bg-red-400' : s.priority === 'medium' ? 'bg-amber-400' : 'bg-zinc-500'
                                                }`} />
                                                <span className="text-[11px] font-medium text-zinc-300">{s.title}</span>
                                            </div>
                                            <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">{s.description}</p>
                                            <span className="text-[10px] text-zinc-600 mt-1 inline-block">{s.category}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
