'use client';

import { usePathname } from 'next/navigation';
import { useDeviceType } from '@/hooks/useDeviceType';
import MobileLayout from './mobile-layout';

interface AdaptiveLayoutProps {
    children: React.ReactNode;
}

// Pages that should use the mobile swipe layout
const SWIPEABLE_PATHS = ['/', '/plan', '/analytics', '/health', '/chat'];

export function AdaptiveLayout({ children }: AdaptiveLayoutProps) {
    const { isMobile, isLoading } = useDeviceType();
    const pathname = usePathname();

    // Check if current path is one of the swipeable pages
    const isSwipeablePath = SWIPEABLE_PATHS.includes(pathname);

    // During loading, show desktop layout to avoid hydration mismatch
    if (isLoading) {
        return <>{children}</>;
    }

    // On mobile, use swipe layout for main pages
    if (isMobile && isSwipeablePath) {
        return <MobileLayout />;
    }

    // On desktop or non-swipeable pages, use normal routing
    return <>{children}</>;
}

export default AdaptiveLayout;
