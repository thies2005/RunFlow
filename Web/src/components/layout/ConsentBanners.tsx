'use client';

import { useCallback, useState } from 'react';
import ReconsentBanner from '@/components/layout/ReconsentBanner';
import CookieBanner from '@/components/CookieBanner';

/**
 * Both banners anchor to the bottom of the viewport, so rendering them at the
 * same time makes them stack on top of each other. While the GDPR reconsent
 * banner is up, it wins and the cookie notice waits.
 */
export default function ConsentBanners() {
    const [reconsentActive, setReconsentActive] = useState(false);
    const handleActiveChange = useCallback((active: boolean) => setReconsentActive(active), []);

    return (
        <>
            <ReconsentBanner onActiveChange={handleActiveChange} />
            {!reconsentActive && <CookieBanner />}
        </>
    );
}
