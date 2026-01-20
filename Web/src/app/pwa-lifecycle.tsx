"use client";

import { useEffect } from "react";

declare global {
    interface Window {
        workbox: any;
    }
}

export function PwaLifecycle() {
    useEffect(() => {
        if (
            typeof window !== "undefined" &&
            "serviceWorker" in navigator
        ) {
            // UNREGISTER ALL SERVICE WORKERS to clear stale cache
            navigator.serviceWorker.getRegistrations().then(function (registrations) {
                for (let registration of registrations) {
                    console.log('Unregistering Service Worker:', registration);
                    registration.unregister();
                }
            });
        }
    }, []);

    return null;
}
