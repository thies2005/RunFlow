'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, ArrowRight } from 'lucide-react';

export default function AdminLoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Login failed');
            }

            // Login successful
            router.push('/admin');

        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('An unexpected error occurred');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-background-secondary rounded-md border border-line overflow-hidden">
                <div className="topbar p-8 text-center">
                    <div className="w-16 h-16 bg-[color:var(--topbar-line)] rounded-full flex items-center justify-center mx-auto mb-4">
                        <Shield className="w-8 h-8 text-[color:var(--topbar-fg)]" />
                    </div>
                    <h1 className="text-2xl font-bold text-[color:var(--topbar-fg)]">Admin Portal</h1>
                    <p className="text-[color:var(--topbar-muted)] mt-2">Restricted Access Only</p>
                </div>

                <div className="p-8">
                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div className="bg-negative/10 text-negative p-3 rounded-md text-sm border border-negative/30">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-foreground-secondary mb-1">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-2 bg-background-secondary border border-line rounded-md focus:ring-2 focus:ring-accent-orange focus:border-accent-orange outline-hidden transition-colors"
                                placeholder="Enter admin username"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground-secondary mb-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-2.5 w-5 h-5 text-foreground-muted" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-background-secondary border border-line rounded-md focus:ring-2 focus:ring-accent-orange focus:border-accent-orange outline-hidden transition-colors"
                                    placeholder="••••••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full bg-accent-orange hover:bg-accent-orange/90 text-white py-3 rounded-md font-semibold transition flex items-center justify-center ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {loading ? (
                                <span className="w-5 h-5 border-2 border-foreground/30 border-t-white rounded-full animate-spin mr-2" />
                            ) : (
                                <ArrowRight className="w-5 h-5 mr-2" />
                            )}
                            {loading ? 'Authenticating...' : 'Access Dashboard'}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-xs text-foreground-muted">
                        Secure Environment • Ip Logged
                    </p>
                </div>
            </div>
        </div>
    );
}
