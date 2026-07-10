'use client';

import { usePathname } from 'next/navigation';
import { useDeviceType } from '@/hooks/useDeviceType';
import dynamic from 'next/dynamic';
import Image from 'next/image';

const MobileLayout = dynamic(() => import('./mobile-layout').then(m => ({ default: m.MobileLayout })), {
    ssr: false,
    loading: () => null,
});

interface AdaptiveLayoutProps {
    children: React.ReactNode;
}

// Pages that should use the mobile swipe layout
const SWIPEABLE_PATHS = ['/', '/plan', '/analytics', '/calendar'];

export function AdaptiveLayout({ children }: AdaptiveLayoutProps) {
    const { isMobile, isLoading } = useDeviceType();
    const pathname = usePathname();

    // Check if current path is one of the swipeable pages
    const isSwipeablePath = SWIPEABLE_PATHS.includes(pathname);

    // During loading, show a splash screen to avoid flashing the desktop layout
    if (isLoading) {
        return (
            <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-[100]">
                <div className="relative w-24 h-24 mb-6">
                    <Image
                        src="/icons/app-icon-192.png"
                        alt="RunFlow Loading"
                        fill
                        sizes="96px"
                        className="object-contain rounded-2xl animate-pulse"
                    />
                </div>
                <div className="w-8 h-8 rounded-full border-4 border-accent-orange border-t-transparent animate-spin"></div>
            </div>
        );
    }

    // On mobile, use swipe layout for main pages
    if (isMobile && isSwipeablePath) {
        return <MobileLayout />;
    }

    // On desktop or non-swipeable pages, use normal routing
    return <>{children}</>;
}

export default AdaptiveLayout;
