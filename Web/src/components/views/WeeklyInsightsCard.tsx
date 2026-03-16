'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, RefreshCw, Calendar, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

export function WeeklyInsightsCard() {
    const queryClient = useQueryClient();

    const { data: insightData, isLoading: isLoadingInsight } = useQuery({
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
            <div className="glass-card border border-glass-border rounded-2xl p-5 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 z-0" />
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2 text-white font-bold">
                        <Sparkles className="w-5 h-5 text-blue-400" />
                        AI Weekly Insights
                    </div>
                    <p className="text-sm text-gray-400 mb-4">
                        Get a personalized breakdown of your nutrition consistency over the last 7 days.
                    </p>
                    <button
                        onClick={() => generateMutation.mutate()}
                        className="w-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-bold py-2.5 rounded-xl transition-all border border-blue-500/30 flex items-center justify-center gap-2"
                    >
                        Generate Weekly Report
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-card border border-glass-border rounded-2xl p-5 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-white font-bold">
                    <Sparkles className="w-5 h-5 text-blue-400" />
                    Weekly Insights
                </div>
                <button
                    onClick={() => generateMutation.mutate()}
                    disabled={isGenerating}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 transition-colors"
                    title="Generate New Insight"
                >
                    <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin text-blue-400' : ''}`} />
                </button>
            </div>

            {isGenerating ? (
                <div className="py-6 flex flex-col items-center justify-center space-y-3">
                    <div className="w-8 h-8 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
                    <p className="text-xs font-semibold text-blue-400 animate-pulse tracking-wide uppercase">AI is analyzing...</p>
                </div>
            ) : generateMutation.isError ? (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-400">
                    {generateMutation.error?.message || 'Failed to generate insight.'}
                </div>
            ) : insight ? (
                <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs text-gray-500 border-b border-white/5 pb-3">
                        <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {format(new Date(insight.rangeStart), 'MMM d')} - {format(new Date(insight.rangeEnd), 'MMM d')}</div>
                        <div className="flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> {insight.metrics?.daysLogged || 7} days logged</div>
                    </div>
                    
                    <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap prose prose-invert prose-p:my-2 prose-ul:my-2 max-w-none [&_details]:bg-black/20 [&_details]:p-3 [&_details]:rounded-lg [&_details_summary]:cursor-pointer [&_details_summary]:font-medium [&_details_summary]:mb-2 [&_details_summary]:text-blue-300">
                        <ReactMarkdown rehypePlugins={[rehypeRaw]}>{insight.content}</ReactMarkdown>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
