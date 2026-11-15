/**
 * Admin Layout
 * 
 * Provides consistent structure for admin pages.
 * Enforces authentication via middleware (to be implemented) or client-side check.
 */
'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Shield, LayoutDashboard, Database, LogOut, Menu, X, Users, Sliders, BarChart3, ClipboardList, ArrowRightLeft, Cpu, Activity, ListChecks } from 'lucide-react';
import { csrfHeaders } from '@/lib/admin/csrfHelper';
import { ThemeToggle } from '@/components/ThemeToggle';

function AdminLayoutContent({
    children,
    pathname,
}: {
    children: React.ReactNode;
    pathname: string;
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentTab = searchParams.get('tab');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const getActiveState = (href: string, tab: string | null) => {
        if (tab === null) return href === '/admin';
        return href.includes(`tab=${tab}`);
    };

    const navItems = [
        { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, tab: null },
        { href: '/admin?tab=users', label: 'Users', icon: Users, tab: 'users' },
        { href: '/admin?tab=analytics', label: 'Analytics', icon: BarChart3, tab: 'analytics' },
        { href: '/admin?tab=templates', label: 'Workout Templates', icon: ListChecks, tab: 'templates' },
        { href: '/admin?tab=ai', label: 'AI Settings', icon: Sliders, tab: 'ai' },
        { href: '/admin?tab=feedback-queue', label: 'Feedback Queue', icon: Activity, tab: 'feedback-queue' },
        { href: '/admin?tab=performance', label: 'Performance', icon: Cpu, tab: 'performance' },
        { href: '/admin?tab=audit', label: 'Audit Trail', icon: ClipboardList, tab: 'audit' },
        { href: '/admin?tab=migration', label: 'Migration', icon: ArrowRightLeft, tab: 'migration' },
        { href: '/admin?tab=backups', label: 'Backups', icon: Database, tab: 'backups' },
    ];

    const closeMobileMenu = () => setMobileMenuOpen(false);

    if (pathname === '/admin/login') {
        return <>{children}</>;
    }

    return (
        <div className="h-screen w-full flex overflow-hidden bg-background text-foreground">
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={closeMobileMenu}
                    aria-hidden="true"
                />
            )}

            <aside className={`
                fixed inset-y-0 left-0 z-50
                w-64 bg-background-secondary text-foreground-secondary border-r border-line flex flex-col
                transition-transform duration-300 ease-in-out
                ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
                md:translate-x-0 md:static md:z-0
            `}>
                <div className="h-14 px-5 flex items-center space-x-2.5 border-b border-line shrink-0">
                    <Shield className="w-5 h-5 text-accent-orange" aria-hidden="true" />
                    <span className="text-base font-bold tracking-tight text-foreground">RunFlow Admin</span>
                </div>

                <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Admin sections">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = getActiveState(item.href, currentTab);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={closeMobileMenu}
                                aria-current={isActive ? 'page' : undefined}
                                className={`
                                    no-underline flex items-center space-x-3 px-3 py-2.5 rounded text-sm transition-colors border-l-2
                                    ${isActive
                                        ? 'bg-background text-foreground font-medium border-l-accent-orange border-y border-r border-line'
                                        : 'border-l-transparent text-foreground-secondary hover:bg-surface-hover hover:text-foreground'
                                    }
                                `}
                            >
                                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-accent-orange' : ''}`} aria-hidden="true" />
                                <span className="text-sm font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-3 border-t border-line">
                    <button
                        type="button"
                        onClick={() => {
                            // Server-side logout: the runflow_admin_token cookie
                            // is httpOnly, so a document.cookie write can never
                            // remove it (RFC 6265). POST /api/admin/logout
                            // expires it via Set-Cookie Max-Age=0 (CSRF-protected
                            // by the login-issued cookie pair) before the
                            // redirect.
                            void (async () => {
                                try {
                                    await fetch('/api/admin/logout', {
                                        method: 'POST',
                                        headers: csrfHeaders(),
                                    });
                                } catch {
                                    // Network failure: still redirect; worst
                                    // case the cookie dies with the 2h JWT exp.
                                }
                                router.push('/admin/login');
                            })();
                        }}
                        className="flex items-center space-x-3 px-3 py-2.5 w-full text-sm text-foreground-secondary hover:bg-surface-hover hover:text-foreground rounded transition-colors"
                    >
                        <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>Logout</span>
                    </button>
                    <div className="mt-3 px-3 font-mono text-[11px] uppercase tracking-wider text-foreground-muted">
                        RunFlow Admin v1.0
                    </div>
                </div>
            </aside>

            <div className="flex-1 flex flex-col min-w-0">
                <header className="topbar h-14 sticky top-0 z-40 flex items-center justify-between px-4 md:px-6 shrink-0 border-b border-line bg-background-secondary">
                    <div className="flex items-center space-x-3">
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="topbar-btn md:hidden p-2 rounded"
                            aria-label="Toggle navigation menu"
                            aria-expanded={mobileMenuOpen}
                        >
                            {mobileMenuOpen ? (
                                <X className="w-5 h-5" aria-hidden="true" />
                            ) : (
                                <Menu className="w-5 h-5" aria-hidden="true" />
                            )}
                        </button>
                        <span className="font-mono text-xs uppercase tracking-widest text-foreground-secondary font-semibold">
                            RunFlow // Admin
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
                    {children}
                </div>
            </div>
        </div>
    );
}

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    return (
        <Suspense fallback={children}>
            <AdminLayoutContent pathname={pathname}>
                {children}
            </AdminLayoutContent>
        </Suspense>
    );
}
