'use client';

import React from 'react';
import { Droplets } from 'lucide-react';

interface WaterLoggedWidgetProps {
    amount: number; // in liters
}

export default function WaterLoggedWidget({ amount }: WaterLoggedWidgetProps) {
    const amountText = amount >= 1.0 ? `${amount.toFixed(1)} L` : `${Math.round(amount * 1000)} mL`;

    return (
        <div className="glass-card overflow-hidden my-4 border border-line relative max-w-sm">
            <div className="p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-background-tertiary p-2 rounded-full">
                            <Droplets className="w-5 h-5 text-accent-blue" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground">Water Intake Logged</h3>
                            <p className="text-xs text-foreground-muted">Added to today&apos;s totals</p>
                        </div>
                    </div>
                    <div className="bg-background-tertiary border border-line rounded-md px-3 py-1.5">
                        <p className="text-lg font-bold font-mono tabular-nums text-foreground">{amountText}</p>
                    </div>
                </div>
            </div>

            <div className="bg-background-tertiary p-2 text-center border-t border-line">
                <p className="text-xs text-foreground-muted">View this in your <a href="/nutrition" className="text-accent-blue hover:underline">Nutrition Log</a></p>
            </div>
        </div>
    );
}
