'use client';

import { useRef, useCallback, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface InfiniteScrollProps<T> {
    items: T[];
    renderItem: (item: T, index: number) => React.ReactNode;
    onFetchMore?: () => void;
    estimateSize?: number;
    hasMore?: boolean;
    className?: string;
}

export function InfiniteScroll<T>({
    items,
    renderItem,
    onFetchMore,
    estimateSize = 280,
    hasMore = false,
    className = '',
}: InfiniteScrollProps<T>) {
    const parentRef = useRef<HTMLDivElement>(null);

    const virtualizer = useVirtualizer({
        count: items.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => estimateSize,
        overscan: 3,
    });

    const handleScroll = useCallback(() => {
        const el = parentRef.current;
        if (!el || !hasMore || !onFetchMore) return;
        const threshold = el.scrollHeight * 0.75;
        if (el.scrollTop + el.clientHeight >= threshold) {
            onFetchMore();
        }
    }, [hasMore, onFetchMore]);

    useEffect(() => {
        const el = parentRef.current;
        if (!el) return;
        el.addEventListener('scroll', handleScroll, { passive: true });
        return () => el.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

    return (
        <div ref={parentRef} className={`overflow-y-auto ${className}`}>
            <div
                style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                }}
            >
                {virtualizer.getVirtualItems().map((virtualRow) => (
                    <div
                        key={virtualRow.key}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            transform: `translateY(${virtualRow.start}px)`,
                        }}
                        data-index={virtualRow.index}
                        ref={virtualizer.measureElement}
                    >
                        {renderItem(items[virtualRow.index], virtualRow.index)}
                    </div>
                ))}
            </div>
            {hasMore && (
                <div className="flex items-center justify-center py-4">
                    <div className="w-5 h-5 border-2 border-foreground/25 border-t-foreground rounded-full animate-spin" />
                </div>
            )}
        </div>
    );
}
