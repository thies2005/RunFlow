'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { App, URLOpenListenerEvent } from '@capacitor/app';

export default function DeepLinkHandler() {
    const router = useRouter();

    useEffect(() => {
        const handleDeepLink = (event: URLOpenListenerEvent) => {
            const url = new URL(event.url);
            if (url.hostname === 'runflow.schuelken.uk' || url.protocol === 'runflow:') {
                const path = url.pathname + url.search;
                console.log('Deep link received:', path);

                // For API routes (like Auth Callbacks), we MUST force a hard navigation
                // so the browser makes a proper request and handles Set-Cookie headers.
                // Client-side router.push() usually fails for API routes.
                if (path.startsWith('/api/')) {
                    window.location.href = path;
                } else {
                    router.push(path);
                }
            }
        };

        const listener = App.addListener('appUrlOpen', handleDeepLink);

        return () => {
            listener.then(handle => handle.remove());
        };
    }, [router]);

    return null;
}
