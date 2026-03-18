/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // Adaptive theme
                background: {
                    DEFAULT: 'var(--background)',
                    secondary: 'var(--background-secondary)',
                    tertiary: 'var(--background-tertiary)',
                },
                foreground: {
                    DEFAULT: 'var(--foreground)',
                    muted: 'var(--foreground-muted)',
                },
                // Vibrant accent gradients
                accent: {
                    orange: 'var(--accent-orange)',
                    pink: 'var(--accent-pink)',
                    purple: 'var(--accent-purple)',
                    blue: '#3a0ca3',
                    cyan: 'var(--accent-cyan)',
                },
                // Workout type colors
                'workout-long-run': 'rgb(var(--color-workout-long-run) / <alpha-value>)',
                'workout-tempo': 'rgb(var(--color-workout-tempo) / <alpha-value>)',
                'workout-interval': 'rgb(var(--color-workout-interval) / <alpha-value>)',
                'workout-race': 'rgb(var(--color-workout-race) / <alpha-value>)',
                'workout-recovery': 'rgb(var(--color-workout-recovery) / <alpha-value>)',
                'workout-strength': 'rgb(var(--color-workout-strength) / <alpha-value>)',
                'workout-easy': 'rgb(var(--color-workout-easy) / <alpha-value>)',
                // Running zones
                zone: {
                    1: '#4ade80', // Easy - Green
                    2: '#a3e635', // Moderate - Lime
                    3: '#facc15', // Threshold - Yellow
                    4: '#fb923c', // Hard - Orange
                    5: '#ef4444', // Max - Red
                },
                // Surface colors
                surface: {
                    DEFAULT: 'var(--glass-bg)',
                    hover: 'var(--glass-bg-hover)',
                    active: 'var(--glass-border)',
                },
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'gradient-intensity': 'linear-gradient(135deg, #ff6b35 0%, #f72585 50%, #7209b7 100%)',
                'gradient-recovery': 'linear-gradient(135deg, #4cc9f0 0%, #4ade80 100%)',
                'gradient-card': 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'glow': 'glow 2s ease-in-out infinite alternate',
                'slide-up': 'slideUp 0.3s ease-out',
                'fade-in': 'fadeIn 0.4s ease-out',
            },
            keyframes: {
                glow: {
                    '0%': { boxShadow: '0 0 20px rgba(255, 107, 53, 0.3)' },
                    '100%': { boxShadow: '0 0 40px rgba(247, 37, 133, 0.4)' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
            },
            backdropBlur: {
                xs: '2px',
            },
        },
    },
    plugins: [
        function({ addUtilities }) {
            addUtilities({
                '.no-scrollbar': {
                    '-ms-overflow-style': 'none',
                    'scrollbar-width': 'none',
                },
                '.no-scrollbar::-webkit-scrollbar': {
                    display: 'none',
                },
            });
        },
    ],
};
