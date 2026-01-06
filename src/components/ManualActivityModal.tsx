'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Calendar, Activity, Clock, Heart } from 'lucide-react';

interface ManualActivityModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ManualActivityModal({ isOpen, onClose }: ManualActivityModalProps) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        name: '',
        date: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:mm
        type: 'RUN',
        distance: '',
        duration: '',
        hr: '',
    });

    const [isLoading, setIsLoading] = useState(false);

    const mutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            const res = await fetch('/api/activities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to create activity');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['activities'] });
            queryClient.invalidateQueries({ queryKey: ['recent-activities'] });
            queryClient.invalidateQueries({ queryKey: ['analytics-stats'] });
            onClose();
            // Reset form
            setFormData({
                name: '',
                date: new Date().toISOString().slice(0, 16),
                type: 'RUN',
                distance: '',
                duration: '',
                hr: '',
            });
        },
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await mutation.mutateAsync(formData);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-[#0f172a] border border-gray-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                    <h2 className="text-lg font-bold text-white">Manual Entry</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Title */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Title</label>
                        <input
                            type="text"
                            required
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Morning Run"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    {/* Date & Type */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Date & Time</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                                <input
                                    type="datetime-local"
                                    required
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 p-2.5 text-white text-sm outline-none"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Type</label>
                            <select
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white text-sm outline-none"
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            >
                                <option value="RUN">Run</option>
                                <option value="TREADMILL">Treadmill</option>
                                <option value="TRAIL_RUN">Trail Run</option>
                                <option value="RIDE">Ride</option>
                                <option value="VIRTUAL_RIDE">Virtual Ride</option>
                                <option value="SWIM">Swim</option>
                                <option value="WALK">Walk</option>
                                <option value="HIKE">Hike</option>
                            </select>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Dist (km)</label>
                            <div className="relative">
                                <Activity className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 p-2.5 text-white outline-none"
                                    value={formData.distance}
                                    onChange={(e) => setFormData({ ...formData, distance: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Dur (min)</label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                                <input
                                    type="number"
                                    required
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 p-2.5 text-white outline-none"
                                    value={formData.duration}
                                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">HR (avg)</label>
                            <div className="relative">
                                <Heart className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                                <input
                                    type="number"
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 p-2.5 text-white outline-none"
                                    placeholder="Optional"
                                    value={formData.hr}
                                    onChange={(e) => setFormData({ ...formData, hr: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full mt-4 btn-primary py-3 flex justify-center items-center gap-2"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            'Save Activity'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
