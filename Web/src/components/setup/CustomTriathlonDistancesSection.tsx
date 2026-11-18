'use client';

import { Target } from 'lucide-react';

interface CustomTriathlonDistancesSectionProps {
    customSwimDistM: number;
    setCustomSwimDistM: (v: number) => void;
    customBikeDistM: number;
    setCustomBikeDistM: (v: number) => void;
    customRunDistM: number;
    setCustomRunDistM: (v: number) => void;
}

export default function CustomTriathlonDistancesSection({
    customSwimDistM,
    setCustomSwimDistM,
    customBikeDistM,
    setCustomBikeDistM,
    customRunDistM,
    setCustomRunDistM,
}: CustomTriathlonDistancesSectionProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-accent-orange mb-2">
                <Target className="w-5 h-5" />
                <h3 className="text-sm font-semibold">Custom Triathlon Distances</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
                <div>
                    <label className="block text-xs text-foreground-muted mb-1">Swim (m)</label>
                    <input
                        type="number"
                        value={customSwimDistM || ''}
                        onChange={(e) => setCustomSwimDistM(parseFloat(e.target.value) || 0)}
                        placeholder="1500"
                        min={100}
                        className="bg-surface border border-glass-border rounded-md p-3 text-foreground w-full outline-hidden focus:ring-2 focus:ring-accent-orange transition-all"
                    />
                </div>
                <div>
                    <label className="block text-xs text-foreground-muted mb-1">Bike (m)</label>
                    <input
                        type="number"
                        value={customBikeDistM || ''}
                        onChange={(e) => setCustomBikeDistM(parseFloat(e.target.value) || 0)}
                        placeholder="40000"
                        min={1000}
                        className="bg-surface border border-glass-border rounded-md p-3 text-foreground w-full outline-hidden focus:ring-2 focus:ring-accent-orange transition-all"
                    />
                </div>
                <div>
                    <label className="block text-xs text-foreground-muted mb-1">Run (m)</label>
                    <input
                        type="number"
                        value={customRunDistM || ''}
                        onChange={(e) => setCustomRunDistM(parseFloat(e.target.value) || 0)}
                        placeholder="10000"
                        min={1000}
                        className="bg-surface border border-glass-border rounded-md p-3 text-foreground w-full outline-hidden focus:ring-2 focus:ring-accent-orange transition-all"
                    />
                </div>
            </div>
            <p className="text-xs text-foreground-muted">Leave blank to use Olympic triathlon defaults (1500m / 40km / 10km)</p>
        </div>
    );
}
