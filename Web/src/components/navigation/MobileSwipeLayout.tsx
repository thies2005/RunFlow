'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { MobileBottomNav } from './MobileBottomNav';
import { Home, CalendarDays, BarChart3, CalendarRange } from 'lucide-react';
import StravaPoweredFooter from '@/components/StravaPoweredFooter';

interface MobileSwipeLayoutProps {
    children: React.ReactNode[];
    onPageChange?: (_index: number) => void;
    onPathChange?: (_path: string) => void;
}

const _BASE_PATHS = ['/', '/plan', '/analytics', '/calendar'];

export function MobileSwipeLayout({ children, onPageChange, onPathChange }: MobileSwipeLayoutProps) {

    const tabs = useMemo(() => [
        { icon: Home, label: 'Home', path: '/' },
        { icon: CalendarDays, label: 'Plan', path: '/plan' },
        { icon: BarChart3, label: 'Analytics', path: '/analytics' },
        { icon: CalendarRange, label: 'Calendar', path: '/calendar' },
    ], []);

    const paths = useMemo(() => tabs.map(t => t.path), [tabs]);

    const getIndexFromPath = useCallback((_path: string) => {
        const _index = paths.indexOf(_path);
        return _index >= 0 ? _index : 0;
    }, [paths]);

    const [activeIndex, setActiveIndex] = useState(() => getIndexFromPath(typeof window !== 'undefined' ? window.location.pathname : '/'));

    useEffect(() => {
        if (activeIndex >= paths.length) {
            setActiveIndex(0);
        }
    }, [activeIndex, paths.length]);

    useEffect(() => {
        const currentPath = paths[activeIndex] ?? '/';
        onPathChange?.(currentPath);
    }, [activeIndex, onPathChange, paths]);

    // Listen for browser navigation (like swipe-to-go-back) to update tabs natively
    useEffect(() => {
        const handlePopState = () => {
            const newIndex = getIndexFromPath(window.location.pathname);
            setActiveIndex(newIndex);
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [getIndexFromPath]);

    // Simplified navigation - no swiping, no sliding
    const handleTabChange = useCallback((index: number) => {
        if (index >= 0 && index < paths.length && index !== activeIndex) {
            setActiveIndex(index);
            window.history.replaceState(null, '', paths[index]);
            onPageChange?.(index);

            // If navigating to Plan page, scroll to today
            if (paths[index] === '/plan') {
                // Short timeout to allow React to render the new view
                setTimeout(() => {
                    const todayAnchor = document.getElementById('plan-today-anchor');
                    if (todayAnchor) {
                        todayAnchor.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 100);
            }
        }
    }, [activeIndex, onPageChange, paths]);

    return (
        <div
            className="fixed inset-0 bg-background"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
            {/* Content Container - No swipe, simple fade */}
            <div className="h-full w-full overflow-hidden pb-[calc(80px+env(safe-area-inset-bottom))]">
                <motion.div
                    key={activeIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="h-full w-full"
                >
                    <div className="h-full w-full overflow-y-auto overscroll-y-contain">
                        <div className="min-h-full">
                            {/* Only render children that match current config */}
                            {children[activeIndex]}
                            {/* Strava footer at bottom */}
                            <div className="py-6 px-4">
                                <StravaPoweredFooter />
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Bottom Navigation */}
            <MobileBottomNav
                activeIndex={activeIndex}
                onTabChange={handleTabChange}
                tabs={tabs}
            />
        </div>
    );
}

export default MobileSwipeLayout;



