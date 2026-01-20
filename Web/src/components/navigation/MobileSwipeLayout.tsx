'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';
import { MobileBottomNav } from './MobileBottomNav';
import StravaPoweredFooter from '@/components/StravaPoweredFooter';

interface MobileSwipeLayoutProps {
    children: React.ReactNode[];
    onPageChange?: (index: number) => void;
}

const PATHS = ['/', '/plan', '/analytics'];
const SWIPE_THRESHOLD = 40; // Reduced from 80 for easier swiping
const SWIPE_VELOCITY_THRESHOLD = 200; // Reduced for more responsive swiping

export function MobileSwipeLayout({ children, onPageChange }: MobileSwipeLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();

    const getIndexFromPath = (path: string) => {
        const index = PATHS.indexOf(path);
        return index >= 0 ? index : 0;
    };

    const [activeIndex, setActiveIndex] = useState(() => getIndexFromPath(pathname));
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        const newIndex = getIndexFromPath(pathname);
        if (newIndex !== activeIndex) {
            setActiveIndex(newIndex);
        }
    }, [pathname, activeIndex]);

    const navigateToIndex = useCallback((index: number) => {
        if (index >= 0 && index < PATHS.length && index !== activeIndex && !isAnimating) {
            setIsAnimating(true);
            setActiveIndex(index);
            router.replace(PATHS[index], { scroll: false });
            onPageChange?.(index);

            // If navigating to Plan page, scroll to today
            if (index === 1) {
                setTimeout(() => {
                    const todayAnchor = document.getElementById('plan-today-anchor');
                    if (todayAnchor) {
                        todayAnchor.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 350);
            }
        }
    }, [activeIndex, isAnimating, router, onPageChange]);

    const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const { offset, velocity } = info;
        const isHorizontalSwipe = Math.abs(offset.x) > Math.abs(offset.y) * 1.5; // Relaxed ratio

        if (!isHorizontalSwipe) return;

        const hasEnoughOffset = Math.abs(offset.x) > SWIPE_THRESHOLD;
        const hasEnoughVelocity = Math.abs(velocity.x) > SWIPE_VELOCITY_THRESHOLD;

        if (hasEnoughOffset || hasEnoughVelocity) {
            if (offset.x > 0 && activeIndex > 0) {
                navigateToIndex(activeIndex - 1);
            } else if (offset.x < 0 && activeIndex < PATHS.length - 1) {
                navigateToIndex(activeIndex + 1);
            }
        }
    }, [activeIndex, navigateToIndex]);

    return (
        <div
            className="fixed inset-0 bg-background"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
            {/* Swipe container */}
            <motion.div
                className="flex h-full"
                style={{
                    width: `${PATHS.length * 100}vw`,
                    willChange: 'transform',
                }}
                animate={{ x: `-${activeIndex * 100}vw` }}
                transition={{
                    type: 'tween',
                    duration: 0.2,
                    ease: 'easeOut'
                }}
                onAnimationComplete={() => setIsAnimating(false)}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.1}
                dragDirectionLock
                onDragEnd={handleDragEnd}
            >
                {children.map((child, index) => (
                    <div
                        key={index}
                        className="h-full overflow-y-auto overscroll-y-contain flex-shrink-0"
                        style={{
                            width: '100vw',
                            paddingBottom: '80px',
                            contentVisibility: 'auto',
                            containIntrinsicSize: '100vw 100vh', // Prevents scroll jump when rendering
                        }}
                    >
                        <div className="min-h-full">
                            {child}
                            {/* Strava footer at bottom */}
                            <div className="py-6 px-4">
                                <StravaPoweredFooter />
                            </div>
                        </div>
                    </div>
                ))}
            </motion.div>

            {/* Bottom Navigation */}
            <MobileBottomNav
                activeIndex={activeIndex}
                onTabChange={navigateToIndex}
            />
        </div>
    );
}

export default MobileSwipeLayout;




