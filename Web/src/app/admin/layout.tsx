/**
 * Admin Layout
 * 
 * Provides consistent structure for admin pages.
 * Enforces authentication via middleware (to be implemented) or client-side check.
 */
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Shield, LayoutDashboard, Database, LogOut, Menu, X } from 'lucide-react';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const navItems = [
        { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/admin?tab=backups', label: 'Backups', icon: Database },
    ];

    const handleLogout = async () => {
        document.cookie = 'runflow_admin_token=; Max-Age=0; path=/;';
        router.push('/admin/login');
    };

    const closeMobileMenu = () => setMobileMenuOpen(false);

    // Skip layout for login page
    if (pathname === '/admin/login') {
        return <>{children}</>;
    }

    return (
        <div className="h-screen w-full flex overflow-hidden bg-gray-50 text-gray-900">
            {/* Mobile Sidebar Overlay */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={closeMobileMenu}
                />
            )}

            {/* Sidebar - Hidden on mobile, visible on desktop */}
            <aside className={`
                fixed inset-y-0 left-0 z-50
                w-64 bg-slate-900 text-slate-300 flex flex-col
                transition-transform duration-300 ease-in-out
                ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
                md:translate-x-0 md:static md:z-0
            `}>
                <div className="p-6 flex items-center space-x-2 border-b border-slate-700">
                    <Shield className="w-8 h-8 text-emerald-500" />
                    <span className="text-xl font-bold text-white">Admin</span>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={closeMobileMenu}
                                className={`
                                    flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors
                                    ${isActive
                                        ? 'bg-emerald-600 text-white'
                                        : 'text-slate-300 hover:bg-slate-800'
                                    }
                                `}
                            >
                                <Icon className="w-5 h-5" />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-700">
                    <button
                        onClick={handleLogout}
                        className="flex items-center space-x-3 px-4 py-3 w-full text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        <span>Logout</span>
                    </button>
                    <div className="mt-4 px-4 text-xs text-slate-500">
                        RunFlow Admin v1.0
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top Header */}
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 shrink-0 z-10">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                            aria-label="Toggle menu"
                        >
                            {mobileMenuOpen ? (
                                <X className="w-6 h-6" />
                            ) : (
                                <Menu className="w-6 h-6" />
                            )}
                        </button>
                        <h1 className="text-lg font-semibold text-gray-900">
                            Admin Dashboard
                        </h1>
                    </div>
                </header>

                {/* Scrollable Content Area */}
                <main className="flex-1 overflow-y-auto p-4 md:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
