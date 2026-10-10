import React from 'react';
import { HeartPulse, BarChart3 } from 'lucide-react';
import type { Supplement } from '@/lib/types/health';

interface SupplementItemProps {
    supplement: Supplement;
    isTaken: boolean;
    isPending?: boolean;
    variant?: 'standalone' | 'stack-item';
    onEdit: (_supplement: Supplement) => void;
    onToggle: (_supplementId: string, _taken: boolean, _e?: React.MouseEvent) => void;
    onShowStats?: (_supplementId: string, _supplementName: string, _e?: React.MouseEvent) => void;
}

export function SupplementItem({
    supplement,
    isTaken,
    isPending = false,
    variant = 'standalone',
    onEdit,
    onToggle,
    onShowStats
}: SupplementItemProps) {
    if (variant === 'stack-item') {
        return (
            <div className="flex items-center justify-between p-2 rounded-md hover:bg-background-tertiary transition-colors group/item">
                <button
                    type="button"
                    className="flex-1 pr-4 text-left"
                    onClick={() => onEdit(supplement)}
                >
                    <p className="text-xs font-medium text-foreground-secondary group-hover/item:text-accent-blue transition-colors">{supplement.name}</p>
                    <p className="text-[10px] font-mono text-foreground-muted">{supplement.amount} {supplement.unit}</p>
                </button>

                <button
                    onClick={(e) => onToggle(supplement.id, !isTaken, e)}
                    aria-label={`${isTaken ? 'Mark as not taken' : 'Mark as taken'}: ${supplement.name}`}
                    disabled={isPending}
                    className={`w-5 h-5 rounded flex items-center justify-center transition-colors shrink-0 ${isTaken ? 'bg-positive border border-positive' : 'bg-transparent border border-line-strong'} disabled:opacity-50`}
                >
                    {isTaken && <HeartPulse className="w-2.5 h-2.5 text-foreground" />}
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-between p-3 rounded-md bg-background-tertiary border border-line mb-2 group">
            <button
                type="button"
                className="flex-1 pr-4 text-left"
                onClick={() => onEdit(supplement)}
            >
                <p className="text-sm font-medium text-foreground group-hover:text-accent-blue transition-colors">{supplement.name}</p>
                <p className="text-xs font-mono text-foreground-muted">{supplement.amount} {supplement.unit}</p>
            </button>

            <div className="flex items-center gap-2 shrink-0">
                {onShowStats && (
                    <button
                        onClick={(e) => onShowStats(supplement.id, supplement.name, e)}
                        aria-label={`View stats for ${supplement.name}`}
                        className="w-6 h-6 rounded flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity bg-glass-bg hover:bg-background-tertiary"
                    >
                        <BarChart3 className="w-3 h-3 text-foreground-muted" />
                    </button>
                )}
                <button
                    onClick={(e) => onToggle(supplement.id, !isTaken, e)}
                    aria-label={`${isTaken ? 'Mark as not taken' : 'Mark as taken'}: ${supplement.name}`}
                    disabled={isPending}
                    className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${isTaken ? 'bg-positive border-positive' : 'bg-transparent border-line-strong'} disabled:opacity-50`}
                >
                    {isTaken && <HeartPulse className="w-3 h-3 text-foreground" />}
                </button>
            </div>
        </div>
    );
}

export default SupplementItem;
