'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { X, Save, AlertCircle, User, Trash2 } from 'lucide-react';
import { signOut } from 'next-auth/react';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
    const queryClient = useQueryClient();
    const [weight, setWeight] = useState(70);
    const [height, setHeight] = useState(175);
    const [message, setMessage] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Fetch existing settings
    const { data: settingsData } = useQuery({
        queryKey: ['user-settings'],
        queryFn: async () => {
            const res = await fetch('/api/settings/update-vdot');
            if (!res.ok) throw new Error('Failed to fetch settings');
            return res.json();
        },
        refetchOnWindowFocus: false,
    });

    // Populate form with existing data
    useEffect(() => {
        if (settingsData) {
            setWeight(settingsData.weight || 70);
            setHeight(settingsData.height || 175);
        }
    }, [settingsData]);

    const updateMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/settings/profile', {
                method: 'POST',
                body: JSON.stringify({ weight, height }),
                headers: { 'Content-Type': 'application/json' }
            });

            if (!res.ok) throw new Error('Failed to update profile');
            return res.json();
        },
        onSuccess: () => {
            setMessage('Profile updated!');
            queryClient.invalidateQueries({ queryKey: ['user-settings'] });
            queryClient.invalidateQueries({ queryKey: ['analytics-stats'] });
            setTimeout(() => {
                setMessage('');
                onClose();
            }, 1500);
        },
        onError: () => {
            setMessage('Error updating profile. Please try again.');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/user/delete', {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete account');
            return res.json();
        },
        onSuccess: async () => {
            // Force refresh to handle redirect
            await signOut({ callbackUrl: '/' });
        },
        onError: () => {
            setMessage('Error deleting account. Please try again.');
            setIsDeleting(false);
        }
    });

    const handleDelete = () => {
        setIsDeleting(true);
        deleteMutation.mutate();
    };

    if (!isOpen) return null;

    const inputClass = "bg-white/5 border border-white/10 rounded-lg p-3 text-white w-full outline-none focus:ring-2 focus:ring-accent-orange transition-all";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="glass-card w-full max-w-sm p-6 relative animate-slide-in">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-accent-orange/20 flex items-center justify-center">
                        <User className="w-5 h-5 text-accent-orange" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Profile</h2>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1 uppercase">Weight (kg)</label>
                        <input
                            type="number"
                            value={weight}
                            onChange={e => setWeight(parseInt(e.target.value) || 70)}
                            className={inputClass}
                            min="30"
                            max="200"
                            placeholder="70"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1 uppercase">Height (cm)</label>
                        <input
                            type="number"
                            value={height}
                            onChange={e => setHeight(parseInt(e.target.value) || 175)}
                            className={inputClass}
                            min="100"
                            max="250"
                            placeholder="175"
                        />
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
                        {updateMutation.isPending ? 'Saving...' : 'Save Profile'}
                    </button>

                    <div className="border-t border-white/10 my-4"></div>

                    <div>
                        <h3 className="text-red-400 font-medium mb-3 text-xs uppercase tracking-wider">Danger Zone</h3>
                        {!showDeleteConfirm ? (
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="w-full py-2.5 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/10 transition-colors text-sm flex items-center justify-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete Account
                            </button>
                        ) : (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 animate-fade-in">
                                <p className="text-red-200 text-xs mb-4 leading-relaxed">
                                    Are you sure? This will details permanently delete your account, activities, and goals. This action cannot be undone.
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="flex-1 py-2 bg-white/5 text-white text-xs rounded-md hover:bg-white/10 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        disabled={isDeleting}
                                        className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white text-xs rounded-md flex items-center justify-center gap-2 transition-colors font-medium shadow-lg shadow-red-500/20"
                                    >
                                        {isDeleting ? <AlertCircle className="animate-spin w-3 h-3" /> : <Trash2 className="w-3 h-3" />}
                                        {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
