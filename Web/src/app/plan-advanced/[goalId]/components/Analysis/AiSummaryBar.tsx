'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Loader2, Brain } from 'lucide-react';
import { toast } from 'sonner';
import { PlanScoreGauge } from '../AI/PlanScoreGauge';

interface RiskFlag {
    flag: string;
    severity: 'low' | 'medium' | 'high';
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
    riskFlags: RiskFlag[];
    raceReadiness: RaceReadiness;
    suggestions: Array<{ category: string; priority: string; title: string; description: string }>;
}

interface AiSummaryBarProps {
    goalId: string;
    isNoRace?: boolean;
}

export function AiSummaryBar({ goalId, isNoRace }: AiSummaryBarProps) {
    const queryClient = useQueryClient();

    const { data } = useQuery<{ analysis: AnalysisData | null }>({
        queryKey: ['ai-analysis', goalId],
        queryFn: async () => {
            const res = await fetch(`/api/plan-advanced/${goalId}/ai-analysis`);
            if (!res.ok) throw new Error('Failed to fetch analysis');
            return res.json();
        },
    });

    const analyzeMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/plan-advanced/${goalId}/ai-analysis`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ analysisType: 'full' }),
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Analysis failed');
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

    const analysis = data?.analysis;
    const riskFlags = analysis?.riskFlags || [];

    const severityColors: Record<string, string> = {
        low: 'bg-accent-blue/15 text-accent-blue border-accent-blue/30',
        medium: 'bg-workout-tempo/15 text-workout-tempo border-workout-tempo/30',
        high: 'bg-negative/15 text-negative border-negative/30',
    };

    return (
        <div className="border border-glass-border bg-background-secondary rounded-md p-4">
            <div className="flex items-center gap-6">
                {analysis?.overallScore != null ? (
                    <div className="shrink-0">
                        <PlanScoreGauge score={analysis.overallScore} />
                    </div>
                ) : (
                    <div className="shrink-0 flex items-center gap-2">
                        <Brain className="w-5 h-5 text-foreground-muted" />
                        <span className="text-xs text-foreground-muted">No analysis yet</span>
                    </div>
                )}

                <div className="flex-1 min-w-0">
                    {analysis?.overallSummary && (
                        <p className="text-sm text-foreground-secondary leading-relaxed">{analysis.overallSummary}</p>
                    )}
                    {riskFlags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {riskFlags.map((flag, i) => (
                                <span
                                    key={i}
                                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${
                                        severityColors[flag.severity] || severityColors.low
                                    }`}
                                >
                                    {flag.flag}
                                </span>
                            ))}
                        </div>
                    )}
                    {!isNoRace && analysis?.raceReadiness?.overallScore != null && (
                        <div className="mt-2 flex items-center gap-2">
                            <span className="text-[10px] text-foreground-muted">Race Readiness</span>
                            <div className="h-1.5 w-24 bg-background-tertiary rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                        width: `${Math.min(100, analysis.raceReadiness.overallScore)}%`,
                                        backgroundColor:
                                            analysis.raceReadiness.overallScore >= 70
                                                ? 'var(--positive)'
                                                : analysis.raceReadiness.overallScore >= 40
                                                ? 'var(--zone-3)'
                                                : 'var(--negative)',
                                    }}
                                />
                            </div>
                            <span className="text-[10px] text-foreground-secondary">
                                {Math.round(analysis.raceReadiness.overallScore)}%
                            </span>
                        </div>
                    )}
                </div>

                <div className="shrink-0">
                    <button
                        type="button"
                        onClick={() => analyzeMutation.mutate()}
                        disabled={analyzeMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-foreground text-background hover:bg-foreground/85 disabled:opacity-50 transition-colors"
                    >
                        {analyzeMutation.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                        )}
                        {analysis ? 'Re-analyze' : 'Analyze Plan'}
                    </button>
                </div>
            </div>
        </div>
    );
}
