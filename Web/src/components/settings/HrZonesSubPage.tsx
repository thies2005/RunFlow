'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { Input } from '@/components/ui/Input';

export function HrZonesSubPage({ onBack: _onBack }: { onBack: () => void }) {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'running' | 'cycling'>('running');

    const { data: settingsData } = useQuery({
        queryKey: ['user-settings'],
        queryFn: async () => {
            const res = await fetch('/api/settings/update-vdot');
            if (!res.ok) throw new Error('Failed to fetch settings');
            return res.json();
        },
        refetchOnWindowFocus: false,
    });

    const { data: cyclingData } = useQuery({
        queryKey: ['cycling-settings'],
        queryFn: async () => {
            const res = await fetch('/api/settings/cycling');
            if (!res.ok) throw new Error('Failed to fetch cycling settings');
            return res.json();
        },
        refetchOnWindowFocus: false,
    });

    const [thresholdHr, setThresholdHr] = useState<number | undefined>(undefined);
    const [cyclingLthr, setCyclingLthr] = useState<number>(162);
    const [ftpWatts, setFtpWatts] = useState<number>(250);
    const [hrZone1Max, setHrZone1Max] = useState(130);
    const [hrZone2Max, setHrZone2Max] = useState(148);
    const [hrZone3Max, setHrZone3Max] = useState(160);
    const [hrZone4Max, setHrZone4Max] = useState(170);
    const [hrZone5Max, setHrZone5Max] = useState(178);
    const [hrZone6Max, setHrZone6Max] = useState(187);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (settingsData) {
            if (settingsData.thresholdHeartRate) {
                setThresholdHr(settingsData.thresholdHeartRate);
                setCyclingLthr(Math.max(110, settingsData.thresholdHeartRate - 8));
            }
            if (settingsData.hrZone1Max) setHrZone1Max(settingsData.hrZone1Max);
            if (settingsData.hrZone2Max) setHrZone2Max(settingsData.hrZone2Max);
            if (settingsData.hrZone3Max) setHrZone3Max(settingsData.hrZone3Max);
            if (settingsData.hrZone4Max) setHrZone4Max(settingsData.hrZone4Max);
            if (settingsData.hrZone5Max) setHrZone5Max(settingsData.hrZone5Max);
            if (settingsData.hrZone6Max) setHrZone6Max(settingsData.hrZone6Max);
        }
    }, [settingsData]);

    useEffect(() => {
        if (cyclingData) {
            const resolved = cyclingData.ftpWatts ?? cyclingData.eFtpWatts;
            if (resolved && resolved > 0) setFtpWatts(resolved);
        }
    }, [cyclingData]);

    const handleThresholdChange = (val: number) => {
        setThresholdHr(val);
        if (val > 0) {
            setHrZone1Max(Math.round(val * 0.75));
            setHrZone2Max(Math.round(val * 0.87));
            setHrZone3Max(Math.round(val * 0.94));
            setHrZone4Max(Math.round(val * 1.00));
            setHrZone5Max(Math.round(val * 1.05));
            setHrZone6Max(Math.round(val * 1.10));
            setCyclingLthr(Math.max(110, val - 8));
        }
    };

    const saveMutation = useMutation({
        mutationFn: async () => {
            const [hrRes, bikeRes] = await Promise.all([
                fetch('/api/settings/profile', {
                    method: 'POST',
                    body: JSON.stringify({ thresholdHeartRate: thresholdHr, hrZone1Max, hrZone2Max, hrZone3Max, hrZone4Max, hrZone5Max, hrZone6Max }),
                    headers: { 'Content-Type': 'application/json' },
                }),
                fetch('/api/settings/cycling', {
                    method: 'PUT',
                    body: JSON.stringify({ ftpWatts }),
                    headers: { 'Content-Type': 'application/json' },
                }),
            ]);
            if (!hrRes.ok || !bikeRes.ok) throw new Error('Failed to update');
            return hrRes.json();
        },
        onSuccess: () => {
            setMessage('Running & Cycling zones saved!');
            queryClient.invalidateQueries({ queryKey: ['user-settings'] });
            queryClient.invalidateQueries({ queryKey: ['cycling-settings'] });
            setTimeout(() => setMessage(''), 2000);
        },
        onError: () => setMessage('Error saving. Try again.'),
    });

    const zones = [
        { label: 'Zone 1 (Recovery)', desc: '<75% LTHR', value: hrZone1Max, setter: setHrZone1Max, color: 'text-zone-1' },
        { label: 'Zone 2 (Aerobic)', desc: '76-87% LTHR', value: hrZone2Max, setter: setHrZone2Max, color: 'text-zone-2' },
        { label: 'Zone 3 (Tempo)', desc: '88-94% LTHR', value: hrZone3Max, setter: setHrZone3Max, color: 'text-zone-3' },
        { label: 'Zone 4 (Threshold)', desc: '95-100% LTHR', value: hrZone4Max, setter: setHrZone4Max, color: 'text-zone-4' },
        { label: 'Zone 5 (VO2max)', desc: '101-105% LTHR', value: hrZone5Max, setter: setHrZone5Max, color: 'text-zone-5' },
        { label: 'Zone 6 (Anaerobic)', desc: '106-110% LTHR', value: hrZone6Max, setter: setHrZone6Max, color: 'text-negative' },
    ];

    const cogganPowerZones = [
        { name: 'Z1 Active Recovery', pct: '<55% FTP', min: 0, max: Math.round(ftpWatts * 0.55), color: 'text-zone-1' },
        { name: 'Z2 Endurance', pct: '56–75% FTP', min: Math.round(ftpWatts * 0.56), max: Math.round(ftpWatts * 0.75), color: 'text-blue-400' },
        { name: 'Z3 Tempo', pct: '76–90% FTP', min: Math.round(ftpWatts * 0.76), max: Math.round(ftpWatts * 0.90), color: 'text-cyan-400' },
        { name: 'Z4 Threshold', pct: '91–105% FTP', min: Math.round(ftpWatts * 0.91), max: Math.round(ftpWatts * 1.05), color: 'text-amber-400' },
        { name: 'Z5 VO2max', pct: '106–120% FTP', min: Math.round(ftpWatts * 1.06), max: Math.round(ftpWatts * 1.20), color: 'text-orange-400' },
        { name: 'Z6 Anaerobic', pct: '121–150% FTP', min: Math.round(ftpWatts * 1.21), max: Math.round(ftpWatts * 1.50), color: 'text-negative' },
        { name: 'Z7 Neuromuscular', pct: '>150% FTP', min: Math.round(ftpWatts * 1.51), max: null, color: 'text-rose-400' },
    ];

    const cyclingHrZones = [
        { name: 'Z1 Recovery', min: 0, max: Math.round(cyclingLthr * 0.75), color: 'text-zone-1' },
        { name: 'Z2 Endurance', min: Math.round(cyclingLthr * 0.75) + 1, max: Math.round(cyclingLthr * 0.87), color: 'text-zone-2' },
        { name: 'Z3 Tempo / Sweet Spot', min: Math.round(cyclingLthr * 0.87) + 1, max: Math.round(cyclingLthr * 0.94), color: 'text-zone-3' },
        { name: 'Z4 Threshold', min: Math.round(cyclingLthr * 0.94) + 1, max: cyclingLthr, color: 'text-zone-4' },
        { name: 'Z5 VO2max', min: cyclingLthr + 1, max: Math.round(cyclingLthr * 1.05), color: 'text-zone-5' },
        { name: 'Z6 Anaerobic', min: Math.round(cyclingLthr * 1.05) + 1, max: Math.round(cyclingLthr * 1.10), color: 'text-negative' },
        { name: 'Z7 Neuromuscular', min: Math.round(cyclingLthr * 1.10) + 1, max: null, color: 'text-workout-long-run' },
    ];

    return (
        <div className="p-5 space-y-5">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">Heart Rate & Power Zones</h3>
            </div>

            <div className="grid grid-cols-2 gap-2 p-1 bg-surface rounded-lg border border-line">
                <button
                    type="button"
                    onClick={() => setActiveTab('running')}
                    className={`py-2 px-3 rounded-md text-xs font-semibold transition-colors ${
                        activeTab === 'running'
                            ? 'bg-accent-orange text-white'
                            : 'text-foreground-muted hover:text-foreground'
                    }`}
                >
                    Running HR Zones
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('cycling')}
                    className={`py-2 px-3 rounded-md text-xs font-semibold transition-colors ${
                        activeTab === 'cycling'
                            ? 'bg-positive text-white'
                            : 'text-foreground-muted hover:text-foreground'
                    }`}
                >
                    Cycling Power & HR
                </button>
            </div>

            {activeTab === 'running' ? (
                <div className="space-y-4">
                    <Input
                        label="Running Threshold Heart Rate (LTHR)"
                        id="thresholdHr"
                        type="number"
                        value={thresholdHr || ''}
                        onChange={e => handleThresholdChange(parseInt(e.target.value) || 0)}
                        placeholder="e.g. 170"
                        helperText="Enter Running LTHR to auto-calculate 7-zone running HR thresholds"
                    />

                    <div className="space-y-3">
                        {zones.map((zone) => (
                            <div key={zone.label} className="flex items-center gap-3">
                                <div className={`text-sm font-medium w-32 ${zone.color}`}>{zone.label}</div>
                                <input
                                    type="number"
                                    value={zone.value}
                                    onChange={e => zone.setter(parseInt(e.target.value) || 0)}
                                    className="flex-1 bg-surface border border-line rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent-orange/50"
                                />
                                <span className="text-[10px] text-foreground-muted w-20 text-right">{zone.desc}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-foreground-muted mb-1">Cycling FTP (Watts)</label>
                            <input
                                type="number"
                                min={50}
                                max={600}
                                value={ftpWatts}
                                onChange={e => setFtpWatts(parseInt(e.target.value, 10) || 200)}
                                className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-positive/50"
                            />
                            {cyclingData?.eFtpWatts && (
                                <button
                                    type="button"
                                    onClick={() => setFtpWatts(cyclingData.eFtpWatts)}
                                    className="text-[11px] text-positive hover:underline mt-1 block"
                                >
                                    Detected from rides/FTP test: {cyclingData.eFtpWatts}W (click to apply)
                                </button>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs text-foreground-muted mb-1">Cycling LTHR (bpm)</label>
                            <input
                                type="number"
                                min={100}
                                max={220}
                                value={cyclingLthr}
                                onChange={e => setCyclingLthr(parseInt(e.target.value, 10) || 160)}
                                className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-positive/50"
                            />
                            <span className="text-[10px] text-foreground-muted mt-1 block">
                                Typically ~5–10 bpm lower than Running LTHR
                            </span>
                        </div>
                    </div>

                    <div className="bg-surface border border-line rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between border-b border-line pb-1.5">
                            <span className="text-xs font-semibold text-positive">Coggan Power Zones (Biking Watts)</span>
                            {cyclingData?.weightKg && ftpWatts > 0 && (
                                <span className="text-[11px] font-mono text-foreground-muted">
                                    {(ftpWatts / cyclingData.weightKg).toFixed(2)} W/kg
                                </span>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            {cogganPowerZones.map((z) => (
                                <div key={z.name} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-background-secondary/60">
                                    <span className={`font-medium ${z.color}`}>{z.name}</span>
                                    <div className="flex items-center gap-3 font-mono">
                                        <span className="text-foreground-muted text-[10px]">{z.pct}</span>
                                        <span className="text-foreground font-semibold">{z.min}–{z.max ?? '∞'} W</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-surface border border-line rounded-lg p-3 space-y-2">
                        <span className="text-xs font-semibold text-accent-orange block border-b border-line pb-1.5">
                            Cycling Heart Rate Zones (7-Zone Model)
                        </span>
                        <div className="space-y-1.5">
                            {cyclingHrZones.map((z) => (
                                <div key={z.name} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-background-secondary/60">
                                    <span className={`font-medium ${z.color}`}>{z.name}</span>
                                    <span className="font-mono text-foreground font-semibold">
                                        {z.min}–{z.max ?? '∞'} bpm
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

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
                Save Running & Cycling Zones
            </button>
        </div>
    );
}
