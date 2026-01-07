import React from 'react';
import { PoweredByStravaLogo } from './StravaLogos';

export const Footer: React.FC = () => {
    return (
        <footer className="border-t border-white/10 mt-12 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-4">
                <PoweredByStravaLogo className="h-4" />
                <p className="text-gray-500 text-xs">RunFlow • Built with ❤️ for runners</p>
                <span className="text-gray-500 text-[10px] font-mono">v1.2.0</span>
            </div>
        </footer>
    );
};
