'use client';

import { useSession } from 'next-auth/react';
import OnboardingWizard from '@/components/OnboardingWizard';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect } from 'react';

export default function OnboardingPage() {
    const { status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-pulse text-foreground-muted">Loading...</div>
            </div>
        );
    }

    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-pulse text-foreground-muted">Loading Onboarding...</div>
            </div>
        }>
            <OnboardingWizard />
        </Suspense>
    );
}
