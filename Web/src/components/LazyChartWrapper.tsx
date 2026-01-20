'use client';

import { useState, useEffect, useRef, ReactNode, memo } from 'react';

interface LazyChartWrapperProps {
    children: ReactNode;
    height?: string;
    placeholder?: ReactNode;
}

/**
 * LazyChartWrapper - Defers rendering of heavy chart components until visible
 * 
 * Uses IntersectionObserver to detect when the element enters the viewport,
 * preventing expensive Recharts renders during navigation animations.
 */
function LazyChartWrapperComponent({
    children,
    height = '16rem',
    placeholder
}: LazyChartWrapperProps) {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            {
                rootMargin: '100px',  // Start loading slightly before visible
                threshold: 0.01
            }
        );

        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    return (
        <div ref={ref} style={{ minHeight: height }}>
            {isVisible ? children : (
                placeholder || (
                    <div
                        className="animate-pulse bg-gray-800/50 rounded-xl w-full"
                        style={{ height }}
                    />
                )
            )}
        </div>
    );
}

export const LazyChartWrapper = memo(LazyChartWrapperComponent);
LazyChartWrapper.displayName = 'LazyChartWrapper';

export default LazyChartWrapper;
