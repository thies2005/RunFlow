'use client';

import { useState } from 'react';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface RiskFlagBadgeProps {
    type: string;
    severity: 'low' | 'medium' | 'high';
    message: string;
    weekIndex?: number;
}

const SEVERITY_STYLES = {
    low: {
        bg: 'bg-workout-tempo/10 border-workout-tempo/30',
        text: 'text-workout-tempo',
        icon: Info,
    },
    medium: {
        bg: 'bg-workout-tempo/10 border-workout-tempo/30',
        text: 'text-workout-tempo',
        icon: AlertTriangle,
    },
    high: {
        bg: 'bg-negative/10 border-negative/30',
        text: 'text-negative',
        icon: AlertCircle,
    },
};

export function RiskFlagBadge({ type, severity, message, weekIndex }: RiskFlagBadgeProps) {
    const [showTooltip, setShowTooltip] = useState(false);
    const style = SEVERITY_STYLES[severity];
    const Icon = style.icon;

    return (
        <div
            className="relative inline-flex"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] font-medium ${style.bg} ${style.text}`}>
                <Icon className="w-3 h-3" />
                <span>{type}</span>
                {weekIndex != null && (
                    <span className="opacity-60">W{weekIndex}</span>
                )}
            </div>
            {showTooltip && (
                <div className="absolute left-0 top-full mt-1 z-50 w-56 px-3 py-2 rounded-md bg-background-secondary border border-foreground/20 text-[11px] text-foreground-secondary leading-relaxed">
                    {message}
                </div>
            )}
        </div>
    );
}
