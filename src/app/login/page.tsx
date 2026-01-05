'use client';

import { signIn, useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Target, TrendingUp, Zap } from 'lucide-react';

export default function LoginPage() {
    const { status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === 'authenticated') {
            router.push('/');
        }
    }, [status, router]);

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
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-orange to-accent-pink flex items-center justify-center mx-auto mb-8 animate-pulse-glow">
                        <span className="text-4xl">🏃</span>
                    </div>

                    <h1 className="text-4xl font-bold text-white mb-4">
                        RunFlow
                    </h1>
                    <p className="text-xl text-gray-400 mb-8">
                        Your running performance dashboard
                    </p>

                    {/* Features */}
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="glass-card p-4 text-center">
                            <Activity className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-300">Strava Sync</p>
                        </div>
                        <div className="glass-card p-4 text-center">
                            <Target className="w-6 h-6 text-pink-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-300">Race Goals</p>
                        </div>
                        <div className="glass-card p-4 text-center">
                            <TrendingUp className="w-6 h-6 text-green-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-300">VDOT Tracking</p>
                        </div>
                        <div className="glass-card p-4 text-center">
                            <Zap className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-300">CTL/ATL/TSB</p>
                        </div>
                    </div>

                    {/* Strava login button */}
                    <button
                        onClick={() => signIn('strava', { callbackUrl: '/' })}
                        className="btn-strava w-full text-lg"
                    >
                        <svg
                            className="w-6 h-6"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066l-2.084 4.116z" />
                            <path
                                d="M7.778 13.828h2.89L7.778 8.206l-2.89 5.622h2.89zM7.778 0L0 15.38h4.192l3.586-7.052 3.578 7.052h4.192L7.778 0z"
                                opacity=".6"
                            />
                        </svg>
                        Connect with Strava
                    </button>

                    <p className="text-sm text-gray-500 mt-6">
                        We&apos;ll sync your activities to provide personalized training insights
                    </p>
                </div>
            </div>

            {/* Footer */}
            <footer className="py-6 text-center">
                <p className="text-gray-600 text-sm">
                    RunFlow respects your privacy. We only read your activity data.
                </p>
            </footer>
        </div>
    );
}
