'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';
import { MobileBottomNav } from './MobileBottomNav';

interface MobileSwipeLayoutProps {
    children: React.ReactNode[];
}

const PATHS = ['/', '/plan', '/analytics'];
const SWIPE_THRESHOLD = 80; // Increased threshold
const SWIPE_VELOCITY_THRESHOLD = 300;

export function MobileSwipeLayout({ children }: MobileSwipeLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();
    const containerRef = useRef<HTMLDivElement>(null);

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

    const navigateToIndex = (index: number) => {
        if (index >= 0 && index < PATHS.length && index !== activeIndex) {
            setActiveIndex(index);
            router.replace(PATHS[index], { scroll: false });
        }
    };

    const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        // Disable swipe on Plan page (index 1) to prevent DnD conflicts
        if (activeIndex === 1) {
            return;
        }

        const { offset, velocity } = info;

        // Only process horizontal swipes - horizontal movement must be significantly greater than vertical
        // This prevents vertical scrolling from triggering page changes
        const isHorizontalSwipe = Math.abs(offset.x) > Math.abs(offset.y) * 2;

        if (!isHorizontalSwipe) {
            return;
        }

        // Determine swipe direction - require both threshold and direction clarity
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
    };

    // Calculate if drag should be disabled (on Plan page)
    const isDragDisabled = activeIndex === 1;

    return (
        <div className="fixed inset-0 overflow-hidden bg-background pt-[env(safe-area-inset-top)]">
            <motion.div
                ref={containerRef}
                className="flex h-full w-[300vw]"
                animate={{ x: `-${activeIndex * 100}vw` }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                drag={isDragDisabled ? false : 'x'}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.05}
                dragDirectionLock
                onDragEnd={handleDragEnd}
            >
                {children.map((child, index) => (
                    <div
                        key={index}
                        className="w-screen h-full overflow-y-auto pb-20 overscroll-y-contain"
                    >
                        {child}
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

