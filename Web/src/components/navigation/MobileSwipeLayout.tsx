'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { MobileBottomNav } from './MobileBottomNav';
import { Home, Calendar, BarChart3, Bot, Heart } from 'lucide-react';
import StravaPoweredFooter from '@/components/StravaPoweredFooter';

interface MobileSwipeLayoutProps {
    children: React.ReactNode[];
    onPageChange?: (_index: number) => void;
    showAiChat?: boolean;
    showHealth?: boolean;
    onChatTabClick?: () => void;
}

const _BASE_PATHS = ['/', '/plan', '/analytics'];

export function MobileSwipeLayout({ children, onPageChange, showAiChat = true, showHealth = false, onChatTabClick }: MobileSwipeLayoutProps) {

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

    const [activeIndex, setActiveIndex] = useState(() => getIndexFromPath(typeof window !== 'undefined' ? window.location.pathname : '/'));

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
        // Allow re-clicking the Chat tab to reset it (navigate to base /chat)
        const isChatTab = paths[index] === '/chat';
        if (index >= 0 && index < paths.length && (index !== activeIndex || isChatTab)) {
            setActiveIndex(index);
            window.history.replaceState(null, '', paths[index]);
            onPageChange?.(index);

            if (isChatTab && onChatTabClick) {
                onChatTabClick();
            }

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
    }, [activeIndex, onPageChange, paths, onChatTabClick]);

    // Derive from activeIndex, not pathname, since we use replaceState
    const isChat = paths[activeIndex] === '/chat';

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




