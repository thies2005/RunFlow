import React from 'react';

export interface ChartTooltipProps {
    active?: boolean;
    payload?: any[];
    label?: string | number;
    labelFormatter?: (label: any) => React.ReactNode;
    formatter?: (value: any, name: string) => React.ReactNode | [React.ReactNode, string];
}

export function ChartTooltip({ active, payload, label, labelFormatter, formatter }: ChartTooltipProps) {
    if (active && payload && payload.length) {
        return (
            <div className="glass-card p-4 border border-glass-border">
                {label !== undefined && (
                    <p className="text-foreground-muted text-sm mb-2">
                        {labelFormatter ? labelFormatter(label) : label}
                    </p>
                )}
                <div className="space-y-1">
                    {payload.map((entry: any, index: number) => {
                        let val = entry.value;
                        let name = entry.name;

                        if (formatter) {
                            const formatted = formatter(val, name);
                            if (Array.isArray(formatted)) {
                                val = formatted[0];
                                name = formatted[1] || name;
                            } else {
                                val = formatted;
                            }
                        }

                        return (
                            <div key={index} className="flex items-center gap-2 text-sm">
                                <div
                                    className="w-2 h-2 rounded-full min-w-2"
                                    style={{ backgroundColor: entry.color || entry.fill || entry.stroke }}
                                />
                                <span className="text-foreground-muted">{name}:</span>
                                <span className="text-foreground font-medium">
                                    {val}{entry.unit || ''}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }
    return null;
}
