'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function AdminLoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
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
            <div className="max-w-md w-full bg-background-secondary rounded border border-line overflow-hidden">
                <div className="topbar p-7 border-b border-line text-center">
                    <div className="w-12 h-12 bg-[color:var(--topbar-line)] rounded border border-white/10 flex items-center justify-center mx-auto mb-3">
                        <Shield className="w-6 h-6 text-accent-orange" aria-hidden="true" />
                    </div>
                    <h1 className="text-xl font-bold tracking-tight text-[color:var(--topbar-fg)]">Admin Portal</h1>
                    <p className="font-mono text-xs uppercase tracking-widest text-[color:var(--topbar-muted)] mt-1.5">
                        Restricted Access Only
                    </p>
                </div>

                <div className="p-7">
                    <form onSubmit={handleLogin} className="space-y-5">
                        {error && (
                            <div role="alert" className="bg-negative/10 text-negative p-3 rounded text-sm border border-negative/30">
                                {error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="admin-username" className="block text-sm font-medium text-foreground-secondary mb-1.5">
                                Username
                            </label>
                            <input
                                id="admin-username"
                                name="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                autoComplete="username"
                                autoCapitalize="none"
                                autoCorrect="off"
                                spellCheck={false}
                                className="w-full px-3.5 py-2 bg-background border border-line rounded focus:ring-2 focus:ring-accent-orange focus:border-accent-orange outline-hidden transition-colors"
                                placeholder="Enter admin username"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="admin-password" className="block text-sm font-medium text-foreground-secondary mb-1.5">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted pointer-events-none" aria-hidden="true" />
                                <input
                                    id="admin-password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                    className="w-full pl-9 pr-10 py-2 bg-background border border-line rounded focus:ring-2 focus:ring-accent-orange focus:border-accent-orange outline-hidden transition-colors"
                                    placeholder="••••••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    aria-pressed={showPassword}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-foreground-muted hover:text-foreground rounded transition-colors"
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-4 h-4" aria-hidden="true" />
                                    ) : (
                                        <Eye className="w-4 h-4" aria-hidden="true" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full bg-accent-orange hover:bg-accent-orange/90 text-white py-2.5 rounded font-semibold transition flex items-center justify-center ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {loading ? (
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" aria-hidden="true" />
                            ) : (
                                <ArrowRight className="w-4 h-4 mr-2" aria-hidden="true" />
                            )}
                            {loading ? 'Authenticating...' : 'Access Dashboard'}
                        </button>
                    </form>

                    <p className="mt-5 text-center font-mono text-[11px] uppercase tracking-wider text-foreground-muted">
                        Secure Environment • IP Logged
                    </p>
                </div>
            </div>
        </div>
    );
}
