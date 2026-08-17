'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

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
        try {
            await mutation.mutateAsync(formData);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Manual Entry" maxWidth="md">
            <form onSubmit={handleSubmit} className="space-y-4">
                {mutation.isError && (
                    <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                        Failed to create activity. Please try again.
                    </div>
                )}

                {/* Title */}
                <Input
                    label="Title *"
                    type="text"
                    required
                    placeholder="Morning Run"
                    value={formData.name}
                    onChange={(e) => {
                        setFormData({ ...formData, name: e.target.value });
                        if (mutation.isError) mutation.reset();
                    }}
                />

                {/* Date & Type */}
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Date & Time *"
                        type="datetime-local"
                        required
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                    <Select
                        label="Type"
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    >
                        <option value="RUN" className="bg-background-secondary">Run</option>
                        <option value="TREADMILL" className="bg-background-secondary">Treadmill</option>
                        <option value="TRAIL_RUN" className="bg-background-secondary">Trail Run</option>
                        <option value="RIDE" className="bg-background-secondary">Ride</option>
                        <option value="VIRTUAL_RIDE" className="bg-background-secondary">Virtual Ride</option>
                        <option value="SWIM" className="bg-background-secondary">Swim</option>
                        <option value="WALK" className="bg-background-secondary">Walk</option>
                        <option value="HIKE" className="bg-background-secondary">Hike</option>
                    </Select>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                    <Input
                        label="Dist (km) *"
                        type="number"
                        step="0.01"
                        required
                        value={formData.distance}
                        onChange={(e) => setFormData({ ...formData, distance: e.target.value })}
                    />
                    <Input
                        label="Dur (min) *"
                        type="number"
                        required
                        value={formData.duration}
                        onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    />
                    <Input
                        label="HR (avg)"
                        type="number"
                        placeholder="Optional"
                        value={formData.hr}
                        onChange={(e) => setFormData({ ...formData, hr: e.target.value })}
                    />
                </div>

                <button
                    type="submit"
                    disabled={mutation.isPending}
                    className="w-full mt-4 btn-primary py-3 flex justify-center items-center gap-2"
                >
                    {mutation.isPending ? (
                        <div className="w-5 h-5 border-2 border-foreground/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        'Save Activity'
                    )}
                </button>
            </form>
        </Modal>
    );
}
