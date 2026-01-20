'use client';

import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768;

interface DeviceType {
    isMobile: boolean;
    isLoading: boolean;
}

/**
 * Hook to detect mobile vs desktop environments.
 * Handles SSR hydration by starting in loading state and updating after mount.
 * Uses 768px breakpoint (standard tablet/mobile breakpoint).
 */
export function useDeviceType(): DeviceType {
    const [isMobile, setIsMobile] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkDevice = () => {
            setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
            setIsLoading(false);
        };

        // Initial check
        checkDevice();

        // Listen for resize events
        window.addEventListener('resize', checkDevice);
        return () => window.removeEventListener('resize', checkDevice);
    }, []);

    return { isMobile, isLoading };
}

export default useDeviceType;
