import React from 'react';

export const PoweredByStravaLogo = ({ className = "h-8" }: { className?: string }) => (
    <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-xs text-gray-500 font-medium">Powered by</span>
        <svg viewBox="0 0 48 48" className="h-full w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Simple Strava Logo representation */}
            <path d="M15.387 18.944l-2.089-4.116h-3.065L15.387 25l5.15-10.172h-3.066l-2.084 4.116z" fill="#FC4C02" />
            <path d="M7.778 14.828h2.89L7.778 9.206l-2.89 5.622h2.89zM7.778 1L0 16.38h4.192l3.586-7.052 3.578 7.052h4.192L7.778 1z" fill="#FC4C02" />
            {/* Wordmark could go here if full logo needed, but "Powered by [Logo]" is usually sufficient or Logo + "Strava" text */}
            <path d="M26 25H29.5V16H33V13H22.5V16H26V25Z" fill="#777" /> {/* S (Mock) - simplified font */}
        </svg>
        <span className="text-sm font-bold text-gray-500 tracking-tight">STRAVA</span>
    </div>
);

// We use an image for the official button to be safe, using a raw git CDN which is stable for dev.
// Or we render a very close approximation.
export const ConnectWithStravaButton = ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick} className="group relative transition-transform hover:-translate-y-0.5 active:translate-y-0">
        <img
            src="https://raw.githubusercontent.com/strava/api/master/docs/assets/btn_strava_connectwith_orange.svg"
            alt="Connect with Strava"
            className="h-12 w-auto shadow-lg rounded"
        />
    </button>
);
