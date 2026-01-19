'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { App, URLOpenListenerEvent } from '@capacitor/app';

export default function DeepLinkHandler() {
    const router = useRouter();

    useEffect(() => {
        const handleDeepLink = (event: URLOpenListenerEvent) => {
            const url = new URL(event.url);
            // Only handle links for our own domain
            if (url.hostname === 'runflow.schuelken.uk' || url.protocol === 'runflow:') {
                const path = url.pathname + url.search;
                console.log('Deep link received:', path);
                router.push(path);
            }
        };

        const listener = App.addListener('appUrlOpen', handleDeepLink);

        return () => {
            listener.then(handle => handle.remove());
        };
    }, [router]);

    return null;
}
