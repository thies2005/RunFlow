import React from 'react';

export const PoweredByStravaLogo = ({ className = "h-8" }: { className?: string }) => (
    <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-xs text-foreground-muted font-medium">Powered by</span>
        <svg viewBox="0 0 48 48" className="h-full w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Simple Strava Logo representation */}
            <path d="M15.387 18.944l-2.089-4.116h-3.065L15.387 25l5.15-10.172h-3.066l-2.084 4.116z" fill="#FC4C02" />
            <path d="M7.778 14.828h2.89L7.778 9.206l-2.89 5.622h2.89zM7.778 1L0 16.38h4.192l3.586-7.052 3.578 7.052h4.192L7.778 1z" fill="#FC4C02" />
            {/* Wordmark could go here if full logo needed, but "Powered by [Logo]" is usually sufficient or Logo + "Strava" text */}
            <path d="M26 25H29.5V16H33V13H22.5V16H26V25Z" fill="#777" /> {/* S (Mock) - simplified font */}
        </svg>
        <span className="text-sm font-bold text-foreground-muted tracking-tight">STRAVA</span>
    </div>
);

// Inline SVG version of Strava connect button (external image URL was broken)
export const ConnectWithStravaButton = ({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`group relative flex items-center gap-3 bg-[#FC4C02] text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-all
            ${disabled
                ? 'opacity-50 cursor-not-allowed grayscale-[30%]'
                : 'hover:bg-[#E34402] hover:-translate-y-0.5 active:translate-y-0'
            }`}
    >
        {/* Strava Logo SVG */}
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066l-2.084 4.116z" opacity="0.6" />
            <path d="M10.233 13.828L7.778 8.206l-2.455 5.622h4.91zM7.778 0L0 15.38h4.192l3.586-7.052 3.578 7.052h4.192L7.778 0z" />
        </svg>
        <span>Connect with Strava</span>
    </button>
);
