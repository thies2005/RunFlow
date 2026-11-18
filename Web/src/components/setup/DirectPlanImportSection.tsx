'use client';

import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Upload, ImagePlus, Download } from 'lucide-react';
import { TRIATHLON_RACE_TYPES } from './types';

interface DirectPlanImportSectionProps {
    activeGoalId?: string;
    sport: string;
    raceType: string;
    raceDate: string;
    planStartDate: string;
    goalName: string;
    durationWeeks: string;
    isLoading: boolean;
    setMessage: (msg: string) => void;
}

export default function DirectPlanImportSection({
    activeGoalId,
    sport,
    raceType,
    raceDate,
    planStartDate,
    goalName,
    durationWeeks,
    isLoading,
    setMessage,
}: DirectPlanImportSectionProps) {
    const queryClient = useQueryClient();
    const [isImportingSetupPlan, setIsImportingSetupPlan] = useState(false);
    const setupCsvInputRef = useRef<HTMLInputElement | null>(null);

    const resolveOrCreateGoalId = async (defaultName: string, errorLabel: string): Promise<string> => {
        if (activeGoalId) return activeGoalId;
        const isDurationBased = sport === 'NO_RACE' || sport === 'CYCLING';
        const effectiveSport = sport === 'CYCLING' ? 'CYCLING' : TRIATHLON_RACE_TYPES.has(raceType) ? 'TRIATHLON' : sport;
        const createRes = await fetch('/api/plans', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: goalName && goalName !== 'My First Race' ? goalName : defaultName,
                sport: effectiveSport,
                raceType: isDurationBased ? null : raceType,
                raceDate: isDurationBased ? null : (raceDate ? new Date(raceDate).toISOString() : null),
                planStartDate: planStartDate ? new Date(planStartDate).toISOString() : new Date().toISOString(),
                durationWeeks: parseInt(durationWeeks) || 8,
                planSource: 'advanced',
                creationMode: 'EXPERT_MANUAL',
                matchToMyWhoosh: false,
                mywhooshPlanId: null,
            }),
        });
        if (!createRes.ok) throw new Error(errorLabel);
        const createData = await createRes.json();
        const targetGoalId = createData.plan?.id ?? createData.goal?.id;
        if (!targetGoalId) throw new Error('Could not resolve plan ID');
        return targetGoalId;
    };

    return (
        <div className="border-t border-glass-border pt-6">
            <div className="p-4 rounded-md bg-surface border border-positive/40 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-positive">
                        Import Existing Training Plan Directly (CSV / Calendar Picture / .zwo)
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-positive/10 text-positive border border-positive/30">
                        Direct Setup Import
                    </span>
                </div>
                <p className="text-[11px] text-foreground-muted leading-relaxed">
                    Already have a schedule from a <strong>CSV file</strong>, a <strong>MyWhoosh / Coach Calendar screenshot</strong>, or a <strong>.zwo workout</strong>? Import it directly right here instead of generating from scratch. All cycling workouts can also be exported as <strong>.zwo</strong> files for{' '}
                    <a href="https://workout.mywhoosh.com" target="_blank" rel="noopener noreferrer" className="text-positive underline">
                        workout.mywhoosh.com
                    </a>.
                </p>

                <input
                    ref={setupCsvInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (!file) return;
                        setIsImportingSetupPlan(true);
                        setMessage('');
                        try {
                            const targetGoalId = await resolveOrCreateGoalId(
                                file.name.replace(/\.csv$/i, '') || 'Imported Plan',
                                'Failed to initialize plan for CSV import',
                            );

                            const formData = new FormData();
                            formData.append('file', file);
                            formData.append('formatHint', 'runflow');
                            const previewRes = await fetch(`/api/plan-advanced/${encodeURIComponent(targetGoalId)}/csv/import`, {
                                method: 'POST',
                                body: formData,
                            });
                            const previewData = await previewRes.json().catch(() => ({}));
                            if (!previewRes.ok || !previewData.previewId) {
                                throw new Error(previewData.error || 'Failed to parse CSV file');
                            }

                            const confirmRes = await fetch(`/api/plan-advanced/${encodeURIComponent(targetGoalId)}/csv/import`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ previewId: previewData.previewId, confirm: true }),
                            });
                            const confirmData = await confirmRes.json().catch(() => ({}));
                            if (!confirmRes.ok) {
                                throw new Error(confirmData.error || 'Failed to confirm CSV import');
                            }

                            if (typeof window !== 'undefined') {
                                localStorage.removeItem('runflow_onboarding_dismissed');
                            }
                            queryClient.invalidateQueries({ queryKey: ['goals'] });
                            queryClient.invalidateQueries({ queryKey: ['plan'] });
                            queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
                            setMessage(`Imported ${confirmData.created ?? previewData.validRows ?? 0} workouts from ${file.name}!`);
                            window.location.href = `/plan-advanced/${encodeURIComponent(targetGoalId)}`;
                        } catch (err) {
                            setMessage(`Error: ${err instanceof Error ? err.message : 'CSV import failed'}`);
                        } finally {
                            setIsImportingSetupPlan(false);
                        }
                    }}
                />

                <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                        type="button"
                        disabled={isImportingSetupPlan || isLoading}
                        onClick={() => setupCsvInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-positive/15 border border-positive/40 text-positive text-xs font-semibold hover:bg-positive/25 transition-colors disabled:opacity-50"
                    >
                        <Upload className="w-3.5 h-3.5" />
                        {isImportingSetupPlan ? 'Importing CSV...' : 'Upload & Import CSV (.csv)'}
                    </button>

                    <button
                        type="button"
                        disabled={isImportingSetupPlan || isLoading}
                        onClick={async () => {
                            setIsImportingSetupPlan(true);
                            setMessage('');
                            try {
                                const targetGoalId = await resolveOrCreateGoalId(
                                    'Imported Calendar Plan',
                                    'Failed to create plan for AI Calendar import',
                                );
                                window.location.href = `/plan-advanced/${encodeURIComponent(targetGoalId)}?import=ai-image`;
                            } catch (err) {
                                setMessage(`Error: ${err instanceof Error ? err.message : 'Failed to open Calendar Picture importer'}`);
                                setIsImportingSetupPlan(false);
                            }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-surface-hover border border-glass-border text-foreground text-xs font-medium hover:border-positive/50 transition-colors disabled:opacity-50"
                    >
                        <ImagePlus className="w-3.5 h-3.5 text-positive" />
                        Import from Calendar Picture (AI)
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            const sampleCsv = [
                                'date,workout_type,phase,name,description,distance_m,duration_s,pace_s_km,hr_zone',
                                '2026-10-26,RIDE_INTERVALS,BASE,Sweet Spot 3x10m,10m Warmup + 3x10m @ 90% FTP + 10m Cooldown,,3600,,3',
                                '2026-10-28,EASY,BASE,Easy Aerobic Run,Easy Zone 2 run,8000,2640,330,2',
                                '2026-10-31,LONG_RIDE,BASE,Endurance Ride 90m,Zone 2 sustained indoor/outdoor ride,,5400,,2',
                            ].join('\n');
                            const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'runflow_plan_template.csv';
                            document.body.appendChild(a);
                            a.click();
                            URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-2 rounded-md border border-glass-border text-foreground-muted hover:text-foreground text-xs transition-colors"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Sample CSV Template
                    </button>
                </div>
            </div>
        </div>
    );
}
