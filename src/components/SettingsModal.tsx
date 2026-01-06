'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Save, AlertCircle, Bike, Activity, Move } from 'lucide-react';

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

    // Plan Customization
    const [runsPerWeek, setRunsPerWeek] = useState(4);
    const [ridesPerWeek, setRidesPerWeek] = useState(1);
    const [strengthPerWeek, setStrengthPerWeek] = useState(0);
    const [weeklyMileage, setWeeklyMileage] = useState(40);

    // Heart Rate Settings
    const [maxHeartRate, setMaxHeartRate] = useState(185);
    const [restingHeartRate, setRestingHeartRate] = useState(55);

    const [message, setMessage] = useState('');

    const updateMutation = useMutation({
        mutationFn: async () => {
            const timeSeconds = (parseInt(hours) || 0) * 3600 + (parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0);
            const raceDistance = distance;

            if (timeSeconds === 0) throw new Error('Time cannot be zero');

            const res = await fetch('/api/settings/update-vdot', {
                method: 'POST',
                body: JSON.stringify({
                    timeSeconds,
                    raceDistance,
                    runsPerWeek,
                    ridesPerWeek,
                    strengthPerWeek,
                    weeklyMileageGoal: weeklyMileage * 1000, // Convert km to meters
                    maxHeartRate,
                    restingHeartRate
                }),
                headers: { 'Content-Type': 'application/json' }
            });

            if (!res.ok) throw new Error('Failed to update');
            return res.json();
        },
        onSuccess: (data) => {
            setMessage(`VDOT updated to ${data.vdot.toFixed(1)}! Plan regenerated.`);
            queryClient.invalidateQueries({ queryKey: ['goals'] });
            queryClient.invalidateQueries({ queryKey: ['plan'] });
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
            <div className="glass-card w-full max-w-md p-6 relative animate-slide-in max-h-[90vh] overflow-y-auto">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-xl font-bold text-white mb-6">Plan Settings</h2>

                <div className="space-y-6">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">Performance</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            Enter a recent race result to calibrate your VDOT.
                        </p>

                        {/* Race Distance */}
                        <div className="mb-4">
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
                    </div>

                    <div className="border-t border-white/10 pt-6">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Plan Volume</h3>

                        {/* Runs Per Week */}
                        <div className="mb-6">
                            <div className="flex justify-between mb-2">
                                <label className="text-xs text-gray-400 uppercase flex items-center gap-1"><Activity className="w-3 h-3" /> Runs / Week</label>
                                <span className="text-accent-orange font-bold">{runsPerWeek}</span>
                            </div>
                            <input
                                type="range"
                                min="2"
                                max="5"
                                value={runsPerWeek}
                                onChange={(e) => setRunsPerWeek(parseInt(e.target.value))}
                                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent-orange"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>2</span>
                                <span>3</span>
                                <span>5</span>
                            </div>
                        </div>

                        {/* Rides Per Week */}
                        <div className="mb-6">
                            <div className="flex justify-between mb-2">
                                <label className="text-xs text-gray-400 uppercase flex items-center gap-1"><Bike className="w-3 h-3" /> Rides / Week</label>
                                <span className="text-accent-cyan font-bold">{ridesPerWeek}</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="3"
                                value={ridesPerWeek}
                                onChange={(e) => setRidesPerWeek(parseInt(e.target.value))}
                                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent-cyan"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>0</span>
                                <span>1</span>
                                <span>2</span>
                                <span>3</span>
                            </div>
                        </div>

                        {/* Strength Per Week */}
                        <div className="mb-6">
                            <div className="flex justify-between mb-2">
                                <label className="text-xs text-gray-400 uppercase flex items-center gap-1">💪 Strength / Week</label>
                                <span className="text-purple-400 font-bold">{strengthPerWeek}</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="5"
                                value={strengthPerWeek}
                                onChange={(e) => setStrengthPerWeek(parseInt(e.target.value))}
                                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>0</span>
                                <span>2</span>
                                <span>5</span>
                            </div>
                        </div>

                        {/* Max Mileage Slider */}
                        <div className="mb-6">
                            <div className="flex justify-between mb-2">
                                <label className="text-xs text-gray-400 uppercase flex items-center gap-1"><Move className="w-3 h-3" /> Peak Mileage goal (km)</label>
                                <span className="text-green-400 font-bold">{weeklyMileage} km</span>
                            </div>
                            <input
                                type="range"
                                min="20"
                                max="80"
                                step="5"
                                value={weeklyMileage}
                                onChange={(e) => setWeeklyMileage(parseInt(e.target.value))}
                                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-green-500"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>20</span>
                                <span>50</span>
                                <span>80</span>
                            </div>
                        </div>
                    </div>

                    {/* Heart Rate Settings */}
                    <div className="border-t border-white/10 pt-6">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Heart Rate</h3>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1 uppercase">Max HR</label>
                                <input
                                    type="number"
                                    value={maxHeartRate}
                                    onChange={e => setMaxHeartRate(parseInt(e.target.value) || 185)}
                                    className={inputClass}
                                    min="130"
                                    max="220"
                                    placeholder="185"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1 uppercase">Resting HR</label>
                                <input
                                    type="number"
                                    value={restingHeartRate}
                                    onChange={e => setRestingHeartRate(parseInt(e.target.value) || 55)}
                                    className={inputClass}
                                    min="35"
                                    max="90"
                                    placeholder="55"
                                />
                            </div>
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
                        {updateMutation.isPending ? 'Generating Plan...' : 'Save & Generate Plan'}
                    </button>

                    <p className="text-xs text-gray-500 text-center mt-2">
                        Adjusting settings will completely regenerate your future workout schedule.
                    </p>
                </div>
            </div>
        </div>
    );
}
