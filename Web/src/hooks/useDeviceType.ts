'use client';

import { useState, useEffect, useRef } from 'react';

const MOBILE_BREAKPOINT = 768;
const SPLASH_TIMEOUT_MS = 3000;

interface DeviceType {
    isMobile: boolean;
    isLoading: boolean;
}

export function useDeviceType(): DeviceType {
    const [isMobile, setIsMobile] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const hasMounted = useRef(false);

    useEffect(() => {
        if (hasMounted.current) return;
        hasMounted.current = true;

        const checkDevice = () => {
            setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
            setIsLoading(false);
        };

        checkDevice();

        window.addEventListener('resize', checkDevice);
        return () => window.removeEventListener('resize', checkDevice);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, SPLASH_TIMEOUT_MS);
        return () => clearTimeout(timer);
    }, []);

    return { isMobile, isLoading };
}

export default useDeviceType;
