
import { useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';

interface VerificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    email: string;
    onVerified: () => void;
}

export default function VerificationModal({ isOpen, onClose, email, onVerified }: VerificationModalProps) {
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const handleCodeChange = (index: number, value: string) => {
        const newValue = value.toUpperCase();
        const currentCodeArray = code.split('').concat(Array(6).fill('')).slice(0, 6);

        // Handle paste event (values longer than 1 character)
        if (newValue.length > 1) {
            const pastedCode = newValue.slice(0, 6);
            setCode(pastedCode);
            if (pastedCode.length === 6) {
                inputRefs.current[5]?.focus();
            } else {
                inputRefs.current[pastedCode.length]?.focus();
            }
            return;
        }

        currentCodeArray[index] = newValue;
        const newCode = currentCodeArray.join('');
        setCode(newCode);

        if (newValue && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const res = await fetch('/api/auth/verify-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Verification failed');
            }

            toast.success('Email verified successfully!');
            onVerified();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} maxWidth="md" hideCloseButton>
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Verify Code</h2>
                <p className="text-zinc-500 dark:text-zinc-400 mt-2">
                    We sent a 6-digit code to <span className="font-medium text-zinc-900 dark:text-zinc-200">{email}</span>
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex justify-center gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <input
                            key={i}
                            ref={(el) => { inputRefs.current[i] = el; }}
                            type="text"
                            value={code[i] || ''}
                            onChange={(e) => handleCodeChange(i, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(i, e)}
                            className="w-12 h-14 text-center text-2xl font-semibold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none uppercase transition-all"
                            maxLength={6}
                        />
                    ))}
                </div>

                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2.5 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading || code.length !== 6}
                        className="flex-1 py-2.5 px-4 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:text-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Verify
                    </button>
                </div>
            </form>
        </Modal>
    );
}
