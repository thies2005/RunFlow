'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const HealthView = dynamic(() => import('@/components/views/HealthView'), {
    loading: () => <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse text-foreground-muted">Loading health...</div></div>,
    ssr: false,
});

export default function HealthPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background animate-pulse" />}>
            <div className="min-h-screen bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
                <HealthView showHeader={true} />
            </div>
        </Suspense>
    );
}
