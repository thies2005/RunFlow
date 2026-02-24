
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
        <Modal isOpen={isOpen} onClose={onClose} maxWidth="md" hideCloseButton>
            <div className="mb-6">
                {step === 'CODE_PASSWORD' && (
                    <button
                        onClick={() => setStep('EMAIL')}
                        className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 mb-2 flex items-center gap-1 text-sm transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                )}
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
                    {step === 'EMAIL' ? 'Reset Password' : 'New Password'}
                </h2>
                <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm">
                    {step === 'EMAIL'
                        ? "Enter your email address and we'll send you a verification code."
                        : "Enter the code sent to your email and your new password."
                    }
                </p>
            </div>

            {step === 'EMAIL' ? (
                <form onSubmit={handleSendCode} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="you@example.com"
                            required
                        />
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || !email}
                            className="flex-1 py-2 px-4 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                            Send Code
                        </button>
                    </div>
                </form>
            ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Verification Code</label>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            className="w-full text-center font-mono tracking-widest px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                            placeholder="XCV123"
                            maxLength={6}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">New Password</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={handlePasswordChange}
                            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="••••••••"
                            required
                        />
                        {newPassword && (
                            <div className="mt-2">
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4].map(level => (
                                        <div
                                            key={level}
                                            className={`h-1.5 flex-1 rounded-full ${passwordStrength >= level
                                                ? (passwordStrength < 2 ? 'bg-red-500'
                                                    : passwordStrength < 3 ? 'bg-yellow-500'
                                                        : passwordStrength < 4 ? 'bg-blue-500'
                                                            : 'bg-green-500')
                                                : 'bg-zinc-200 dark:bg-zinc-800'
                                                }`}
                                        />
                                    ))}
                                </div>
                                <p className="text-xs text-zinc-500 mt-1 font-medium">
                                    {passwordStrength === 0 ? 'Too short' : passwordStrength < 2 ? 'Weak' : passwordStrength < 3 ? 'Fair' : passwordStrength < 4 ? 'Good' : 'Strong'}
                                </p>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || code.length !== 6 || !newPassword}
                            className="flex-1 py-2 px-4 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
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
