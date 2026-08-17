'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { PlanPhase } from '../Editor/PhaseSelector';

interface WeekAnalysisCardProps {
    weekIndex: number;
    phase: PlanPhase;
    commentary: string;
    severity?: 'ok' | 'warning' | 'error';
    score?: number;
}

const SEVERITY_CONFIG = {
    ok: { border: 'border-l-green-500', bg: 'bg-green-500/5' },
    warning: { border: 'border-l-amber-500', bg: 'bg-amber-500/5' },
    error: { border: 'border-l-red-500', bg: 'bg-red-500/5' },
};

export function WeekAnalysisCard({ weekIndex, phase, commentary, severity = 'ok', score }: WeekAnalysisCardProps) {
    const [expanded, setExpanded] = useState(false);
    const config = SEVERITY_CONFIG[severity];
    const truncated = commentary.length > 120;

    return (
        <div className={`rounded-lg border border-glass-border border-l-2 ${config.border} ${config.bg}`}>
            <button
                type="button"
                onClick={() => truncated && setExpanded(!expanded)}
                className="w-full text-left px-3 py-2 flex items-start gap-2"
            >
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-foreground-secondary">Week {weekIndex}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-background-tertiary text-foreground-secondary border border-foreground/20">
                            {phase}
                        </span>
                        {score != null && (
                            <span className={`text-[10px] font-medium ${
                                score >= 75 ? 'text-green-400' : score >= 50 ? 'text-amber-400' : 'text-red-400'
                            }`}>
                                {score}pts
                            </span>
                        )}
                    </div>
                    <p className="text-[11px] text-foreground-secondary mt-1 leading-relaxed">
                        {expanded || !truncated ? commentary : `${commentary.slice(0, 120)}...`}
                    </p>
                </div>
                {truncated && (
                    <ChevronDown className={`w-3.5 h-3.5 text-foreground-muted mt-0.5 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                )}
            </button>
        </div>
    );
}
