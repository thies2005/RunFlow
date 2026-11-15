'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Home, CalendarDays, BarChart3, HeartPulse, MessageSquare } from 'lucide-react';
import { MinimalistPillsMenu } from '@/components/MinimalistPillsMenu';

export interface AppTopBarProps {
    rightSlot?: React.ReactNode;
    className?: string;
}

interface NavItem {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    match: (_pathname: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
    {
        href: '/',
        label: 'Home',
        icon: Home,
        match: (p) => p === '/',
    },
    {
        href: '/calendar',
        label: 'Calendar',
        icon: CalendarDays,
        match: (p) => p === '/calendar' || p === '/plan',
    },
    {
        href: '/analytics',
        label: 'Analytics',
        icon: BarChart3,
        match: (p) => p === '/analytics' || p.startsWith('/analytics/'),
    },
    {
        href: '/health',
        label: 'Health',
        icon: HeartPulse,
        match: (p) => p === '/health' || p.startsWith('/health/'),
    },
    {
        href: '/chat',
        label: 'Coach',
        icon: MessageSquare,
        match: (p) => p === '/chat' || p.startsWith('/chat/'),
    },
];

export function AppTopBar({ rightSlot, className = '' }: AppTopBarProps) {
    const pathname = usePathname() || '/';

    return (
        <header className={`topbar sticky top-0 z-50 pt-[env(safe-area-inset-top)] ${className}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-14 gap-4">
                    <Link
                        href="/"
                        className="flex items-center gap-2.5 shrink-0 text-[color:var(--topbar-fg)] hover:opacity-90 transition-opacity"
                    >
                        <Image
                            src="/icons/app-icon-192.png"
                            alt="RunFlow"
                            width={32}
                            height={32}
                            priority
                            className="rounded-sm"
                        />
                        <span className="text-lg font-bold tracking-tight brand">
                            Run<span>Flow</span>
                        </span>
                    </Link>

                    <nav aria-label="Primary" className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
                        {NAV_ITEMS.map((item) => {
                            const Icon = item.icon;
                            const isActive = item.match(pathname);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    aria-current={isActive ? 'page' : undefined}
                                    className={`topbar-btn inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                                        isActive
                                            ? 'on border-accent-orange text-[color:var(--topbar-fg)]'
                                            : 'border-transparent text-[color:var(--topbar-muted)] hover:text-[color:var(--topbar-fg)]'
                                    }`}
                                >
                                    <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                                    <span className="hidden sm:inline">{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="flex items-center gap-2 shrink-0">
                        {rightSlot}
                        <MinimalistPillsMenu />
                    </div>
                </div>
            </div>
        </header>
    );
}

export default AppTopBar;
