'use client';

import { signIn } from 'next-auth/react';
import { Activity, Watch, Dumbbell, Waves, Mountain, Timer, Check } from 'lucide-react';

interface SyncPlatform {
    id: string;
    name: string;
    icon: React.ReactNode;
    color: string;
    available: boolean;
    description: string;
}

const platforms: SyncPlatform[] = [
    {
        id: 'strava',
        name: 'Strava',
        icon: <Activity className="w-8 h-8" />,
        color: 'bg-orange-500',
        available: true,
        description: 'Sync runs, rides, and more',
    },
    {
        id: 'garmin',
        name: 'Garmin Connect',
        icon: <Watch className="w-8 h-8" />,
        color: 'bg-blue-600',
        available: false,
        description: 'Coming soon',
    },
    {
        id: 'polar',
        name: 'Polar Flow',
        icon: <Timer className="w-8 h-8" />,
        color: 'bg-red-500',
        available: false,
        description: 'Coming soon',
    },
    {
        id: 'coros',
        name: 'COROS',
        icon: <Mountain className="w-8 h-8" />,
        color: 'bg-teal-500',
        available: false,
        description: 'Coming soon',
    },
    {
        id: 'suunto',
        name: 'Suunto',
        icon: <Dumbbell className="w-8 h-8" />,
        color: 'bg-yellow-500',
        available: false,
        description: 'Coming soon',
    },
    {
        id: 'huawei',
        name: 'Huawei Health',
        icon: <Waves className="w-8 h-8" />,
        color: 'bg-rose-500',
        available: false,
        description: 'Coming soon',
    },
];

interface SyncPlatformSelectorProps {
    onStravaConnected?: () => void;
    connectedPlatforms?: string[];
    onSkip?: () => void;
}

export default function SyncPlatformSelector({
    onStravaConnected,
    connectedPlatforms = [],
    onSkip,
}: SyncPlatformSelectorProps) {
    const handleConnect = (platformId: string) => {
        if (platformId === 'strava') {
            // Redirect to Strava OAuth
            signIn('strava', { callbackUrl: '/onboarding?step=1' });
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-foreground mb-2">
                    Connect Your Training Platforms
                </h2>
                <p className="text-foreground-muted">
                    Sync your activities to get personalized insights
                </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {platforms.map((platform) => {
                    const isConnected = connectedPlatforms.includes(platform.id);

                    return (
                        <div
                            key={platform.id}
                            className={`glass-card p-4 text-center relative ${!platform.available ? 'opacity-60' : ''
                                }`}
                        >
                            {/* Coming Soon Badge */}
                            {!platform.available && (
                                <div className="absolute top-2 right-2">
                                    <span className="text-[10px] bg-white/10 text-foreground-muted px-2 py-0.5 rounded-full">
                                        Soon
                                    </span>
                                </div>
                            )}

                            {/* Connected Badge */}
                            {isConnected && (
                                <div className="absolute top-2 right-2">
                                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                        <Check className="w-3 h-3 text-white" />
                                    </div>
                                </div>
                            )}

                            {/* Icon */}
                            <div
                                className={`w-14 h-14 ${platform.color} rounded-xl flex items-center justify-center mx-auto mb-3 text-white`}
                            >
                                {platform.icon}
                            </div>

                            {/* Name */}
                            <h3 className="font-medium text-foreground mb-1">
                                {platform.name}
                            </h3>

                            {/* Description */}
                            <p className="text-xs text-foreground-muted mb-3">
                                {platform.description}
                            </p>

                            {/* Action Button */}
                            {platform.available ? (
                                isConnected ? (
                                    <button
                                        disabled
                                        className="w-full py-2 px-3 bg-green-500/20 text-green-400 rounded-lg text-sm font-medium cursor-default"
                                    >
                                        Connected
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleConnect(platform.id)}
                                        className="w-full py-2 px-3 bg-accent-orange text-white rounded-lg text-sm font-medium hover:bg-accent-orange/90 transition-colors"
                                    >
                                        Connect
                                    </button>
                                )
                            ) : (
                                <button
                                    disabled
                                    className="w-full py-2 px-3 bg-white/5 text-foreground-muted rounded-lg text-sm cursor-not-allowed"
                                >
                                    Coming Soon
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {onSkip && (
                <div className="text-center">
                    <button
                        onClick={onSkip}
                        className="text-sm text-foreground-muted hover:text-foreground"
                    >
                        Skip for now
                    </button>
                </div>
            )}
        </div>
    );
}
