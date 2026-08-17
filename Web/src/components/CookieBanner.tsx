'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

export default function CookieBanner() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check local storage to see if the user has already acknowledged the banner
        const hasAcknowledged = localStorage.getItem('cookie_consent_acknowledged');
        if (!hasAcknowledged) {
            setIsVisible(true);
        }
    }, []);

    const handleAcknowledge = () => {
        localStorage.setItem('cookie_consent_acknowledged', 'true');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background-secondary border-t border-foreground/10 shadow-2xl animate-slide-up">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex-1 text-sm text-foreground-muted">
                    <p>
                        We use strictly necessary cookies to keep you logged in and secure your session.
                        By using RunFlow, you agree to our use of these essential cookies.
                        Read our <Link href="/privacy" className="text-orange-500 hover:underline">Privacy Policy</Link> to learn more.
                    </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                    <button
                        onClick={handleAcknowledge}
                        className="btn-primary py-2 px-6 text-sm whitespace-nowrap"
                    >
                        Got it!
                    </button>
                    <button
                        onClick={handleAcknowledge}
                        className="p-2 text-foreground-muted hover:text-foreground transition-colors"
                        aria-label="Close banner"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
