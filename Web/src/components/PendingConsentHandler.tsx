'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useRef } from 'react';

/**
 * Invisible component that picks up pending consent from localStorage
 * (set during Strava OAuth flow) and logs it to the consent API
 * once the user session is established.
 */
export function PendingConsentHandler() {
    const { data: session, status } = useSession();
    const hasProcessed = useRef(false);

    useEffect(() => {
        if (status !== 'authenticated' || !session?.user?.id || hasProcessed.current) return;

        const pending = localStorage.getItem('pendingConsent');
        if (!pending) return;

        hasProcessed.current = true;

        try {
            const { types, action } = JSON.parse(pending);
            if (Array.isArray(types) && action) {
                Promise.all(
                    types.map((type: string) =>
                        fetch('/api/user/consent', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ consentType: type, action }),
                        })
                    )
                )
                    .then(() => localStorage.removeItem('pendingConsent'))
                    .catch((err) => console.error('Failed to log pending consent:', err));
            }
        } catch {
            localStorage.removeItem('pendingConsent');
        }
    }, [status, session]);

    return null; // Invisible component
}
