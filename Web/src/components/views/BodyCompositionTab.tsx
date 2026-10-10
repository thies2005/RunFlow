'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, ArrowLeft, Ruler } from 'lucide-react';
import { toast } from 'sonner';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { formatUtcDayKey, getCurrentUtcDayKey } from '@/lib/health/dates';

export function BodyCompositionTab() {
    const queryClient = useQueryClient();
    const [isLogging, setIsLogging] = useState(false);
    
    // Form state
    const [dateStr, setDateStr] = useState(getCurrentUtcDayKey());
    const [weight, setWeight] = useState('');
    const [bodyFat, setBodyFat] = useState('');
    const [muscleMass, setMuscleMass] = useState('');
    const [waist, setWaist] = useState('');
    const [chest, setChest] = useState('');
    const [hips, setHips] = useState('');
    const [arms, setArms] = useState('');
    
    // View state
    const [selectedMetric, setSelectedMetric] = useState<'weight' | 'bodyFat' | 'muscleMass' | 'waist'>('weight');

    const { data: compData, isLoading } = useQuery({
        queryKey: ['body-composition'],
        queryFn: async () => {
            const res = await fetch('/api/health/body-composition');
            if (!res.ok) throw new Error('Failed to fetch data');
            return res.json();
        }
    });

    interface BodyCompositionPayload {
        dateStr: string;
        weight?: number;
        bodyFat?: number;
        muscleMass?: number;
        waist?: number;
        chest?: number;
        hips?: number;
        arms?: number;
    }

    const saveMutation = useMutation({
        mutationFn: async () => {
            const payload: BodyCompositionPayload = { dateStr };
            if (weight) payload.weight = parseFloat(weight);
            if (bodyFat) payload.bodyFat = parseFloat(bodyFat);
            if (muscleMass) payload.muscleMass = parseFloat(muscleMass);
            if (waist) payload.waist = parseFloat(waist);
            if (chest) payload.chest = parseFloat(chest);
            if (hips) payload.hips = parseFloat(hips);
            if (arms) payload.arms = parseFloat(arms);

            const res = await fetch('/api/health/body-composition', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Failed to save');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['body-composition'] });
            queryClient.invalidateQueries({ queryKey: ['daily-health'] });
            setIsLogging(false);
            setWeight('');
            setBodyFat('');
            setMuscleMass('');
            setWaist('');
            setChest('');
            setHips('');
            setArms('');
            toast.success('Measurements saved');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to save measurements');
        }
    });

    const measurements = compData?.measurements || [];

    const getMetricConfig = () => {
        switch(selectedMetric) {
            case 'weight': return { name: 'Weight (kg)', color: 'var(--positive)', dataKey: 'weight' };
            case 'bodyFat': return { name: 'Body Fat %', color: 'var(--workout-tempo)', dataKey: 'bodyFat' };
            case 'muscleMass': return { name: 'Muscle Mass (kg)', color: 'var(--accent-blue)', dataKey: 'muscleMass' };
            case 'waist': return { name: 'Waist Size (cm)', color: 'var(--workout-long-run)', dataKey: 'waist' };
        }
    };

    const config = getMetricConfig();

    return (
        <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-2 duration-300">
            {isLogging ? (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                        <button onClick={() => setIsLogging(false)} className="p-1.5 hover:bg-background-tertiary rounded-md text-foreground-muted">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h3 className="text-foreground font-semibold">Log Measurements</h3>
                    </div>

                    <div className="space-y-3 bg-background-tertiary rounded-md p-4 border border-line">
                        <div>
                            <label className="text-xs font-semibold text-foreground-muted mb-1 block">Date</label>
                            <input 
                                type="date" 
                                value={dateStr}
                                onChange={(e) => setDateStr(e.target.value)}
                                className="w-full bg-background-tertiary border border-line rounded-md px-3 py-2 text-sm text-foreground focus:outline-hidden focus:border-accent-blue"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground-muted mb-1 block">Weight (kg)</label>
                                <input 
                                    type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)}
                                    placeholder="e.g. 72.4"
                                    className="w-full bg-background-tertiary border border-line rounded-md px-3 py-2 text-sm text-foreground focus:outline-hidden focus:border-accent-blue"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-foreground-muted mb-1 block">Body Fat (%)</label>
                                <input 
                                    type="number" step="0.1" value={bodyFat} onChange={e => setBodyFat(e.target.value)}
                                    placeholder="e.g. 15.5"
                                    className="w-full bg-background-tertiary border border-line rounded-md px-3 py-2 text-sm text-foreground focus:outline-hidden focus:border-accent-blue"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-foreground-muted mb-1 block">Muscle Mass (kg)</label>
                                <input 
                                    type="number" step="0.1" value={muscleMass} onChange={e => setMuscleMass(e.target.value)}
                                    placeholder="e.g. 35.2"
                                    className="w-full bg-background-tertiary border border-line rounded-md px-3 py-2 text-sm text-foreground focus:outline-hidden focus:border-accent-blue"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-foreground-muted mb-1 block">Waist (cm)</label>
                                <input 
                                    type="number" step="0.5" value={waist} onChange={e => setWaist(e.target.value)}
                                    placeholder="e.g. 80"
                                    className="w-full bg-background-tertiary border border-line rounded-md px-3 py-2 text-sm text-foreground focus:outline-hidden focus:border-accent-blue"
                                />
                            </div>
                             <div>
                                <label className="text-xs font-semibold text-foreground-muted mb-1 block">Chest (cm)</label>
                                <input 
                                    type="number" step="0.5" value={chest} onChange={e => setChest(e.target.value)}
                                    placeholder="e.g. 100"
                                    className="w-full bg-background-tertiary border border-line rounded-md px-3 py-2 text-sm text-foreground focus:outline-hidden focus:border-accent-blue"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-foreground-muted mb-1 block">Hips (cm)</label>
                                <input 
                                    type="number" step="0.5" value={hips} onChange={e => setHips(e.target.value)}
                                    placeholder="e.g. 95"
                                    className="w-full bg-background-tertiary border border-line rounded-md px-3 py-2 text-sm text-foreground focus:outline-hidden focus:border-accent-blue"
                                />
                            </div>
                        </div>
                        <button
                            onClick={() => saveMutation.mutate()}
                            disabled={saveMutation.isPending}
                            className="w-full mt-4 bg-accent-orange hover:bg-accent-orange/90 text-white font-semibold py-2.5 rounded-md transition-colors flex items-center justify-center gap-2"
                        >
                            <Save className="w-4 h-4" /> {saveMutation.isPending ? 'Saving...' : 'Save Measurements'}
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex bg-background-tertiary rounded-md p-1 border border-line shrink-0 overflow-x-auto w-full max-w-[300px]">
                            {([
                                { id: 'weight', label: 'Weight' },
                                { id: 'bodyFat', label: 'Body Fat %' },
                                { id: 'muscleMass', label: 'Muscle Mass' },
                                { id: 'waist', label: 'Waist' }
                            ] as const).map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => setSelectedMetric(m.id)}
                                    className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors whitespace-nowrap ${selectedMetric === m.id ? 'bg-glass-bg text-foreground' : 'text-foreground-muted hover:text-foreground-muted'}`}
                                >
                                    {m.label}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setIsLogging(true)}
                            className="ml-auto p-2 bg-accent-orange/10 text-accent-orange hover:bg-accent-orange/20 rounded-md transition-colors text-xs font-semibold shrink-0"
                        >
                            + Log
                        </button>
                    </div>

                    <div className="flex-1 w-full relative min-h-[250px] bg-background-tertiary border border-line rounded-md p-4">
                        {isLoading ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-foreground-muted">Loading chart data...</div>
                            </div>
                        ) : measurements.length === 0 ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                                <Ruler className="w-8 h-8 text-foreground-muted mb-2 opacity-50" />
                                <div className="text-foreground-muted text-sm font-semibold mb-1">No measurements yet</div>
                                <div className="text-foreground-muted text-xs">Tap + Log to record your first entry</div>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={measurements} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
                                    <XAxis
                                        dataKey="dateStr"
                                        stroke="var(--foreground-muted)"
                                        fontSize={10}
                                        tickLine={false}
                                        tickFormatter={(val) => formatUtcDayKey(val, { month: 'short', day: 'numeric' })}
                                    />
                                    <YAxis stroke="var(--foreground-muted)" fontSize={10} tickLine={false} domain={['dataMin - 1', 'auto']} />
                                    <Tooltip
                                        contentStyle={{ background: 'var(--panel-bg)', border: '1px solid var(--line)', borderRadius: '6px' }}
                                        labelStyle={{ color: 'var(--foreground)' }}
                                        itemStyle={{ color: 'var(--foreground)' }}
                                        labelFormatter={(val) => formatUtcDayKey(val, { weekday: 'long', month: 'short', day: 'numeric' })}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey={config.dataKey}
                                        name={config.name}
                                        stroke={config.color}
                                        strokeWidth={3}
                                        dot={{ r: 3, fill: config.color, strokeWidth: 0 }}
                                        activeDot={{ r: 5, fill: config.color }}
                                        connectNulls={true}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
