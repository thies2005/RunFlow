import React from 'react';
import { UserPlus, Lock, AlertTriangle } from 'lucide-react';
import { csrfHeaders } from '@/lib/admin/csrfHelper';

interface SignupAccessControlProps {
    allowSignups?: boolean;
    envAllowSignups?: boolean;
    processing: boolean;
    setProcessing: (_val: boolean) => void;
    setActionMessage: (_msg: { type: 'success' | 'error'; text: string } | null) => void;
    onUpdated: (_newValue: boolean) => void;
    title?: string;
}

export default function SignupAccessControl({
    allowSignups = true,
    envAllowSignups = true,
    processing,
    setProcessing,
    setActionMessage,
    onUpdated,
    title = 'User Registration (Signups)',
}: SignupAccessControlProps) {
    const isEnvDisabled = envAllowSignups === false;
    const isEffectivelyAllowed = !isEnvDisabled && allowSignups;

    const statusBadge = isEnvDisabled
        ? { label: 'Disabled by ENV (ALLOW_SIGNUPS=false)', className: 'bg-negative/10 text-negative border border-negative/30' }
        : isEffectivelyAllowed
            ? { label: 'Enabled', className: 'bg-positive/10 text-positive border border-positive/30' }
            : { label: 'Disabled by Admin', className: 'bg-background-tertiary text-foreground-muted border border-line' };

    const handleToggle = async () => {
        if (isEnvDisabled || processing) return;

        const nextValue = !allowSignups;
        setProcessing(true);
        setActionMessage(null);

        try {
            const res = await fetch('/api/admin/ai-settings', {
                method: 'PUT',
                headers: csrfHeaders(),
                body: JSON.stringify({ allowSignups: nextValue }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.error || 'Failed to update signup setting');
            }

            setActionMessage({
                type: 'success',
                text: nextValue ? 'New user signups enabled' : 'New user signups disabled',
            });
            onUpdated(nextValue);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to update signup setting';
            setActionMessage({ type: 'error', text: message });
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="bg-background-secondary p-4 sm:p-5 rounded-md border border-line space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <UserPlus className="w-5 h-5 text-foreground-muted" />
                        <h3 className="font-semibold text-foreground">{title}</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.className}`}>
                            {statusBadge.label}
                        </span>
                    </div>
                    <p className="text-sm text-foreground-muted">
                        Control whether new users can create accounts via email registration or Strava sign-in. Existing users can always sign in.
                    </p>
                </div>

                <button
                    type="button"
                    role="switch"
                    aria-checked={isEffectivelyAllowed}
                    aria-label="Allow new user signups"
                    disabled={isEnvDisabled || processing}
                    onClick={handleToggle}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-hidden focus:ring-2 focus:ring-accent-orange focus:ring-offset-2 ${
                        isEffectivelyAllowed ? 'bg-accent-orange' : 'bg-line-strong'
                    } ${isEnvDisabled || processing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            isEffectivelyAllowed ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                </button>
            </div>

            {isEnvDisabled && (
                <div className="flex items-start gap-2.5 p-3 rounded-md bg-negative/10 border border-negative/30 text-xs text-negative">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <p className="font-medium flex items-center gap-1">
                            <Lock className="w-3.5 h-3.5" />
                            Environment Override Active
                        </p>
                        <p>
                            Signups are hard-disabled by the <code className="font-mono font-semibold">ALLOW_SIGNUPS</code> environment variable. Set <code className="font-mono font-semibold">ALLOW_SIGNUPS=true</code> (or <code className="font-mono font-semibold">yes</code>) in the server environment to allow toggling signups in the admin panel.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
