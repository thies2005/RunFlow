'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { useMutation } from '@tanstack/react-query';
import { ChevronLeft, Trash2, AlertCircle } from 'lucide-react';
import { evictAuthBoundCaches } from '@/lib/pwa/authCacheEviction';

export function DangerShortcut() {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [message, setMessage] = useState('');

    const deleteMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/user/delete', { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete account');
            return res.json();
        },
        onSuccess: async () => {
            // Evict auth-bound SW runtime caches before the sign-out
            // navigation (account deletion is also an auth-state change).
            await evictAuthBoundCaches();
            await signOut({ callbackUrl: '/' });
        },
        onError: () => {
            setMessage('Error deleting account.');
            setIsDeleting(false);
        },
    });

    return (
        <div>
            <h4 className="text-xs text-negative font-medium mb-3">Danger Zone</h4>
            {!showDeleteConfirm ? (
                <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full py-2.5 border border-negative/30 text-negative rounded-md hover:bg-negative/10 transition-colors text-sm flex items-center justify-center gap-2"
                >
                    <Trash2 className="w-4 h-4" />
                    Delete Account
                </button>
            ) : (
                <div className="bg-negative/10 border border-negative/20 rounded-md p-4">
                    <p className="text-negative text-xs mb-4 leading-relaxed">
                        Are you sure? This will permanently delete your account, activities, and goals.
                    </p>
                    <div className="flex gap-3">
                        <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 bg-background-tertiary text-foreground text-xs rounded-md hover:bg-surface-hover">Cancel</button>
                        <button
                            onClick={() => { setIsDeleting(true); deleteMutation.mutate(); }}
                            disabled={isDeleting}
                            className="flex-1 py-2 bg-negative hover:bg-negative/90 text-white text-xs rounded-lg flex items-center justify-center gap-2 font-medium"
                        >
                            {isDeleting ? <AlertCircle className="animate-spin w-3 h-3" /> : <Trash2 className="w-3 h-3" />}
                            {isDeleting ? 'Deleting...' : 'Confirm'}
                        </button>
                    </div>
                </div>
            )}
            {message && <p className="text-xs text-negative mt-2">{message}</p>}
        </div>
    );
}

export function DangerSection({ onBack }: { onBack: () => void }) {
    return (
        <div className="p-5 space-y-5">
            <div className="flex items-center gap-2">
                <button aria-label="Back to settings" onClick={onBack} className="text-foreground-muted hover:text-foreground"><ChevronLeft className="w-4 h-4" /></button>
                <h3 className="text-lg font-bold text-negative">Danger Zone</h3>
            </div>
            <DangerShortcut />
        </div>
    );
}
