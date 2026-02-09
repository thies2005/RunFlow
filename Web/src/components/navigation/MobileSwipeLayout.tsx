'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';
import { MobileBottomNav } from './MobileBottomNav';
import StravaPoweredFooter from '@/components/StravaPoweredFooter';

interface MobileSwipeLayoutProps {
    children: React.ReactNode[];
    onPageChange?: (index: number) => void;
}

const PATHS = ['/', '/plan', '/analytics', '/chat'];

export function MobileSwipeLayout({ children, onPageChange }: MobileSwipeLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();

    const getIndexFromPath = (path: string) => {
        const index = PATHS.indexOf(path);
        return index >= 0 ? index : 0;
    };

    const [activeIndex, setActiveIndex] = useState(() => getIndexFromPath(pathname));

    useEffect(() => {
        const newIndex = getIndexFromPath(pathname);
        if (newIndex !== activeIndex) {
            setActiveIndex(newIndex);
        }
    }, [pathname, activeIndex]);

    // Simplified navigation - no swiping, no sliding
    const handleTabChange = useCallback((index: number) => {
        if (index >= 0 && index < PATHS.length && index !== activeIndex) {
            setActiveIndex(index);
            router.replace(PATHS[index], { scroll: false });
            onPageChange?.(index);

            // If navigating to Plan page, scroll to today
            if (index === 1) {
                // Short timeout to allow React to render the new view
                setTimeout(() => {
                    const todayAnchor = document.getElementById('plan-today-anchor');
                    if (todayAnchor) {
                        todayAnchor.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 100);
            }
        }
    }, [activeIndex, router, onPageChange]);

    const isChat = pathname === '/chat';

    return (
        <div
            className="fixed inset-0 bg-background"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
            {/* Content Container - No swipe, simple fade */}
            <div className={`h-[100dvh] w-full overflow-hidden ${isChat ? 'pb-[calc(64px+env(safe-area-inset-bottom))]' : 'pb-[calc(80px+env(safe-area-inset-bottom))]'}`}>
                <motion.div
                    key={activeIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="h-full w-full"
                >
                    <div className={`h-full w-full ${isChat ? 'overflow-hidden' : 'overflow-y-auto overscroll-y-contain'}`}>
                        <div className={isChat ? 'h-full' : 'min-h-full'}>
                            {children[activeIndex]}
                            {/* Strava footer at bottom - hide on chat */}
                            {!isChat && (
                                <div className="py-6 px-4">
                                    <StravaPoweredFooter />
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Bottom Navigation */}
            <MobileBottomNav
                activeIndex={activeIndex}
                onTabChange={handleTabChange}
            />
        </div>
    );
}

export default MobileSwipeLayout;




