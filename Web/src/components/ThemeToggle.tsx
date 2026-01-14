'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useState, useEffect } from 'react';

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center">
                <div className="w-4 h-4 bg-foreground-muted animate-pulse rounded-full" />
            </div>
        );
    }

    const themes = [
        { name: 'light', icon: Sun },
        { name: 'dark', icon: Moon },
        { name: 'system', icon: Monitor },
    ];

    const currentTheme = themes.find(t => t.name === theme) || themes[2];
    const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';

    return (
        <button
            onClick={() => setTheme(nextTheme)}
            className="p-2 text-foreground-muted hover:text-foreground hover:bg-surface-hover rounded-lg transition-colors flex items-center gap-2"
            title={`Current: ${theme}. Click to switch to ${nextTheme}.`}
        >
            {theme === 'light' && <Sun className="w-5 h-5" />}
            {theme === 'dark' && <Moon className="w-5 h-5" />}
            {theme === 'system' && <Monitor className="w-5 h-5" />}
        </button>
    );
}
