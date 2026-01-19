import React from 'react';
import Link from 'next/link';
import { PoweredByStravaLogo } from './StravaLogos';

export const Footer: React.FC = () => {
    return (
        <footer className="border-t border-white/10 mt-12 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-4">
                <div className="flex items-center gap-4">
                    <PoweredByStravaLogo className="h-4" />
                    <span className="text-gray-700 text-xs">|</span>
                    <Link href="/support" className="text-gray-500 hover:text-white text-xs transition-colors">
                        Support
                    </Link>
                </div>
                <p className="text-gray-500 text-xs">RunFlow • Built with ❤️ for runners</p>
                <span className="text-gray-500 text-[10px] font-mono">v1.2.0</span>
            </div>
        </footer>
    );
};
