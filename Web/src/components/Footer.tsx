import React from 'react';
import Link from 'next/link';
import { PoweredByStravaLogo } from './StravaLogos';
import { Heart } from 'lucide-react';

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
                    <span className="text-gray-700 text-xs">|</span>
                    <Link href="/privacy" className="text-gray-500 hover:text-white text-xs transition-colors">
                        Privacy
                    </Link>
                    <span className="text-gray-700 text-xs">|</span>
                    <Link href="/terms" className="text-gray-500 hover:text-white text-xs transition-colors">
                        Terms
                    </Link>
                </div>
                <p className="text-gray-500 text-xs flex items-center gap-1">RunFlow • Built with <Heart className="w-3 h-3 text-red-500" /> for runners</p>
                <span className="text-gray-500 text-[10px] font-mono">v1.2.0</span>
            </div>
        </footer>
    );
};
