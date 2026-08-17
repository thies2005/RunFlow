'use client';

import { useState, useCallback } from 'react';
import { ChevronDown, RotateCcw } from 'lucide-react';

interface HrZoneEditorProps {
    defaultZones: number[];
    overrides: Record<string, number[]>;
    onChange: (phase: string, zones: number[]) => void;
}

export function HrZoneEditor({ defaultZones, overrides, onChange }: HrZoneEditorProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const handleReset = useCallback(
        (phase: string) => {
            onChange(phase, defaultZones);
        },
        [defaultZones, onChange],
    );

    return (
        <div>
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1 text-[10px] text-foreground-muted hover:text-foreground-secondary transition-colors"
            >
                <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                HR Zone Overrides
            </button>

            {isExpanded && (
                <div className="mt-2 space-y-2">
                    {Object.entries(overrides).map(([phase, zones]) => (
                        <div key={phase} className="flex items-center gap-1.5">
                            <span className="text-[9px] text-foreground-muted w-16 shrink-0">{phase}</span>
                            <div className="flex items-center gap-0.5 flex-1">
                                {zones.map((hr, i) => (
                                    <input
                                        key={i}
                                        type="number"
                                        min={60}
                                        max={220}
                                        value={hr}
                                        onChange={(e) => {
                                            const newZones = [...zones];
                                            newZones[i] = Number(e.target.value);
                                            onChange(phase, newZones);
                                        }}
                                        className="w-10 bg-background-tertiary border border-foreground/20 rounded px-1 py-0.5 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-foreground-muted"
                                    />
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={() => handleReset(phase)}
                                className="p-0.5 text-foreground-muted hover:text-foreground-secondary transition-colors shrink-0"
                                title="Reset to defaults"
                            >
                                <RotateCcw className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                    <div className="flex items-center gap-1.5 text-[9px] text-foreground-muted">
                        <span className="w-16 shrink-0">Default</span>
                        <div className="flex gap-0.5">
                            {defaultZones.map((hr, i) => (
                                <span key={i} className="w-10 text-center">{hr}</span>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
