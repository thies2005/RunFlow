import React from 'react';
import Link from 'next/link';
import { PoweredByStravaLogo } from './StravaLogos';
import { Heart } from 'lucide-react';

export const Footer: React.FC = () => {
    return (
        <footer className="border-t border-foreground/10 mt-12 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-4">
                <div className="flex items-center gap-4">
                    <PoweredByStravaLogo className="h-4" />
                    <span className="text-foreground-secondary text-xs">|</span>
                    <Link href="/support" className="text-foreground-muted hover:text-foreground text-xs transition-colors">
                        Support
                    </Link>
                    <span className="text-foreground-secondary text-xs">|</span>
                    <Link href="/privacy" className="text-foreground-muted hover:text-foreground text-xs transition-colors">
                        Privacy
                    </Link>
                    <span className="text-foreground-secondary text-xs">|</span>
                    <Link href="/terms" className="text-foreground-muted hover:text-foreground text-xs transition-colors">
                        Terms
                    </Link>
                    <span className="text-foreground-secondary text-xs">|</span>
                    <Link href="/impressum" className="text-foreground-muted hover:text-foreground text-xs transition-colors">
                        Impressum
                    </Link>
                </div>
                <p className="text-foreground-muted text-xs flex items-center gap-1">RunFlow • Built with <Heart className="w-3 h-3 text-red-500" /> for runners</p>
                <span className="text-foreground-muted text-[10px] font-mono">v1.2.0</span>
            </div>
        </footer>
    );
};
