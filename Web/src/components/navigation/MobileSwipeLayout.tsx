'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';
import { MobileBottomNav } from './MobileBottomNav';
import { Home, Calendar, BarChart3, Bot, Heart } from 'lucide-react';
import StravaPoweredFooter from '@/components/StravaPoweredFooter';

interface MobileSwipeLayoutProps {
    children: React.ReactNode[];
    onPageChange?: (_index: number) => void;
    showAiChat?: boolean;
    showHealth?: boolean;
}

const BASE_PATHS = ['/', '/plan', '/analytics'];

export function MobileSwipeLayout({ children, onPageChange, showAiChat = true, showHealth = false }: MobileSwipeLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();

    const tabs = useMemo(() => [
        { icon: Home, label: 'Home', path: '/' },
        { icon: Calendar, label: 'Plan', path: '/plan' },
        { icon: BarChart3, label: 'Analytics', path: '/analytics' },
        ...(showHealth ? [{ icon: Heart, label: 'Health', path: '/health' }] : []),
        ...(showAiChat ? [{ icon: Bot, label: 'Coach', path: '/chat' }] : []),
    ], [showAiChat, showHealth]);

    const paths = useMemo(() => tabs.map(t => t.path), [tabs]);

    const getIndexFromPath = useCallback((_path: string) => {
        const _index = paths.indexOf(_path);
        return _index >= 0 ? _index : 0;
    }, [paths]);

    const [activeIndex, setActiveIndex] = useState(() => getIndexFromPath(pathname));

    useEffect(() => {
        const newIndex = getIndexFromPath(pathname);
        if (newIndex !== activeIndex) {
            setActiveIndex(newIndex);
        }
    }, [pathname, activeIndex, showAiChat, showHealth, getIndexFromPath]); // Re-run if config changes

    // Simplified navigation - no swiping, no sliding
    const handleTabChange = useCallback((index: number) => {
        // Allow re-clicking the Chat tab to reset it (navigate to base /chat)
        const isChatTab = paths[index] === '/chat';
        if (index >= 0 && index < paths.length && (index !== activeIndex || isChatTab)) {
            setActiveIndex(index);
            router.replace(paths[index], { scroll: false });
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
    }, [activeIndex, router, onPageChange, paths]);

    const isChat = pathname === '/chat';

    return (
        <div
            className="fixed inset-0 bg-background"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
            {/* Content Container - No swipe, simple fade */}
            <div className={`h-full w-full overflow-hidden ${isChat ? 'pb-[calc(90px+env(safe-area-inset-bottom))]' : 'pb-[calc(80px+env(safe-area-inset-bottom))]'}`}>
                <motion.div
                    key={activeIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="h-full w-full"
                >
                    <div className={`h-full w-full ${isChat ? 'overflow-hidden' : 'overflow-y-auto overscroll-y-contain'}`}>
                        <div className={isChat ? 'h-full' : 'min-h-full'}>
                            {/* Only render children that match current config */}
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
                tabs={tabs}
            />
        </div>
    );
}

export default MobileSwipeLayout;




