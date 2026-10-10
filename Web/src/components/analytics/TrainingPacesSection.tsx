'use client';

import { formatPace } from '@/lib/metrics/vdot';

interface TrainingPacesSectionProps {
    effectiveVO2max: number;
    trainingPaces: any;
    maxHr?: number;
}

export default function TrainingPacesSection({ effectiveVO2max, trainingPaces, maxHr }: TrainingPacesSectionProps) {
    return (
        <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Training Paces & Heart Rate</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {/* Easy */}
                <div className="p-4 rounded-md bg-zone-1/10 border border-zone-1/20 text-center">
                    <p className="text-zone-1 text-xs font-semibold mb-1">Easy (E)</p>
                    <p className="text-foreground font-semibold text-lg font-mono tabular-nums">
                        {effectiveVO2max > 0
                            ? `${formatPace(trainingPaces?.easy?.min || 0)} - ${formatPace(trainingPaces?.easy?.max || 0)}`
                            : '-'}
                    </p>
                    <p className="text-zone-1 text-sm mt-1 font-mono tabular-nums">
                        {maxHr ? `${Math.round(maxHr * 0.65)}-${Math.round(maxHr * 0.79)} bpm` : '-'}
                    </p>
                    <p className="text-[10px] text-foreground-muted mt-0.5">65-79% HRmax</p>
                </div>

                {/* Marathon */}
                <div className="p-4 rounded-md bg-accent-blue/10 border border-accent-blue/20 text-center">
                    <p className="text-accent-blue text-xs font-semibold mb-1">Marathon (M)</p>
                    <p className="text-foreground font-semibold text-lg font-mono tabular-nums">
                        {effectiveVO2max > 0 ? formatPace(trainingPaces?.marathon || 0) : '-'}
                    </p>
                    <p className="text-accent-blue text-sm mt-1 font-mono tabular-nums">
                        {maxHr ? `${Math.round(maxHr * 0.78)}-${Math.round(maxHr * 0.82)} bpm` : '-'}
                    </p>
                    <p className="text-[10px] text-foreground-muted mt-0.5">78-82% HRmax</p>
                </div>

                {/* Threshold */}
                <div className="p-4 rounded-md bg-zone-3/10 border border-zone-3/20 text-center">
                    <p className="text-zone-3 text-xs font-semibold mb-1">Threshold (T)</p>
                    <p className="text-foreground font-semibold text-lg font-mono tabular-nums">
                        {effectiveVO2max > 0 ? formatPace(trainingPaces?.threshold || 0) : '-'}
                    </p>
                    <p className="text-zone-3 text-sm mt-1 font-mono tabular-nums">
                        {maxHr ? `${Math.round(maxHr * 0.88)}-${Math.round(maxHr * 0.92)} bpm` : '-'}
                    </p>
                    <p className="text-[10px] text-foreground-muted mt-0.5">88-92% HRmax</p>
                </div>

                {/* Interval */}
                <div className="p-4 rounded-md bg-zone-4/10 border border-zone-4/20 text-center">
                    <p className="text-zone-4 text-xs font-semibold mb-1">Interval (I)</p>
                    <p className="text-foreground font-semibold text-lg font-mono tabular-nums">
                        {effectiveVO2max > 0 ? formatPace(trainingPaces?.interval || 0) : '-'}
                    </p>
                    <p className="text-zone-4 text-sm mt-1 font-mono tabular-nums">
                        {maxHr ? `${Math.round(maxHr * 0.98)}-${Math.round(maxHr * 1.0)} bpm` : '-'}
                    </p>
                    <p className="text-[10px] text-foreground-muted mt-0.5">98-100% HRmax</p>
                </div>

                {/* Repetition */}
                <div className="p-4 rounded-md bg-zone-5/10 border border-zone-5/20 text-center">
                    <p className="text-zone-5 text-xs font-semibold mb-1">Repetition (R)</p>
                    <p className="text-foreground font-semibold text-lg font-mono tabular-nums">
                        {effectiveVO2max > 0 ? formatPace(trainingPaces?.repetition || 0) : '-'}
                    </p>
                    <p className="text-zone-5 text-sm mt-1 font-mono tabular-nums">
                        {maxHr ? `>${Math.round(maxHr * 1.0)} bpm` : '-'}
                    </p>
                    <p className="text-[10px] text-foreground-muted mt-0.5">100%+ HRmax</p>
                </div>
            </div>
        </div>
    );
}
