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
            "serviceWorker" in navigator &&
            window.workbox !== undefined
        ) {
            const wb = window.workbox;
            wb.register();
        }
    }, []);

    return null;
}
