'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes';

const THEME_COLOR_LIGHT = '#f8fafc';
const THEME_COLOR_DARK = '#0a0a0f';

/**
 * Keeps the browser chrome (<meta name="theme-color">) in sync with the
 * resolved theme. The static viewport export only reacts to the OS setting;
 * this overrides it when the user forces light/dark via the in-app toggle.
 */
function ThemeColorSync() {
    const { resolvedTheme } = useTheme();

    React.useEffect(() => {
        const color = resolvedTheme === 'dark' ? THEME_COLOR_DARK : THEME_COLOR_LIGHT;
        document
            .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
            .forEach((meta) => {
                meta.setAttribute('content', color);
                // Media-scoped metas would keep following the OS — drop the
                // qualifier so the manually selected theme wins.
                meta.removeAttribute('media');
            });
    }, [resolvedTheme]);

    return null;
}

export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
    return (
        <NextThemesProvider {...props}>
            <ThemeColorSync />
            {children}
        </NextThemesProvider>
    );
}
