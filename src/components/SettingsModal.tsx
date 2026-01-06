'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Save, AlertCircle } from 'lucide-react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const queryClient = useQueryClient();
    const [distance, setDistance] = useState('5K');
    const [hours, setHours] = useState('0');
    const [minutes, setMinutes] = useState('25');
    const [seconds, setSeconds] = useState('0');
    const [message, setMessage] = useState('');

    const updateMutation = useMutation({
        mutationFn: async () => {
            const timeSeconds = (parseInt(hours) || 0) * 3600 + (parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0);
            const raceDistance = distance;

            if (timeSeconds === 0) throw new Error('Time cannot be zero');

            const res = await fetch('/api/settings/update-vdot', {
                method: 'POST',
                body: JSON.stringify({ timeSeconds, raceDistance }),
                headers: { 'Content-Type': 'application/json' }
            });

            if (!res.ok) throw new Error('Failed to update');
            return res.json();
        },
        onSuccess: (data) => {
            setMessage(`VDOT updated to ${data.vdot.toFixed(1)}! Plan regenerated.`);
            queryClient.invalidateQueries({ queryKey: ['goals'] });
            setTimeout(() => {
                setMessage('');
                onClose();
            }, 2000);
        },
        onError: () => {
            setMessage('Error updating settings. Please try again.');
        }
    });

    if (!isOpen) return null;

    const inputClass = "bg-white/5 border border-white/10 rounded-lg p-3 text-white w-full outline-none focus:ring-2 focus:ring-accent-orange transition-all";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="glass-card w-full max-w-md p-6 relative animate-slide-in">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-xl font-bold text-white mb-6">Settings</h2>

                <div className="space-y-6">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">Calibrate Training</h3>
                        <p className="text-sm text-gray-500">
                            Enter a recent race result to calibrate your VDOT and regenerate your training plan.
                        </p>
                    </div>

                    {/* Race Distance */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-1 uppercase">Distance</label>
                        <select
                            value={distance}
                            onChange={(e) => setDistance(e.target.value)}
                            className={inputClass}
                        >
                            <option value="5K">5K</option>
                            <option value="10K">10K</option>
                            <option value="HALF">Half Marathon</option>
                            <option value="MARATHON">Marathon</option>
                        </select>
                    </div>

                    {/* Time */}
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1 uppercase">Hours</label>
                            <input
                                type="number"
                                value={hours}
                                onChange={e => setHours(e.target.value)}
                                className={inputClass}
                                min="0"
                                placeholder="00"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1 uppercase">Mins</label>
                            <input
                                type="number"
                                value={minutes}
                                onChange={e => setMinutes(e.target.value)}
                                className={inputClass}
                                min="0"
                                max="59"
                                placeholder="00"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1 uppercase">Secs</label>
                            <input
                                type="number"
                                value={seconds}
                                onChange={e => setSeconds(e.target.value)}
                                className={inputClass}
                                min="0"
                                max="59"
                                placeholder="00"
                            />
                        </div>
                    </div>

                    {message && (
                        <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${message.includes('Error') ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                            <AlertCircle className="w-4 h-4" />
                            {message}
                        </div>
                    )}

                    <button
                        onClick={() => updateMutation.mutate()}
                        disabled={updateMutation.isPending}
                        className="btn-primary w-full flex items-center justify-center gap-2 py-3"
                    >
                        {updateMutation.isPending ? <Save className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                        {updateMutation.isPending ? 'Updating...' : 'Save & Recalibrate'}
                    </button>
                </div>
            </div>
        </div>
    );
}
