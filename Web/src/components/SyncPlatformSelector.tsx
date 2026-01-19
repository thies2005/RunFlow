'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { Activity, Watch, Dumbbell, Waves, Mountain, Timer, Check, Heart, Loader2 } from 'lucide-react';
import {
    isMobile,
    isHealthConnectAvailable,
    requestHealthPermissions,
    syncHealthData,
    type ZoneSettings,
} from '@/lib/mobile/healthConnect';

interface SyncPlatform {
    id: string;
    name: string;
    icon: React.ReactNode;
    color: string;
    available: boolean;
    mobileOnly?: boolean;
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
        id: 'health-connect',
        name: 'Health Connect',
        icon: <Heart className="w-8 h-8" />,
        color: 'bg-green-600',
        available: true,
        mobileOnly: true,
        description: 'Sync from Android Health',
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
    onHealthConnectSynced?: (count: number) => void;
    connectedPlatforms?: string[];
    onSkip?: () => void;
    zoneSettings?: ZoneSettings;
}

export default function SyncPlatformSelector({
    onStravaConnected,
    onHealthConnectSynced,
    connectedPlatforms = [],
    onSkip,
    zoneSettings,
}: SyncPlatformSelectorProps) {
    const [healthConnectAvailable, setHealthConnectAvailable] = useState(false);
    const [healthConnectSyncing, setHealthConnectSyncing] = useState(false);
    const [healthConnectError, setHealthConnectError] = useState<string | null>(null);
    const [healthConnectSynced, setHealthConnectSynced] = useState(false);

    // Check Health Connect availability on mount (mobile only)
    useEffect(() => {
        const checkHealthConnect = async () => {
            if (isMobile()) {
                const available = await isHealthConnectAvailable();
                setHealthConnectAvailable(available);
            }
        };
        checkHealthConnect();
    }, []);

    const handleConnect = async (platformId: string) => {
        if (platformId === 'strava') {
            // Redirect to Strava OAuth
            signIn('strava', { callbackUrl: '/onboarding?step=1' });
        } else if (platformId === 'health-connect') {
            setHealthConnectError(null);
            setHealthConnectSyncing(true);

            try {
                // Request permissions
                const permitted = await requestHealthPermissions();
                if (!permitted) {
                    setHealthConnectError('Permission denied. Please grant access to Health Connect.');
                    setHealthConnectSyncing(false);
                    return;
                }

                // Sync activities
                const result = await syncHealthData(30, zoneSettings); // Last 30 days

                if (result.synced > 0 || result.skipped > 0) {
                    setHealthConnectSynced(true);
                    // Report total activities processed (new + already synced)
                    onHealthConnectSynced?.(result.synced + result.skipped);
                } else if (result.errors > 0) {
                    setHealthConnectError(
                        `Sync completed with ${result.errors} error${result.errors > 1 ? 's' : ''}.`
                    );
                } else {
                    setHealthConnectError('No activities found in Health Connect.');
                }
            } catch (error) {
                console.error('Health Connect sync failed:', error);
                setHealthConnectError('Failed to sync with Health Connect.');
            } finally {
                setHealthConnectSyncing(false);
            }
        }
    };

    // Filter platforms: hide Health Connect on web, show it on mobile
    const visiblePlatforms = platforms.filter(p => {
        if (p.mobileOnly && !isMobile()) {
            return false;
        }
        // Hide Health Connect if not available on this device
        if (p.id === 'health-connect' && !healthConnectAvailable && isMobile()) {
            return false;
        }
        return true;
    });

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
                {visiblePlatforms.map((platform) => {
                    const isConnected = connectedPlatforms.includes(platform.id) ||
                        (platform.id === 'health-connect' && healthConnectSynced);
                    const isSyncing = platform.id === 'health-connect' && healthConnectSyncing;

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

                            {/* Android Only Badge */}
                            {platform.mobileOnly && platform.available && (
                                <div className="absolute top-2 right-2">
                                    <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                                        Android
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
                                ) : isSyncing ? (
                                    <button
                                        disabled
                                        className="w-full py-2 px-3 bg-accent-orange/50 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                                    >
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Syncing...
                                    </button>
                                ) : (
                                    platform.id === 'strava' ? (
                                        <button
                                            onClick={() => handleConnect(platform.id)}
                                            className="w-full py-2 px-3 bg-[#FC4C02] text-white rounded-lg text-sm font-bold hover:bg-[#E34402] transition-colors flex items-center justify-center gap-1"
                                        >
                                            Connect with <span className="uppercase">Strava</span>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleConnect(platform.id)}
                                            className="w-full py-2 px-3 bg-accent-orange text-white rounded-lg text-sm font-medium hover:bg-accent-orange/90 transition-colors"
                                        >
                                            Connect
                                        </button>
                                    )
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

            {/* Health Connect Error Message */}
            {healthConnectError && (
                <div className="text-center">
                    <p className="text-sm text-red-400">{healthConnectError}</p>
                </div>
            )}

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
