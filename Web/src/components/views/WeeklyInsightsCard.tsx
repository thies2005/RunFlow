'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, RefreshCw, Calendar, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

export function WeeklyInsightsCard() {
    const queryClient = useQueryClient();

    const { data: insightData, isLoading: _isLoadingInsight } = useQuery({
        queryKey: ['health-insight'],
        queryFn: async () => {
            const res = await fetch('/api/health/insights');
            if (!res.ok) throw new Error('Failed to fetch insight');
            return res.json();
        }
    });

    const generateMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/health/insights/generate', { method: 'POST' });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to generate');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['health-insight'] });
        }
    });

    const isGenerating = generateMutation.isPending;
    const insight = insightData?.insight;

    if (!insight && !isGenerating && !generateMutation.isError) {
        return (
            <div className="glass-card p-5">
                <div className="flex items-center gap-2 mb-2 text-foreground font-semibold">
                    <Sparkles className="w-5 h-5 text-accent-blue" />
                    AI Weekly Insights
                </div>
                <p className="text-sm text-foreground-muted mb-4">
                    Get a personalized breakdown of your nutrition consistency over the last 7 days.
                </p>
                <button
                    onClick={() => generateMutation.mutate()}
                    className="w-full bg-accent-blue/10 hover:bg-accent-blue/20 text-accent-blue font-semibold py-2.5 rounded-md transition-colors border border-accent-blue/30 flex items-center justify-center gap-2"
                >
                    Generate Weekly Report
                </button>
            </div>
        );
    }

    return (
        <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-foreground font-semibold">
                    <Sparkles className="w-5 h-5 text-accent-blue" />
                    Weekly Insights
                </div>
                <button
                    onClick={() => generateMutation.mutate()}
                    disabled={isGenerating}
                    className="p-1.5 rounded-md bg-background-tertiary hover:bg-glass-bg-hover text-foreground-muted transition-colors"
                    title="Generate New Insight"
                >
                    <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin text-accent-blue' : ''}`} />
                </button>
            </div>

            {isGenerating ? (
                <div className="py-6 flex flex-col items-center justify-center space-y-3">
                    <div className="w-8 h-8 rounded-full border-2 border-accent-blue/30 border-t-accent-blue animate-spin" />
                    <p className="text-xs font-semibold text-accent-blue">AI is analyzing...</p>
                </div>
            ) : generateMutation.isError ? (
                <div className="bg-negative/10 border border-negative/20 rounded-md p-3 text-sm text-negative">
                    {generateMutation.error?.message || 'Failed to generate insight.'}
                </div>
            ) : insight ? (
                <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs text-foreground-muted border-b border-line pb-3">
                        <div className="flex items-center gap-1.5 font-mono tabular-nums"><Calendar className="w-3.5 h-3.5" /> {format(new Date(insight.rangeStart), 'MMM d')} - {format(new Date(insight.rangeEnd), 'MMM d')}</div>
                        <div className="flex items-center gap-1.5 font-mono tabular-nums"><TrendingUp className="w-3.5 h-3.5" /> {insight.metrics?.daysLogged || 7} days logged</div>
                    </div>

                    <div className="text-sm text-foreground-muted leading-relaxed whitespace-pre-wrap prose dark:prose-invert prose-p:my-2 prose-ul:my-2 max-w-none [\[&_details]:bg-background-tertiary_details]:bg-background-tertiary [&_details]:p-3 [&_details]:rounded-md [&_details_summary]:cursor-pointer [&_details_summary]:font-medium [&_details_summary]:mb-2 [&_details_summary]:text-accent-blue">
                        <ReactMarkdown rehypePlugins={[rehypeRaw]}>{insight.content}</ReactMarkdown>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
