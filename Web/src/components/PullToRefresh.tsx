'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
    onRefresh: () => Promise<void> | void;
    children: React.ReactNode;
}

const PULL_THRESHOLD = 80;
const MAX_PULL = 120;

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
    const [isPulling, setIsPulling] = useState(false);
    const [pullY, setPullY] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const startY = useRef(0);
    const controls = useAnimation();

    const handleTouchStart = (e: React.TouchEvent) => {
        // Only trigger pull-to-refresh if we are at the top of the page
        if (window.scrollY === 0 && !isRefreshing) {
            startY.current = e.touches[0].clientY;
            setIsPulling(true);
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isPulling) return;

        const currentY = e.touches[0].clientY;
        const diff = currentY - startY.current;

        // If scrolling down, track the pull distance
        if (diff > 0 && window.scrollY === 0) {
            // Add some resistance
            const pulled = Math.min(diff * 0.5, MAX_PULL);
            setPullY(pulled);
            // Prevent default scroll behavior
            if (e.cancelable) {
                e.preventDefault();
            }
        } else {
            setPullY(0);
        }
    };

    const handleTouchEnd = async () => {
        if (!isPulling) return;
        setIsPulling(false);

        if (pullY >= PULL_THRESHOLD && !isRefreshing) {
            setIsRefreshing(true);
            controls.start({ y: 50 }); // Hold it open

            try {
                await onRefresh();
            } finally {
                setIsRefreshing(false);
                controls.start({ y: 0 }); // Close it
                setPullY(0);
            }
        } else {
            // Spring back if threshold not met
            controls.start({ y: 0 });
            setPullY(0);
        }
    };

    // Calculate rotation based on pull distance
    const rotation = Math.min((pullY / PULL_THRESHOLD) * 360, 360);

    return (
        <div
            className="relative w-full h-full overflow-hidden touch-pan-y"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* The pull indicator */}
            <motion.div
                className="absolute top-0 left-0 w-full flex justify-center items-center z-50 pointer-events-none"
                style={{ y: isRefreshing ? 50 : Math.min(pullY, 50) - 50 }}
                animate={controls}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
                <div className="bg-surface border border-glass-border shadow-lg rounded-full px-4 py-2 flex items-center gap-2">
                    <motion.div
                        animate={{ rotate: isRefreshing ? 360 : rotation }}
                        transition={
                            isRefreshing
                                ? { repeat: Infinity, duration: 1, ease: 'linear' }
                                : { type: 'spring', stiffness: 200, damping: 20 }
                        }
                    >
                        <RefreshCw className="w-5 h-5 text-accent-orange" />
                    </motion.div>
                </div>
            </motion.div>

            {/* Content moves slightly or gets disabled based on pull */}
            <motion.div
                animate={controls}
                style={{ y: isRefreshing ? 50 : pullY * 0.3 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="w-full h-full"
            >
                {children}
            </motion.div>
        </div>
    );
}

export default PullToRefresh;
