
import { useState } from 'react';
import { Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';

interface ForgotPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type Step = 'EMAIL' | 'CODE_PASSWORD';

export default function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
    const [step, setStep] = useState<Step>('EMAIL');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [passwordStrength, setPasswordStrength] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    const checkPasswordStrength = (pass: string) => {
        let strength = 0;
        if (pass.length > 7) strength += 1;
        if (/[A-Z]/.test(pass)) strength += 1;
        if (/[0-9]/.test(pass)) strength += 1;
        if (/[^A-Za-z0-9]/.test(pass)) strength += 1;
        setPasswordStrength(strength);
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setNewPassword(val);
        checkPasswordStrength(val);
    };

    if (!isOpen) return null;

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            // Should always succeed to prevent enumeration, unless error is 500
            if (!res.ok) throw new Error('Failed to send request');

            setStep('CODE_PASSWORD');
            toast.success('Reset code sent!');
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code, password: newPassword }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Reset failed');
            }

            toast.success('Password reset successfully! Please log in.');
            onClose();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} maxWidth="md" title={step === 'EMAIL' ? 'Reset Password' : 'New Password'}>
            <div className="mb-6">
                {step === 'CODE_PASSWORD' && (
                    <button
                        onClick={() => setStep('EMAIL')}
                        className="text-foreground-muted hover:text-foreground mb-2 flex items-center gap-1 text-sm transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                )}
                <p className="text-foreground-secondary mt-2 text-sm">
                    {step === 'EMAIL'
                        ? "Enter your email address and we'll send you a verification code."
                        : "Enter the code sent to your email and your new password."
                    }
                </p>
            </div>

            {step === 'EMAIL' ? (
                <form onSubmit={handleSendCode} className="space-y-4">
                    <div>
                        <label htmlFor="recovery-email" className="block text-sm font-medium text-foreground-secondary mb-1">Email</label>
                        <input
                            id="recovery-email" autoComplete="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 bg-background-secondary border border-line rounded-md focus:ring-2 focus:ring-accent-orange outline-hidden transition-colors"
                            placeholder="you@example.com"
                            required
                        />
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2 px-4 text-sm font-medium text-foreground bg-background-tertiary hover:bg-surface-hover rounded-md transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || !email}
                            className="flex-1 py-2 px-4 text-sm font-medium btn-primary disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors flex items-center justify-center gap-2"
                        >
                            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                            Send Code
                        </button>
                    </div>
                </form>
            ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                    <div>
                        <label htmlFor="recovery-code" className="block text-sm font-medium text-foreground-secondary mb-1">Verification Code</label>
                        <input
                            id="recovery-code" autoComplete="one-time-code"
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            className="w-full text-center font-mono tracking-widest px-3 py-2 bg-background-secondary border border-line rounded-md focus:ring-2 focus:ring-accent-orange outline-hidden uppercase"
                            placeholder="XCV123"
                            maxLength={6}
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="recovery-password" className="block text-sm font-medium text-foreground-secondary mb-1">New Password</label>
                        <input
                            id="recovery-password" autoComplete="new-password" aria-describedby="recovery-rules"
                            type="password"
                            value={newPassword}
                            onChange={handlePasswordChange}
                            className="w-full px-3 py-2 bg-background-secondary border border-line rounded-md focus:ring-2 focus:ring-accent-orange outline-hidden transition-colors"
                            placeholder="••••••••"
                            required
                        />
                        <p id="recovery-rules" className="text-sm text-foreground-secondary mt-1">Use at least 8 characters, including uppercase and lowercase letters, a number, and a special character. Avoid common patterns such as password, 123456, qwerty, admin, and test.</p>
                        {newPassword && (
                            <div className="mt-2">
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4].map(level => (
                                        <div
                                            key={level}
                                            className={`h-1.5 flex-1 rounded-full ${passwordStrength >= level
                                                ? (passwordStrength < 2 ? 'bg-negative'
                                                    : passwordStrength < 3 ? 'bg-workout-tempo'
                                                        : passwordStrength < 4 ? 'bg-accent-blue'
                                                            : 'bg-positive')
                                                : 'bg-background-tertiary'
                                                }`}
                                        />
                                    ))}
                                </div>
                                <p className="text-xs text-foreground-muted mt-1 font-medium">
                                    {passwordStrength === 0 ? 'Too short' : passwordStrength < 2 ? 'Weak' : passwordStrength < 3 ? 'Fair' : passwordStrength < 4 ? 'Good' : 'Strong'}
                                </p>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2 px-4 text-sm font-medium text-foreground bg-background-tertiary hover:bg-surface-hover rounded-md transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || code.length !== 6 || !newPassword}
                            className="flex-1 py-2 px-4 text-sm font-medium btn-primary disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors flex items-center justify-center gap-2"
                        >
                            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                            Reset Password
                        </button>
                    </div>
                </form>
            )}
        </Modal>
    );
}
