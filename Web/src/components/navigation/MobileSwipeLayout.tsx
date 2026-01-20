'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';
import { MobileBottomNav } from './MobileBottomNav';
import StravaPoweredFooter from '@/components/StravaPoweredFooter';

interface MobileSwipeLayoutProps {
    children: React.ReactNode[];
    onPageChange?: (index: number) => void;
}

const PATHS = ['/', '/plan', '/analytics'];
const SWIPE_THRESHOLD = 80;
const SWIPE_VELOCITY_THRESHOLD = 300;

export function MobileSwipeLayout({ children, onPageChange }: MobileSwipeLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();
    const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

    // Determine initial index from pathname
    const getIndexFromPath = (path: string) => {
        const index = PATHS.indexOf(path);
        return index >= 0 ? index : 0;
    };

    const [activeIndex, setActiveIndex] = useState(() => getIndexFromPath(pathname));

    // Sync with pathname changes (e.g., back button)
    useEffect(() => {
        const newIndex = getIndexFromPath(pathname);
        if (newIndex !== activeIndex) {
            setActiveIndex(newIndex);
        }
    }, [pathname, activeIndex]);

    const navigateToIndex = useCallback((index: number) => {
        if (index >= 0 && index < PATHS.length && index !== activeIndex) {
            setActiveIndex(index);
            router.replace(PATHS[index], { scroll: false });

            // Notify parent of page change (for scroll to today, etc.)
            onPageChange?.(index);

            // If navigating to Plan page (index 1), scroll to today after a short delay
            if (index === 1) {
                setTimeout(() => {
                    const todayAnchor = document.getElementById('plan-today-anchor');
                    if (todayAnchor) {
                        todayAnchor.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 400);
            }
        }
    }, [activeIndex, router, onPageChange]);

    const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const { offset, velocity } = info;

        // Only process horizontal swipes - horizontal movement must be significantly greater than vertical
        const isHorizontalSwipe = Math.abs(offset.x) > Math.abs(offset.y) * 2;

        if (!isHorizontalSwipe) {
            return;
        }

        // Determine swipe direction
        const hasEnoughOffset = Math.abs(offset.x) > SWIPE_THRESHOLD;
        const hasEnoughVelocity = Math.abs(velocity.x) > SWIPE_VELOCITY_THRESHOLD;

        if (hasEnoughOffset || hasEnoughVelocity) {
            if (offset.x > 0 && activeIndex > 0) {
                // Swiped right -> go to previous
                navigateToIndex(activeIndex - 1);
            } else if (offset.x < 0 && activeIndex < PATHS.length - 1) {
                // Swiped left -> go to next
                navigateToIndex(activeIndex + 1);
            }
        }
    }, [activeIndex, navigateToIndex]);

    return (
        <div className="fixed inset-0 overflow-hidden bg-background pt-[env(safe-area-inset-top)]">
            <motion.div
                className="flex h-full w-[300vw]"
                animate={{ x: `-${activeIndex * 100}vw` }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.05}
                dragDirectionLock
                onDragEnd={handleDragEnd}
            >
                {children.map((child, index) => (
                    <div
                        key={index}
                        ref={(el) => { pageRefs.current[index] = el; }}
                        className="w-screen h-full overflow-y-auto pb-24 overscroll-y-contain"
                    >
                        {child}
                        {/* Powered by Strava footer at bottom of each page */}
                        <div className="py-4 px-4">
                            <StravaPoweredFooter />
                        </div>
                    </div>
                ))}
            </motion.div>

            <MobileBottomNav
                activeIndex={activeIndex}
                onTabChange={navigateToIndex}
            />
        </div>
    );
}

export default MobileSwipeLayout;


