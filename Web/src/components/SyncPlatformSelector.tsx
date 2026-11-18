'use client';

import { signIn } from 'next-auth/react';
import { Activity, Watch, Dumbbell, Waves, Mountain, Timer, Check } from 'lucide-react';

interface ZoneSettings {
    z1: number;
    z2: number;
    z3: number;
    z4: number;
    z5: number;
    z6: number;
}

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
        color: 'bg-[#FC4C02]',
        available: true,
        description: 'Sync runs, rides, and more',
    },
    {
        id: 'garmin',
        name: 'Garmin Connect',
        icon: <Watch className="w-8 h-8" />,
        color: 'bg-accent-blue',
        available: false,
        description: 'Coming soon',
    },
    {
        id: 'polar',
        name: 'Polar Flow',
        icon: <Timer className="w-8 h-8" />,
        color: 'bg-negative',
        available: false,
        description: 'Coming soon',
    },
    {
        id: 'coros',
        name: 'COROS',
        icon: <Mountain className="w-8 h-8" />,
        color: 'bg-positive',
        available: false,
        description: 'Coming soon',
    },
    {
        id: 'suunto',
        name: 'Suunto',
        icon: <Dumbbell className="w-8 h-8" />,
        color: 'bg-workout-tempo',
        available: false,
        description: 'Coming soon',
    },
    {
        id: 'huawei',
        name: 'Huawei Health',
        icon: <Waves className="w-8 h-8" />,
        color: 'bg-negative',
        available: false,
        description: 'Coming soon',
    },
];

interface SyncPlatformSelectorProps {
    onStravaConnected?: () => void;
    onHealthConnectSynced?: (_count: number) => void;
    connectedPlatforms?: string[];
    onSkip?: () => void;
    zoneSettings?: ZoneSettings;
}

export default function SyncPlatformSelector({
    onStravaConnected: _onStravaConnected,
    onHealthConnectSynced: _onHealthConnectSynced,
    connectedPlatforms = [],
    onSkip,
    zoneSettings: _zoneSettings,
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
                                    <span className="text-[10px] bg-foreground/10 text-foreground-muted px-2 py-0.5 rounded-full">
                                        Soon
                                    </span>
                                </div>
                            )}

                            {/* Connected Badge */}
                            {isConnected && (
                                <div className="absolute top-2 right-2">
                                    <div className="w-5 h-5 bg-positive rounded-full flex items-center justify-center">
                                        <Check className="w-3 h-3 text-white" />
                                    </div>
                                </div>
                            )}

                            {/* Icon */}
                            <div
                                className={`w-14 h-14 ${platform.color} rounded-md flex items-center justify-center mx-auto mb-3 text-white`}
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
                                        className="w-full py-2 px-3 bg-positive/15 text-positive rounded-md text-sm font-medium cursor-default"
                                    >
                                        Connected
                                    </button>
                                ) : (
                                    platform.id === 'strava' ? (
                                        <button
                                            onClick={() => handleConnect(platform.id)}
                                            className="w-full py-2 px-3 bg-[#FC4C02] text-white rounded-md text-sm font-semibold hover:bg-[#E34402] transition-colors flex items-center justify-center gap-1"
                                        >
                                            Connect with <span className="uppercase">Strava</span>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleConnect(platform.id)}
                                            className="w-full py-2 px-3 bg-accent-orange text-white rounded-md text-sm font-medium hover:bg-accent-orange/90 transition-colors"
                                        >
                                            Connect
                                        </button>
                                    )
                                )
                            ) : (
                                <button
                                    disabled
                                    className="w-full py-2 px-3 bg-background-tertiary text-foreground-muted rounded-md text-sm cursor-not-allowed"
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
