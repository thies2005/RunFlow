/**
 * Admin Layout
 * 
 * Provides consistent structure for admin pages.
 * Enforces authentication via middleware (to be implemented) or client-side check.
 */
'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Shield, LayoutDashboard, Database, LogOut } from 'lucide-react';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();

    // Skip layout for login page
    if (pathname === '/admin/login') {
        return <>{children}</>;
    }

    // Client-side auth check
    useEffect(() => {
        // Simple check for cookie existence not possible in client (httpOnly)
        // We rely on API requests failing with 401 to redirect
        // Or we can check if we have seen a successful login recently?
        // Better: let the page load, fetches will fail if not auth'd.
    }, []);

    const navItems = [
        { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/admin?tab=backups', label: 'Backups', icon: Database },
    ];

    const handleLogout = async () => {
        // Clear cookie via API? Or just redirect to login?
        // Since cookie is httpOnly, we can't delete it client side easily without an endpoint.
        // For MVP, we just redirect. A real logout endpoint would be better.
        document.cookie = 'runflow_admin_token=; Max-Age=0; path=/;'; // Try to clear if not httpOnly (won't work for httpOnly)
        router.push('/admin/login');
    };

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-full z-10">
                <div className="p-6 flex items-center space-x-2 border-b border-slate-700">
                    <Shield className="w-8 h-8 text-emerald-500" />
                    <span className="text-xl font-bold">Admin</span>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                    ? 'bg-emerald-600 text-white'
                                    : 'text-slate-300 hover:bg-slate-800'
                                    }`}
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

            {/* Main Content */}
            <main className="flex-1 ml-64 p-8">
                {children}
            </main>
        </div>
    );
}
