'use client';

import { signIn, useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { ConnectWithStravaButton } from '@/components';
import ForgotPasswordModal from '@/components/auth/ForgotPasswordModal';

type AuthMode = 'strava' | 'email';

export default function LoginPage() {
    const { status } = useSession();
    const router = useRouter();
    const [authMode, setAuthMode] = useState<AuthMode>('strava');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [showForgotPwd, setShowForgotPwd] = useState(false);

    // Consent checkboxes for Strava (since Strava login creates an account if it doesn't exist)
    const [stravaTermsAccepted, setStravaTermsAccepted] = useState(false);
    const [stravaHealthAccepted, setStravaHealthAccepted] = useState(false);
    const [stravaAgeAccepted, setStravaAgeAccepted] = useState(false);

    useEffect(() => {
        if (status === 'authenticated') {
            router.push('/');
        }
    }, [status, router]);

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError('Invalid email or password');
            } else {
                // Redirect to home - it will handle onboarding check if needed
                router.push('/');
            }
        } catch {
            setError('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-foreground-muted">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col lg:flex-row">
            {/* Left: ink panel */}
            <div className="lg:w-1/2 bg-[color:var(--topbar-bg)] text-[color:var(--topbar-fg)] flex flex-col justify-between p-8 lg:p-16 border-b lg:border-b-0 lg:border-r border-line">
                <h1 className="text-2xl font-bold">
                    Run<span className="text-accent-orange">Flow</span>
                </h1>

                <div className="py-12 lg:py-0">
                    <p className="text-lg mb-8 max-w-sm">
                        Your running performance dashboard
                    </p>
                    <ul className="space-y-4 max-w-sm font-mono text-sm">
                        <li className="border-l-2 border-accent-orange pl-3">CTL / ATL / TSB</li>
                        <li className="border-l-2 border-accent-orange pl-3">Effective VO2max</li>
                        <li className="border-l-2 border-accent-orange pl-3">Daniels plans</li>
                    </ul>
                </div>

                <footer className="py-6 lg:py-0">
                    <p className="text-[color:var(--topbar-muted)] text-sm">
                        RunFlow respects your privacy. We only read your activity data.
                    </p>
                </footer>
            </div>

            {/* Right: auth panel */}
            <div className="lg:w-1/2 bg-background flex items-center justify-center px-4 py-12">
                <div className="max-w-md w-full text-center">
                    {/* Auth Mode Tabs */}
                    <div className="flex rounded-md border border-line bg-background-secondary p-1 mb-6">
                        <button
                            onClick={() => setAuthMode('strava')}
                            className={`flex-1 py-2 px-4 rounded-sm text-sm font-semibold transition-colors ${authMode === 'strava'
                                ? 'bg-background-tertiary text-foreground'
                                : 'text-foreground-muted hover:text-foreground'
                                }`}
                        >
                            Strava
                        </button>
                        <button
                            onClick={() => setAuthMode('email')}
                            className={`flex-1 py-2 px-4 rounded-sm text-sm font-semibold transition-colors ${authMode === 'email'
                                ? 'bg-background-tertiary text-foreground'
                                : 'text-foreground-muted hover:text-foreground'
                                }`}
                        >
                            Email
                        </button>
                    </div>

                    {/* Strava Login */}
                    {authMode === 'strava' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="bg-background-secondary p-4 rounded-md border border-line space-y-3 text-left">
                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <div className="relative flex items-start pt-0.5">
                                        <input
                                            type="checkbox"
                                            className="peer sr-only"
                                            checked={stravaTermsAccepted}
                                            onChange={(e) => setStravaTermsAccepted(e.target.checked)}
                                        />
                                        <div className="w-5 h-5 rounded-sm border border-line-strong peer-focus:border-accent-orange peer-checked:bg-accent-orange peer-checked:border-accent-orange transition-colors flex items-center justify-center">
                                            <svg className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    </div>
                                    <span className="text-sm text-foreground-secondary leading-tight">
                                        I have read and agree to the                             <Link href="/terms" className="text-foreground-secondary hover:text-foreground font-medium">Terms of Service</Link> and <Link href="/privacy" className="text-foreground-secondary hover:text-foreground font-medium">Privacy Policy</Link>.
                                    </span>
                                </label>

                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <div className="relative flex items-start pt-0.5">
                                        <input
                                            type="checkbox"
                                            className="peer sr-only"
                                            checked={stravaHealthAccepted}
                                            onChange={(e) => setStravaHealthAccepted(e.target.checked)}
                                        />
                                        <div className="w-5 h-5 rounded-sm border border-line-strong peer-focus:border-accent-orange peer-checked:bg-accent-orange peer-checked:border-accent-orange transition-colors flex items-center justify-center">
                                            <svg className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    </div>
                                    <span className="text-sm text-foreground-secondary leading-tight">
                                        I consent to the processing of my health and fitness data (GDPR Art. 9) for training analytics.
                                    </span>
                                </label>

                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <div className="relative flex items-start pt-0.5">
                                        <input
                                            type="checkbox"
                                            className="peer sr-only"
                                            checked={stravaAgeAccepted}
                                            onChange={(e) => setStravaAgeAccepted(e.target.checked)}
                                        />
                                        <div className="w-5 h-5 rounded-sm border border-line-strong peer-focus:border-accent-orange peer-checked:bg-accent-orange peer-checked:border-accent-orange transition-colors flex items-center justify-center">
                                            <svg className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    </div>
                                    <span className="text-sm text-foreground-secondary leading-tight">
                                        I confirm that I am at least 16 years old.
                                    </span>
                                </label>
                            </div>

                            <div className="flex justify-center">
                                <ConnectWithStravaButton
                                    onClick={() => {
                                        // Store pending consent in localStorage before OAuth redirect
                                        localStorage.setItem('pendingConsent', JSON.stringify({
                                            types: ['TERMS', 'PRIVACY', 'HEALTH_DATA', 'AGE_REQUIREMENT'],
                                            action: 'GRANTED',
                                            timestamp: new Date().toISOString(),
                                        }));
                                        signIn('strava', { callbackUrl: '/' });
                                    }}
                                    disabled={!stravaTermsAccepted || !stravaHealthAccepted || !stravaAgeAccepted}
                                />
                            </div>
                            <p className="text-sm text-foreground-muted">
                                We&apos;ll sync your activities to provide personalized training insights
                            </p>
                        </div>
                    )}

                    {/* Email Login */}
                    {authMode === 'email' && (
                        <form onSubmit={handleEmailLogin} className="space-y-4 animate-fade-in">
                            <div className="relative">
                                <label htmlFor="login-email" className="sr-only">Email</label>
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
                                <input
                                    id="login-email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Email address"
                                    className="w-full bg-background-secondary border border-line rounded-md py-3 pl-10 pr-4 text-foreground placeholder:text-foreground-muted focus:ring-2 focus:ring-accent-orange outline-hidden"
                                    required
                                />
                            </div>
                            <div className="relative">
                                <label htmlFor="login-password" className="sr-only">Password</label>
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
                                <input
                                    id="login-password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Password"
                                    className="w-full bg-background-secondary border border-line rounded-md py-3 pl-10 pr-4 text-foreground placeholder:text-foreground-muted focus:ring-2 focus:ring-accent-orange outline-hidden"
                                    required
                                />
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => setShowForgotPwd(true)}
                                    className="text-xs text-accent-orange hover:underline"
                                >
                                    Forgot password?
                                </button>
                            </div>

                            {error && (
                                <p className="text-negative text-sm">{error}</p>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                            >
                                {isLoading ? 'Signing in...' : 'Sign In'}
                                {!isLoading && <ArrowRight className="w-4 h-4" />}
                            </button>

                            <p className="text-sm text-foreground-muted">
                                Don&apos;t have an account?{' '}
                                <Link href="/register" className="text-accent-orange hover:underline">
                                    Create one
                                </Link>
                            </p>
                        </form>
                    )}
                </div>
            </div>

            <ForgotPasswordModal
                isOpen={showForgotPwd}
                onClose={() => setShowForgotPwd(false)}
            />
        </div >
    );
}
