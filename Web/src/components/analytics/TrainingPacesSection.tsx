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
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                    <p className="text-green-400 text-xs font-semibold mb-1 uppercase tracking-wider">Easy (E)</p>
                    <p className="text-foreground font-bold text-lg">
                        {effectiveVO2max > 0
                            ? `${formatPace(trainingPaces?.easy?.min || 0)} - ${formatPace(trainingPaces?.easy?.max || 0)}`
                            : '-'}
                    </p>
                    <p className="text-green-300 text-sm mt-1">
                        {maxHr ? `${Math.round(maxHr * 0.65)}-${Math.round(maxHr * 0.79)} bpm` : '-'}
                    </p>
                    <p className="text-[10px] text-foreground-muted mt-0.5">65-79% HRmax</p>
                </div>

                {/* Marathon */}
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                    <p className="text-blue-400 text-xs font-semibold mb-1 uppercase tracking-wider">Marathon (M)</p>
                    <p className="text-foreground font-bold text-lg">
                        {effectiveVO2max > 0 ? formatPace(trainingPaces?.marathon || 0) : '-'}
                    </p>
                    <p className="text-blue-300 text-sm mt-1">
                        {maxHr ? `${Math.round(maxHr * 0.78)}-${Math.round(maxHr * 0.82)} bpm` : '-'}
                    </p>
                    <p className="text-[10px] text-foreground-muted mt-0.5">78-82% HRmax</p>
                </div>

                {/* Threshold */}
                <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-center">
                    <p className="text-yellow-400 text-xs font-semibold mb-1 uppercase tracking-wider">Threshold (T)</p>
                    <p className="text-foreground font-bold text-lg">
                        {effectiveVO2max > 0 ? formatPace(trainingPaces?.threshold || 0) : '-'}
                    </p>
                    <p className="text-yellow-300 text-sm mt-1">
                        {maxHr ? `${Math.round(maxHr * 0.88)}-${Math.round(maxHr * 0.92)} bpm` : '-'}
                    </p>
                    <p className="text-[10px] text-foreground-muted mt-0.5">88-92% HRmax</p>
                </div>

                {/* Interval */}
                <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20 text-center">
                    <p className="text-orange-400 text-xs font-semibold mb-1 uppercase tracking-wider">Interval (I)</p>
                    <p className="text-foreground font-bold text-lg">
                        {effectiveVO2max > 0 ? formatPace(trainingPaces?.interval || 0) : '-'}
                    </p>
                    <p className="text-orange-300 text-sm mt-1">
                        {maxHr ? `${Math.round(maxHr * 0.98)}-${Math.round(maxHr * 1.0)} bpm` : '-'}
                    </p>
                    <p className="text-[10px] text-foreground-muted mt-0.5">98-100% HRmax</p>
                </div>

                {/* Repetition */}
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
                    <p className="text-red-400 text-xs font-semibold mb-1 uppercase tracking-wider">Repetition (R)</p>
                    <p className="text-foreground font-bold text-lg">
                        {effectiveVO2max > 0 ? formatPace(trainingPaces?.repetition || 0) : '-'}
                    </p>
                    <p className="text-red-300 text-sm mt-1">
                        {maxHr ? `>${Math.round(maxHr * 1.0)} bpm` : '-'}
                    </p>
                    <p className="text-[10px] text-foreground-muted mt-0.5">100%+ HRmax</p>
                </div>
            </div>
        </div>
    );
}
