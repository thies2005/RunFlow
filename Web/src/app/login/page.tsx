'use client';

import { signIn, useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Target, TrendingUp, Zap, Mail, Lock, ArrowRight } from 'lucide-react';
import Image from 'next/image';
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
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse text-gray-400">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Hero section */}
            <div className="flex-1 flex items-center justify-center px-4">
                <div className="max-w-md w-full text-center">
                    {/* Logo */}
                    <Image
                        src="/icons/app-icon-192.png"
                        alt="RunFlow"
                        width={80}
                        height={80}
                        className="rounded-2xl mx-auto mb-8 animate-pulse-glow"
                    />

                    <h1 className="text-4xl font-bold text-foreground mb-4">
                        RunFlow
                    </h1>
                    <p className="text-xl text-foreground-muted mb-8">
                        Your running performance dashboard
                    </p>

                    {/* Features */}
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="glass-card p-4 text-center">
                            <Activity className="w-6 h-6 text-cyan-500 mx-auto mb-2" />
                            <p className="text-sm text-foreground-muted">Activity Sync</p>
                        </div>
                        <div className="glass-card p-4 text-center">
                            <Target className="w-6 h-6 text-pink-500 mx-auto mb-2" />
                            <p className="text-sm text-foreground-muted">Race Goals</p>
                        </div>
                        <div className="glass-card p-4 text-center">
                            <TrendingUp className="w-6 h-6 text-green-500 mx-auto mb-2" />
                            <p className="text-sm text-foreground-muted">VDOT Tracking</p>
                        </div>
                        <div className="glass-card p-4 text-center">
                            <Zap className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                            <p className="text-sm text-foreground-muted">CTL/ATL/TSB</p>
                        </div>
                    </div>

                    {/* Auth Mode Tabs */}
                    <div className="flex rounded-lg bg-white/5 p-1 mb-6">
                        <button
                            onClick={() => setAuthMode('strava')}
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${authMode === 'strava'
                                ? 'bg-accent-orange text-white'
                                : 'text-foreground-muted hover:text-foreground'
                                }`}
                        >
                            Strava
                        </button>
                        <button
                            onClick={() => setAuthMode('email')}
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${authMode === 'email'
                                ? 'bg-accent-orange text-white'
                                : 'text-foreground-muted hover:text-foreground'
                                }`}
                        >
                            Email
                        </button>
                    </div>

                    {/* Strava Login */}
                    {authMode === 'strava' && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="flex justify-center">
                                <ConnectWithStravaButton
                                    onClick={() => signIn('strava', { callbackUrl: '/' })}
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
                                <p className="text-red-400 text-sm">{error}</p>
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

            {/* Footer */}
            <footer className="py-6 text-center">
                <p className="text-foreground-muted text-sm">
                    RunFlow respects your privacy. We only read your activity data.
                </p>
            </footer>

            <ForgotPasswordModal
                isOpen={showForgotPwd}
                onClose={() => setShowForgotPwd(false)}
            />
        </div >
    );
}
