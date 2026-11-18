'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { Input } from '@/components/ui/Input';

export function BiometricsSubPage({ onBack: _onBack }: { onBack: () => void }) {
    const queryClient = useQueryClient();
    const { data: settingsData } = useQuery({
        queryKey: ['user-settings'],
        queryFn: async () => {
            const res = await fetch('/api/settings/update-vdot');
            if (!res.ok) throw new Error('Failed to fetch settings');
            return res.json();
        },
        refetchOnWindowFocus: false,
    });

    const [weight, setWeight] = useState(70);
    const [height, setHeight] = useState(175);
    const [includeCrossTraining, setIncludeCrossTraining] = useState(false);
    const [useImperial, setUseImperial] = useState(false);
    const [healthTrackingEnabled, setHealthTrackingEnabled] = useState(false);
    const [effectiveVo2maxCorrectionFactor, setEffectiveVo2maxCorrectionFactor] = useState(1.0);
    const [vdotCorrectionFactor, setVdotCorrectionFactor] = useState(1.0);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (settingsData) {
            setWeight(settingsData.weight || 70);
            setHeight(settingsData.height || 175);
            if (typeof settingsData.includeCrossTraining === 'boolean') setIncludeCrossTraining(settingsData.includeCrossTraining);
            if (typeof settingsData.useImperial === 'boolean') setUseImperial(settingsData.useImperial);
            if (typeof settingsData.healthTrackingEnabled === 'boolean') setHealthTrackingEnabled(settingsData.healthTrackingEnabled);
            if (typeof settingsData.effectiveVo2maxCorrectionFactor === 'number' && settingsData.effectiveVo2maxCorrectionFactor > 0) {
                setEffectiveVo2maxCorrectionFactor(settingsData.effectiveVo2maxCorrectionFactor);
            }
            if (typeof settingsData.vdotCorrectionFactor === 'number' && settingsData.vdotCorrectionFactor > 0) {
                setVdotCorrectionFactor(settingsData.vdotCorrectionFactor);
            }
        }
    }, [settingsData]);

    const saveMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/settings/profile', {
                method: 'POST',
                body: JSON.stringify({ weight, height, includeCrossTraining, useImperial }),
                headers: { 'Content-Type': 'application/json' },
            });
            if (!res.ok) throw new Error('Failed to update');
            return res.json();
        },
        onSuccess: () => {
            setMessage('Profile updated!');
            queryClient.invalidateQueries({ queryKey: ['user-settings'] });
            queryClient.invalidateQueries({ queryKey: ['analytics-stats'] });
            setTimeout(() => setMessage(''), 2000);
        },
        onError: () => setMessage('Error updating profile.'),
    });

    const vdotCorrectionMutation = useMutation({
        mutationFn: async (payload: { manualEffectiveVo2maxFactor?: number; manualFactor?: number; correctionFactor?: number }) => {
            const res = await fetch('/api/settings/vdot-correction', {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' },
            });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to update calibration');
            }
            return res.json();
        },
        onSuccess: () => {
            setMessage('Calibration saved!');
            queryClient.invalidateQueries({ queryKey: ['user-settings'] });
            queryClient.invalidateQueries({ queryKey: ['analytics-stats'] });
            setTimeout(() => setMessage(''), 2000);
        },
        onError: (err: Error) => setMessage(`Error saving calibration: ${err.message}`),
    });

    const healthToggleMutation = useMutation({
        mutationFn: async (enabled: boolean) => {
            const res = await fetch('/api/user/health-settings', {
                method: 'PUT',
                body: JSON.stringify({ healthTrackingEnabled: enabled }),
                headers: { 'Content-Type': 'application/json' },
            });
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        onSuccess: (data) => {
            setHealthTrackingEnabled(data.healthTrackingEnabled);
            queryClient.invalidateQueries({ queryKey: ['user-settings'] });
            setMessage(data.healthTrackingEnabled ? 'Health tracking enabled!' : 'Disabled.');
            setTimeout(() => setMessage(''), 2000);
        },
        onError: () => setMessage('Error updating health settings.'),
    });

    return (
        <div className="p-5 space-y-5">
            <h3 className="text-lg font-bold text-foreground">Biometrics</h3>
            <p className="text-sm text-foreground-secondary">Profile fields are saved with Save Profile. Display choices update immediately; calibration has its own Save Factor button.</p>

            <div className="grid grid-cols-2 gap-4">
                <Input
                    label={useImperial ? 'Weight (lbs)' : 'Weight (kg)'}
                    id="weight"
                    type="number"
                    value={weight}
                    onChange={e => setWeight(parseInt(e.target.value) || 70)}
                    min="30"
                    max="200"
                    placeholder="70"
                />
                <Input
                    label={useImperial ? 'Height (in)' : 'Height (cm)'}
                    id="height"
                    type="number"
                    value={height}
                    onChange={e => setHeight(parseInt(e.target.value) || 175)}
                    min="100"
                    max="250"
                    placeholder="175"
                />
            </div>

            <div className="space-y-3 pt-2 border-t border-line">
                <h4 className="text-xs text-accent-orange font-semibold">Marathon Shape</h4>
                <div className="flex items-center justify-between p-3 rounded-md bg-surface border border-line">
                    <div>
                        <p className="text-sm text-foreground">Include Cross-Training</p>
                        <p className="text-[10px] text-foreground-muted">Count cycling, swimming towards shape</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIncludeCrossTraining(!includeCrossTraining)}
                        role="switch" aria-checked={includeCrossTraining} aria-label="Include cross-training"
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${includeCrossTraining ? 'bg-accent-orange' : 'bg-line-strong'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${includeCrossTraining ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-line">
                <h4 className="text-xs text-accent-orange font-semibold">Running Fitness · Race Predictions</h4>

                <div className="p-3 rounded-md bg-surface border border-line space-y-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-foreground">Effective VO2max Correction Factor</p>
                            <p className="text-[10px] text-foreground-muted">Scales HR-based aerobic fitness for race predictions</p>
                        </div>
                        <span className="text-sm font-mono tabular-nums text-foreground shrink-0">{effectiveVo2maxCorrectionFactor.toFixed(2)}x</span>
                    </div>
                    <input
                        type="range"
                        min="0.85"
                        max="1.15"
                        step="0.01"
                        value={effectiveVo2maxCorrectionFactor}
                        onChange={e => setEffectiveVo2maxCorrectionFactor(parseFloat(e.target.value))}
                        className="w-full accent-accent-orange"
                        aria-label="Effective VO2max Correction Factor"
                    />
                    <div className="flex items-center justify-between gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setEffectiveVo2maxCorrectionFactor(1.0);
                                vdotCorrectionMutation.mutate({ manualEffectiveVo2maxFactor: 1.0 });
                            }}
                            disabled={vdotCorrectionMutation.isPending}
                            className="text-xs text-foreground-muted hover:text-foreground underline disabled:opacity-50"
                        >
                            Reset to 1.00x
                        </button>
                        <button
                            type="button"
                            onClick={() => vdotCorrectionMutation.mutate({ manualEffectiveVo2maxFactor: effectiveVo2maxCorrectionFactor })}
                            disabled={vdotCorrectionMutation.isPending}
                            className="px-3 py-1.5 rounded-md bg-accent-blue text-white text-xs font-medium disabled:opacity-50"
                        >
                            {vdotCorrectionMutation.isPending ? 'Saving...' : 'Save Factor'}
                        </button>
                    </div>
                </div>

                <div className="p-3 rounded-md bg-surface border border-line space-y-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-foreground">Training Pace Adjustment</p>
                            <p className="text-[10px] text-foreground-muted">Scales best-effort VDOT for training paces</p>
                        </div>
                        <span className="text-sm font-mono tabular-nums text-foreground shrink-0">{vdotCorrectionFactor.toFixed(2)}x</span>
                    </div>
                    <input
                        type="range"
                        min="0.75"
                        max="1.25"
                        step="0.01"
                        value={vdotCorrectionFactor}
                        onChange={e => setVdotCorrectionFactor(parseFloat(e.target.value))}
                        className="w-full accent-accent-orange"
                        aria-label="Training Pace Adjustment"
                    />
                    <div className="flex items-center justify-between gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setVdotCorrectionFactor(1.0);
                                vdotCorrectionMutation.mutate({ manualFactor: 1.0, correctionFactor: 1.0 });
                            }}
                            disabled={vdotCorrectionMutation.isPending}
                            className="text-xs text-foreground-muted hover:text-foreground underline disabled:opacity-50"
                        >
                            Reset to 1.00x
                        </button>
                        <button
                            type="button"
                            onClick={() => vdotCorrectionMutation.mutate({ manualFactor: vdotCorrectionFactor, correctionFactor: vdotCorrectionFactor })}
                            disabled={vdotCorrectionMutation.isPending}
                            className="px-3 py-1.5 rounded-md bg-accent-blue text-white text-xs font-medium disabled:opacity-50"
                        >
                            {vdotCorrectionMutation.isPending ? 'Saving...' : 'Save Factor'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-line">
                <h4 className="text-xs text-accent-orange font-semibold">Display</h4>
                <div className="flex items-center justify-between p-3 rounded-md bg-surface border border-line">
                    <div>
                        <p className="text-sm text-foreground">Use Miles</p>
                        <p className="text-[10px] text-foreground-muted">Distance and pace in miles</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setUseImperial(!useImperial)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${useImperial ? 'bg-accent-orange' : 'bg-line-strong'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useImperial ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-line">
                <h4 className="text-xs text-positive font-semibold">Health Tracking</h4>
                <div className="flex items-center justify-between p-3 rounded-md bg-surface border border-line">
                    <div>
                        <p className="text-sm text-foreground">Enable Health Features</p>
                        <p className="text-[10px] text-foreground-muted">Track weight, steps, supplements</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => healthToggleMutation.mutate(!healthTrackingEnabled)}
                        disabled={healthToggleMutation.isPending}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${healthTrackingEnabled ? 'bg-positive' : 'bg-line-strong'} ${healthToggleMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${healthTrackingEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
            </div>

            {message && (
                <div className={`p-3 rounded-lg text-sm ${message.includes('Error') ? 'bg-negative/10 text-negative' : 'bg-positive/10 text-positive'}`}>
                    {message}
                </div>
            )}

            <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
                {saveMutation.isPending ? <Save className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                Save Profile
            </button>
        </div>
    );
}
