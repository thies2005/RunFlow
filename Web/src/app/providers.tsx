'use client';

import { SessionProvider } from 'next-auth/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

import { UserMetricsProvider } from '@/components/providers/UserMetricsProvider';
import { NotificationProvider } from '@/components/providers/NotificationProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60 * 1000, // 1 minute
                refetchOnWindowFocus: false,
            },
        },
    }));

    return (
        <SessionProvider>
            <QueryClientProvider client={queryClient}>
                <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                    <NotificationProvider>
                        <UserMetricsProvider>
                            {children}
                        </UserMetricsProvider>
                    </NotificationProvider>
                </ThemeProvider>
            </QueryClientProvider>
        </SessionProvider>
    );
}
