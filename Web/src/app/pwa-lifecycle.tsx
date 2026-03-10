"use client";

import { useEffect } from "react";

declare global {
    interface _Window {
        workbox: any;
    }
}

export function PwaLifecycle() {
    useEffect(() => {
        if (
            typeof window !== "undefined" &&
            "serviceWorker" in navigator
        ) {
            // Register service worker for PWA + push notifications
        }
    }, []);

    return null;
}
