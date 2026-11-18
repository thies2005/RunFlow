'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ShieldCheck, ShieldOff } from 'lucide-react';

export function PrivacySection({ healthTrackingEnabled: initialHealth, onBack }: { healthTrackingEnabled: boolean; onBack: () => void }) {
    const [healthTrackingEnabled, setHealthTrackingEnabled] = useState(initialHealth);
    const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [message, setMessage] = useState('');
    const queryClient = useQueryClient();

    return (
        <div className="p-5 space-y-5">
            <div className="flex items-center gap-2">
                <button aria-label="Back to settings" onClick={onBack} className="text-foreground-muted hover:text-foreground"><ChevronLeft className="w-4 h-4" /></button>
                <h3 className="text-lg font-bold text-foreground">Privacy & Consent</h3>
            </div>

            <div className="bg-surface border border-line rounded-md p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-positive" />
                        <span className="text-sm text-foreground">Terms of Service</span>
                    </div>
                    <span className="text-[10px] text-positive">Accepted</span>
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-positive" />
                        <span className="text-sm text-foreground">Privacy Policy</span>
                    </div>
                    <span className="text-[10px] text-positive">Accepted</span>
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {healthTrackingEnabled ? <ShieldCheck className="w-3.5 h-3.5 text-positive" /> : <ShieldOff className="w-3.5 h-3.5 text-foreground-muted" />}
                        <span className="text-sm text-foreground">Health Data Processing</span>
                    </div>
                    <span className={`text-[10px] ${healthTrackingEnabled ? 'text-positive' : 'text-foreground-muted'}`}>
                        {healthTrackingEnabled ? 'Granted' : 'Withdrawn'}
                    </span>
                </div>
            </div>

            {healthTrackingEnabled && (
                !showWithdrawConfirm ? (
                    <button onClick={() => setShowWithdrawConfirm(true)} className="w-full py-2.5 border border-accent-orange/30 text-accent-orange rounded-md hover:bg-accent-orange/10 text-xs flex items-center justify-center gap-2">
                        <ShieldOff className="w-3.5 h-3.5" /> Withdraw Health Data Consent
                    </button>
                ) : (
                    <div className="bg-accent-orange/10 border border-accent-orange/20 rounded-md p-4">
                        <p className="text-foreground-secondary text-xs mb-3 leading-relaxed">
                            <strong>Warning:</strong> Withdrawing health data consent will permanently delete all your activities, fitness metrics, health logs, supplements, and nutrition data.
                        </p>
                        <div className="flex gap-2">
                            <button onClick={() => setShowWithdrawConfirm(false)} className="flex-1 py-2 bg-background-tertiary text-foreground text-xs rounded-md hover:bg-surface-hover">Cancel</button>
                            <button
                                onClick={async () => {
                                    setIsWithdrawing(true);
                                    try {
                                        const res = await fetch('/api/user/consent', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ consentType: 'HEALTH_DATA', action: 'WITHDRAWN' }),
                                        });
                                        if (!res.ok) throw new Error('Failed');
                                        setHealthTrackingEnabled(false);
                                        setShowWithdrawConfirm(false);
                                        setMessage('Consent withdrawn. Health data deleted.');
                                        queryClient.invalidateQueries();
                                    } catch { setMessage('Failed to withdraw consent.'); }
                                    finally { setIsWithdrawing(false); }
                                }}
                                disabled={isWithdrawing}
                                className="flex-1 py-2 bg-accent-orange hover:bg-accent-orange/90 text-white text-xs rounded-lg flex items-center justify-center gap-1 font-medium"
                            >
                                {isWithdrawing ? 'Processing...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                )
            )}

            {message && <p className={`text-sm ${message.includes('Failed') ? 'text-negative' : 'text-positive'}`}>{message}</p>}
        </div>
    );
}
