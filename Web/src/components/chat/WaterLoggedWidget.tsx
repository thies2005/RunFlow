'use client';

import React from 'react';
import { Droplets } from 'lucide-react';

interface WaterLoggedWidgetProps {
    amount: number; // in liters
}

export default function WaterLoggedWidget({ amount }: WaterLoggedWidgetProps) {
    const amountText = amount >= 1.0 ? `${amount.toFixed(1)} L` : `${Math.round(amount * 1000)} mL`;

    return (
        <div className="glass-card rounded-xl overflow-hidden shadow-2xl my-4 border border-cyan-500/30 relative max-w-sm">
            {/* Top gradient accent */}
            <div className="h-1 w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-teal-500" />

            <div className="p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-cyan-500/20 p-2 rounded-full">
                            <Droplets className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground">Water Intake Logged</h3>
                            <p className="text-xs text-foreground-muted">Added to today&apos;s totals</p>
                        </div>
                    </div>
                    <div className="bg-cyan-500/20 border border-cyan-500/30 rounded-lg px-3 py-1.5">
                        <p className="text-lg font-bold text-cyan-400">{amountText}</p>
                    </div>
                </div>
            </div>

            <div className="bg-foreground/5 p-2 text-center border-t border-foreground/5">
                <p className="text-xs text-foreground-muted">View this in your <a href="/nutrition" className="text-cyan-400 hover:underline">Nutrition Log</a></p>
            </div>
        </div>
    );
}
