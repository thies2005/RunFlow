'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Mail, Lock, User, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import VerificationModal from '@/components/auth/VerificationModal';

export default function RegisterPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [showVerification, setShowVerification] = useState(false);

    const [termsAccepted, setTermsAccepted] = useState(false);
    const [healthAccepted, setHealthAccepted] = useState(false);

    const passwordRequirements = [
        { label: 'At least 8 characters', met: password.length >= 8 },
        { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
        { label: 'One lowercase letter', met: /[a-z]/.test(password) },
        { label: 'One number', met: /[0-9]/.test(password) },
    ];

    const allRequirementsMet = passwordRequirements.every(r => r.met);
    const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!allRequirementsMet) {
            setError('Please meet all password requirements');
            return;
        }

        if (!termsAccepted || !healthAccepted) {
            setError('You must accept the terms and consent to data processing');
            return;
        }

        if (!passwordsMatch) {
            setError('Passwords do not match');
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, name: name || undefined }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Registration failed');
                return;
            }

            // Auto-login after successful registration
            const loginResult = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (loginResult?.error) {
                setError('Account created, but login failed. Please try logging in.');
            } else {
                // Log GDPR consents to the database for Art. 7(1) proof
                try {
                    const consentTypes = ['TERMS', 'PRIVACY', 'HEALTH_DATA'];
                    await Promise.all(consentTypes.map(type =>
                        fetch('/api/user/consent', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ consentType: type, action: 'GRANTED' }),
                        })
                    ));
                } catch (consentErr) {
                    console.error('Failed to log consent:', consentErr);
                }
                // Instead of redirecting immediately, show verification modal
                setShowVerification(true);
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <div className="flex-1 flex items-center justify-center px-4 py-8">
                <div className="max-w-md w-full">
                    {/* Logo */}
                    <div className="text-center mb-8">
                        <Image
                            src="/icons/app-icon-192.png"
                            alt="RunFlow"
                            width={64}
                            height={64}
                            className="rounded-xl mx-auto mb-4"
                        />
                        <h1 className="text-3xl font-bold text-foreground mb-2">
                            Create your account
                        </h1>
                        <p className="text-foreground-muted">
                            Join RunFlow to track your running performance
                        </p>
                    </div>

                    <form onSubmit={handleRegister} className="space-y-4">
                        {/* Name (optional) */}
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Name (optional)"
                                className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-foreground placeholder:text-foreground-muted focus:ring-2 focus:ring-accent-orange outline-none"
                            />
                        </div>

                        {/* Email */}
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email address"
                                className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-foreground placeholder:text-foreground-muted focus:ring-2 focus:ring-accent-orange outline-none"
                                required
                            />
                        </div>

                        {/* Password */}
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                                className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-foreground placeholder:text-foreground-muted focus:ring-2 focus:ring-accent-orange outline-none"
                                required
                            />
                        </div>

                        {/* Password Requirements */}
                        {password.length > 0 && (
                            <div className="glass-card p-3 space-y-1">
                                {passwordRequirements.map((req, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-sm">
                                        <Check className={`w-4 h-4 ${req.met ? 'text-green-500' : 'text-gray-500'}`} />
                                        <span className={req.met ? 'text-green-400' : 'text-foreground-muted'}>
                                            {req.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Confirm Password */}
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm password"
                                className={`w-full bg-white/5 border rounded-lg py-3 pl-10 pr-4 text-foreground placeholder:text-foreground-muted focus:ring-2 focus:ring-accent-orange outline-none ${confirmPassword.length > 0
                                    ? passwordsMatch
                                        ? 'border-green-500/50'
                                        : 'border-red-500/50'
                                    : 'border-white/10'
                                    }`}
                                required
                            />
                        </div>

                        {error && (
                            <p className="text-red-400 text-sm text-center">{error}</p>
                        )}

                        <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-3 text-left">
                            <label className="flex items-start gap-3 cursor-pointer group">
                                <div className="relative flex items-start pt-0.5">
                                    <input
                                        type="checkbox"
                                        className="peer sr-only"
                                        checked={termsAccepted}
                                        onChange={(e) => setTermsAccepted(e.target.checked)}
                                    />
                                    <div className="w-5 h-5 rounded border-2 border-white/20 peer-focus:border-accent-orange peer-checked:bg-accent-orange peer-checked:border-accent-orange transition-all flex items-center justify-center">
                                        <svg className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                </div>
                                <span className="text-sm text-gray-300 leading-tight">
                                    I have read and agree to the <Link href="/terms" className="text-orange-500 hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-orange-500 hover:underline">Privacy Policy</Link>.
                                </span>
                            </label>

                            <label className="flex items-start gap-3 cursor-pointer group">
                                <div className="relative flex items-start pt-0.5">
                                    <input
                                        type="checkbox"
                                        className="peer sr-only"
                                        checked={healthAccepted}
                                        onChange={(e) => setHealthAccepted(e.target.checked)}
                                    />
                                    <div className="w-5 h-5 rounded border-2 border-white/20 peer-focus:border-accent-orange peer-checked:bg-accent-orange peer-checked:border-accent-orange transition-all flex items-center justify-center">
                                        <svg className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                </div>
                                <span className="text-sm text-gray-300 leading-tight">
                                    I consent to the processing of my health and fitness data (GDPR Art. 9) for training analytics.
                                </span>
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !allRequirementsMet || !passwordsMatch || !termsAccepted || !healthAccepted}
                            className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Creating account...' : 'Create Account'}
                            {!isLoading && <ArrowRight className="w-4 h-4" />}
                        </button>

                        <div className="text-center space-y-2">
                            <p className="text-sm text-foreground-muted">
                                Already have an account?{' '}
                                <Link href="/login" className="text-accent-orange hover:underline">
                                    Sign in
                                </Link>
                            </p>
                            <Link
                                href="/login"
                                className="inline-flex items-center gap-1 text-sm text-foreground-muted hover:text-foreground"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to login
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
            <VerificationModal
                isOpen={showVerification}
                onClose={() => {
                    setShowVerification(false);
                    router.push('/onboarding');
                }}
                email={email}
                onVerified={() => {
                    setShowVerification(false);
                    router.push('/onboarding');
                }}
            />
        </div>
    );

}
