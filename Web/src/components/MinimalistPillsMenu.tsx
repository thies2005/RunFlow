'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession, signOut, signIn } from 'next-auth/react';
import {
    DASHBOARD_LAYOUT_MODE_OPTIONS,
    CYCLING_METRIC_OPTIONS,
    RUNNING_METRIC_OPTIONS,
    DEFAULT_CYCLING_METRICS,
    DEFAULT_RUNNING_METRICS,
    STORAGE_KEY_LAYOUT_MODE,
    STORAGE_KEY_CYCLING_METRICS,
    STORAGE_KEY_RUNNING_METRICS,
    EVENT_DASHBOARD_LAYOUT_CHANGE,
    readDashboardLayoutMode,
    readDashboardCyclingMetrics,
    readDashboardRunningMetrics,
    type DashboardStatusLayoutMode,
    type CyclingDashboardMetricId,
    type RunningDashboardMetricId,
} from '@/components/dashboard/TrainingStatusCard';
import { evictAuthBoundCaches } from '@/lib/pwa/authCacheEviction';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import {
    ChevronLeft, ChevronRight, LogOut, Sun, Moon, Monitor,
    Trophy, Heart, Activity, Bot, Link2, Bell, Settings,
    Trash2, RefreshCw, Key, Copy, Check, ExternalLink,
    ShieldCheck, ShieldOff, AlertCircle, Save, Download,
} from 'lucide-react';
import Link from 'next/link';

import { UserAvatar } from '@/components/UserAvatar';
import { Input } from '@/components/ui/Input';
import AiSettingsModal from '@/components/AiSettingsModal';
import { ReminderSettingsModal } from '@/components/views/ReminderSettingsModal';
import PastRacesSection from '@/components/PastRacesSection';
import SettingsModal from '@/components/SettingsModal';
import { requestHealthPermissions, syncHealthData } from '@/lib/mobile/healthConnect';
import { useDeviceType } from '@/hooks/useDeviceType';

type SubPage =
    | null
    | 'training-plan'
    | 'past-races'
    | 'hr-zones'
    | 'biometrics'
    | 'ai-coach'
    | 'connections'
    | 'reminders'
    | 'app-settings';

interface MinimalistPillsMenuProps {
    trigger?: React.ReactNode;
}

export function MinimalistPillsMenu({ trigger }: MinimalistPillsMenuProps) {
    const { data: session } = useSession();
    const [isOpen, setIsOpen] = useState(false);
    const [subPage, setSubPage] = useState<SubPage>(null);
    const { isMobile, isLoading } = useDeviceType();

    const close = useCallback(() => {
        setSubPage(null);
        setIsOpen(false);
    }, []);

    if (!session?.user) return null;

    const openDesktopPopover = isOpen && !isLoading && !isMobile;
    const openMobilePanel = isOpen && !isLoading && isMobile;

    return (
        <>
            <div onClick={() => setIsOpen(true)} className="cursor-pointer">
                {trigger || (
                    <button className="flex items-center gap-2 p-1 rounded-full hover:bg-surface-hover transition-colors border border-transparent hover:border-line">
                        <UserAvatar
                            image={session.user.image}
                            name={session.user.name}
                            className="w-8 h-8 border border-line"
                        />
                    </button>
                )}
            </div>

            {openMobilePanel && (
                <MobilePanel
                    session={session}
                    subPage={subPage}
                    setSubPage={setSubPage}
                    onClose={close}
                />
            )}

            {openDesktopPopover && (
                <DesktopPopover
                    session={session}
                    onClose={close}
                />
            )}
        </>
    );
}

// ═══════════════════════════════════════════════════════════════
// MOBILE: Full-screen slide-up panel
// ═══════════════════════════════════════════════════════════════

function MobilePanel({
    session,
    subPage,
    setSubPage,
    onClose,
}: {
    session: { user: { name?: string | null; email?: string | null; image?: string | null } };
    subPage: SubPage;
    setSubPage: (_p: SubPage) => void;
    onClose: () => void;
}) {
    const { theme, setTheme } = useTheme();

    const handleBack = useCallback(() => {
        if (subPage) {
            setSubPage(null);
        } else {
            onClose();
        }
    }, [subPage, setSubPage, onClose]);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    useEffect(() => {
        let isCancelled = false;
        let backListener: any = null;

        const setupCapacitor = async () => {
            try {
                const { Capacitor } = await import('@capacitor/core');
                if (Capacitor.isNativePlatform()) {
                    const { App } = await import('@capacitor/app');
                    const listener = await App.addListener('backButton', () => {
                        if (!isCancelled) handleBack();
                    });
                    if (isCancelled) {
                        listener.remove();
                    } else {
                        backListener = listener;
                    }
                }
            } catch {
                // non-capacitor environment
            }
        };
        setupCapacitor();

        return () => {
            isCancelled = true;
            if (backListener) backListener.remove();
        };
    }, [handleBack]);

    const menuItems = getMenuItems(session, theme);

    const currentSubPageLabel = subPage
        ? menuItems.find(i => i.subPage === subPage)?.label || 'Settings'
        : null;

    return (
        <div className="fixed inset-0 z-[200] bg-background animate-fade-in">
            <div className="h-full flex flex-col">
                {subPage ? (
                    <>
                        <div className="flex items-center gap-2 px-4 pt-safe pb-2 border-b border-line">
                            <button onClick={handleBack} className="text-foreground-muted hover:text-foreground p-1 -ml-1">
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <span className="text-sm font-semibold text-foreground">{currentSubPageLabel}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            <SubPageContent
                                subPage={subPage}
                                onBack={() => setSubPage(null)}
                            />
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex items-center justify-between px-4 pt-safe pb-2">
                            <div className="w-8" />
                            <h2 className="text-sm font-semibold text-foreground-muted">Settings</h2>
                            <button onClick={onClose} className="text-foreground-muted hover:text-foreground p-1">
                                <ChevronRight className="w-5 h-5 rotate-180" />
                            </button>
                        </div>

                        <div className="px-5 pt-2 pb-4 text-center">
                            <UserAvatar
                                image={session.user.image}
                                name={session.user.name}
                                className="w-16 h-16 mx-auto mb-2 border-2 border-line"
                            />
                            <div className="text-base font-semibold text-foreground">{session.user.name}</div>
                            <div className="text-xs text-foreground-muted">{session.user.email}</div>
                        </div>

                        <div className="h-px bg-line mx-5" />

                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
                            {menuItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        if (item.action) item.action();
                                        else if (item.subPage) setSubPage(item.subPage);
                                    }}
                                    className="w-full flex items-center gap-3 px-3.5 py-3 bg-surface rounded-md transition-colors active:bg-surface-hover"
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.iconBg}`}>
                                        <item.icon className={`w-4 h-4 ${item.iconColor}`} />
                                    </div>
                                    <div className="flex-1 text-left min-w-0">
                                        <div className="text-sm font-medium text-foreground">{item.label}</div>
                                        {item.subtitle && (
                                            <div className="text-[11px] text-foreground-muted truncate">{item.subtitle}</div>
                                        )}
                                    </div>
                                    {item.badge && (
                                        <span className="text-[10px] font-medium bg-surface-tertiary text-foreground-muted px-2 py-0.5 rounded-full">
                                            {item.badge}
                                        </span>
                                    )}
                                    {item.rightIcon && <item.rightIcon className="w-4 h-4 text-foreground-muted shrink-0" />}
                                </button>
                            ))}
                        </div>

                        <div className="px-5 pt-2 pb-4 border-t border-line bg-background">
                            <div className="flex items-center justify-center gap-2 mb-3">
                                {[
                                    { id: 'light', icon: Sun },
                                    { id: 'dark', icon: Moon },
                                    { id: 'system', icon: Monitor },
                                ].map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => setTheme(t.id)}
                                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                                            theme === t.id
                                                ? 'bg-accent-orange text-white'
                                                : 'bg-surface text-foreground-muted'
                                        }`}
                                    >
                                        <t.icon className="w-4 h-4" />
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={async () => {
                                    // Evict auth-bound SW runtime caches before the
                                    // sign-out navigation so the previous account's
                                    // cached API responses can never be replayed.
                                    await evictAuthBoundCaches();
                                    await signOut({ callbackUrl: '/login' });
                                }}
                                className="w-full py-3 text-negative text-sm font-medium rounded-md hover:bg-negative/10 transition-colors"
                            >
                                Log Out
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// DESKTOP: Popover anchored to trigger
// ═══════════════════════════════════════════════════════════════

function DesktopPopover({
    session,
    onClose,
}: {
    session: { user: { name?: string | null; email?: string | null; image?: string | null } };
    onClose: () => void;
}) {
    const { theme, setTheme } = useTheme();
    const popoverRef = useRef<HTMLDivElement>(null);
    const [subPage, setSubPage] = useState<SubPage>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement | null;
            if (target?.closest('[role="dialog"]')) {
                return;
            }
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (subPage) setSubPage(null);
                else onClose();
            }
        };
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [onClose, subPage]);

    const menuItems = getMenuItems(session, theme);

    if (subPage) {
        return (
            <div
                ref={popoverRef}
                className="fixed top-16 right-4 z-[200] w-80 bg-background-secondary border border-line shadow-lg rounded-md overflow-hidden animate-slide-in"
            >
                <div className="flex items-center gap-2 px-4 py-3 border-b border-line">
                    <button onClick={() => setSubPage(null)} className="text-foreground-muted hover:text-foreground">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-semibold text-foreground">
                        {menuItems.find(i => i.subPage === subPage)?.label || 'Settings'}
                    </span>
                </div>
                <div className="max-h-[70vh] overflow-y-auto">
                    <SubPageContent subPage={subPage} onBack={() => setSubPage(null)} />
                </div>
            </div>
        );
    }

    return (
        <div
            ref={popoverRef}
            className="fixed top-16 right-4 z-[200] w-72 bg-background-secondary border border-line shadow-lg rounded-md overflow-hidden animate-slide-in"
        >
            <div className="p-3 border-b border-line">
                <p className="text-sm font-semibold text-foreground truncate">{session.user.name}</p>
                <p className="text-xs text-foreground-muted truncate">{session.user.email}</p>
            </div>

            <div className="max-h-[65vh] overflow-y-auto p-2 space-y-1">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => {
                            if (item.action) item.action();
                            else if (item.subPage) setSubPage(item.subPage);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-surface-hover rounded-lg transition-colors"
                    >
                        <item.icon className={`w-4 h-4 shrink-0 ${item.iconColor}`} />
                        <span className="flex-1 text-left truncate">{item.label}</span>
                        {item.badge && (
                            <span className="text-[10px] bg-surface-tertiary text-foreground-muted px-1.5 py-0.5 rounded-full">
                                {item.badge}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            <div className="p-2 border-t border-line">
                <div className="flex bg-background-tertiary rounded-md p-1 border border-line mb-2">
                    {[
                        { id: 'light', icon: Sun, label: 'Light' },
                        { id: 'dark', icon: Moon, label: 'Dark' },
                        { id: 'system', icon: Monitor, label: 'Auto' },
                    ].map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setTheme(t.id)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs transition-colors ${
                                theme === t.id
                                    ? 'bg-background-secondary text-foreground'
                                    : 'text-foreground-muted hover:text-foreground hover:bg-surface-hover'
                            }`}
                        >
                            <t.icon className="w-3.5 h-3.5" />
                            <span>{t.label}</span>
                        </button>
                    ))}
                </div>
                <button
                    onClick={async () => {
                        // Evict auth-bound SW runtime caches before the
                        // sign-out navigation so the previous account's
                        // cached API responses can never be replayed.
                        await evictAuthBoundCaches();
                        await signOut({ callbackUrl: '/login' });
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-negative hover:bg-negative/10 rounded-md transition-colors"
                >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out</span>
                </button>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// MENU ITEMS (shared config)
// ═══════════════════════════════════════════════════════════════

interface MenuItem {
    id: string;
    label: string;
    subtitle?: string;
    icon: any;
    iconColor: string;
    iconBg: string;
    badge?: string;
    rightIcon?: any;
    subPage?: SubPage;
    action?: () => void;
}

function getMenuItems(
    _session: { user: { name?: string | null; email?: string | null; image?: string | null } },
    _theme: string | undefined,
): MenuItem[] {
    return [
        {
            id: 'training-plan',
            label: 'Training Plan',
            subtitle: 'Target race, volume, calibration',
            icon: Trophy,
            iconColor: 'text-accent-orange',
            iconBg: 'bg-accent-orange/15',
            rightIcon: ChevronRight,
            subPage: 'training-plan',
        },
        {
            id: 'past-races',
            label: 'Past Races',
            subtitle: 'Completed goals & results',
            icon: Trophy,
            iconColor: 'text-workout-tempo',
            iconBg: 'bg-workout-tempo/15',
            badge: undefined,
            rightIcon: ChevronRight,
            subPage: 'past-races',
        },
        {
            id: 'hr-zones',
            label: 'Heart Rate & Power Zones',
            subtitle: 'Running HR, Cycling FTP & 7 zones',
            icon: Heart,
            iconColor: 'text-accent-pink',
            iconBg: 'bg-accent-pink/15',
            rightIcon: ChevronRight,
            subPage: 'hr-zones',
        },
        {
            id: 'biometrics',
            label: 'Biometrics',
            subtitle: 'Weight, height, marathon shape',
            icon: Activity,
            iconColor: 'text-accent-blue',
            iconBg: 'bg-accent-blue/15',
            rightIcon: ChevronRight,
            subPage: 'biometrics',
        },
        {
            id: 'ai-coach',
            label: 'AI Coach',
            subtitle: 'Custom API, data access, feedback',
            icon: Bot,
            iconColor: 'text-accent-purple',
            iconBg: 'bg-accent-purple/15',
            rightIcon: ChevronRight,
            subPage: 'ai-coach',
        },
        {
            id: 'connections',
            label: 'Connections',
            subtitle: 'Strava, Health Connect',
            icon: Link2,
            iconColor: 'text-positive',
            iconBg: 'bg-positive/15',
            rightIcon: ChevronRight,
            subPage: 'connections',
        },
        {
            id: 'reminders',
            label: 'Reminders',
            subtitle: 'Supplements, weigh-in, workouts',
            icon: Bell,
            iconColor: 'text-accent-cyan',
            iconBg: 'bg-accent-cyan/15',
            rightIcon: ChevronRight,
            subPage: 'reminders',
        },
        {
            id: 'app-settings',
            label: 'App Settings',
            subtitle: 'Units, theme, API, privacy, export',
            icon: Settings,
            iconColor: 'text-foreground-muted',
            iconBg: 'bg-surface-tertiary',
            rightIcon: ChevronRight,
            subPage: 'app-settings',
        },
    ];
}

// ═══════════════════════════════════════════════════════════════
// SUB-PAGES
// ═══════════════════════════════════════════════════════════════

function SubPageContent({ subPage, onBack }: { subPage: SubPage; onBack: () => void }) {
    switch (subPage) {
        case 'training-plan':
            return <TrainingPlanSubPage onBack={onBack} />;
        case 'past-races':
            return <PastRacesSubPage onBack={onBack} />;
        case 'hr-zones':
            return <HrZonesSubPage onBack={onBack} />;
        case 'biometrics':
            return <BiometricsSubPage onBack={onBack} />;
        case 'ai-coach':
            return <AiCoachSubPage onBack={onBack} />;
        case 'connections':
            return <ConnectionsSubPage onBack={onBack} />;
        case 'reminders':
            return <RemindersSubPage onBack={onBack} />;
        case 'app-settings':
            return <AppSettingsSubPage onBack={onBack} />;
        default:
            return null;
    }
}

// ─── Training Plan ───────────────────────────────────────────

function TrainingPlanSubPage({ onBack }: { onBack: () => void }) {
    const [isOpen, setIsOpen] = useState(true);

    useEffect(() => {
        setIsOpen(true);
        if (typeof window !== 'undefined') {
            localStorage.removeItem('runflow_hide_no_plan_prompt');
            window.dispatchEvent(new Event('runflow-plan-reminder-change'));
        }
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        setTimeout(onBack, 150);
    };

    return (
        <SettingsModal
            isOpen={isOpen}
            onClose={handleClose}
        />
    );
}

// ─── Past Races ──────────────────────────────────────────────

function PastRacesSubPage({ onBack: _onBack }: { onBack: () => void }) {
    return (
        <div className="p-5 space-y-4">
            <h3 className="text-lg font-bold text-foreground">Past Races & Training Plans</h3>
            <PastRacesSection />
        </div>
    );
}

// ─── Heart Rate & Cycling Power Zones ────────────────────────

function HrZonesSubPage({ onBack: _onBack }: { onBack: () => void }) {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'running' | 'cycling'>('running');

    const { data: settingsData } = useQuery({
        queryKey: ['user-settings'],
        queryFn: async () => {
            const res = await fetch('/api/settings/update-vdot');
            if (!res.ok) throw new Error('Failed to fetch settings');
            return res.json();
        },
        refetchOnWindowFocus: false,
    });

    const { data: cyclingData } = useQuery({
        queryKey: ['cycling-settings'],
        queryFn: async () => {
            const res = await fetch('/api/settings/cycling');
            if (!res.ok) throw new Error('Failed to fetch cycling settings');
            return res.json();
        },
        refetchOnWindowFocus: false,
    });

    const [thresholdHr, setThresholdHr] = useState<number | undefined>(undefined);
    const [cyclingLthr, setCyclingLthr] = useState<number>(162);
    const [ftpWatts, setFtpWatts] = useState<number>(250);
    const [hrZone1Max, setHrZone1Max] = useState(130);
    const [hrZone2Max, setHrZone2Max] = useState(148);
    const [hrZone3Max, setHrZone3Max] = useState(160);
    const [hrZone4Max, setHrZone4Max] = useState(170);
    const [hrZone5Max, setHrZone5Max] = useState(178);
    const [hrZone6Max, setHrZone6Max] = useState(187);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (settingsData) {
            if (settingsData.thresholdHeartRate) {
                setThresholdHr(settingsData.thresholdHeartRate);
                setCyclingLthr(Math.max(110, settingsData.thresholdHeartRate - 8));
            }
            if (settingsData.hrZone1Max) setHrZone1Max(settingsData.hrZone1Max);
            if (settingsData.hrZone2Max) setHrZone2Max(settingsData.hrZone2Max);
            if (settingsData.hrZone3Max) setHrZone3Max(settingsData.hrZone3Max);
            if (settingsData.hrZone4Max) setHrZone4Max(settingsData.hrZone4Max);
            if (settingsData.hrZone5Max) setHrZone5Max(settingsData.hrZone5Max);
            if (settingsData.hrZone6Max) setHrZone6Max(settingsData.hrZone6Max);
        }
    }, [settingsData]);

    useEffect(() => {
        if (cyclingData) {
            const resolved = cyclingData.ftpWatts ?? cyclingData.eFtpWatts;
            if (resolved && resolved > 0) setFtpWatts(resolved);
        }
    }, [cyclingData]);

    const handleThresholdChange = (val: number) => {
        setThresholdHr(val);
        if (val > 0) {
            setHrZone1Max(Math.round(val * 0.75));
            setHrZone2Max(Math.round(val * 0.87));
            setHrZone3Max(Math.round(val * 0.94));
            setHrZone4Max(Math.round(val * 1.00));
            setHrZone5Max(Math.round(val * 1.05));
            setHrZone6Max(Math.round(val * 1.10));
            setCyclingLthr(Math.max(110, val - 8));
        }
    };

    const saveMutation = useMutation({
        mutationFn: async () => {
            const [hrRes, bikeRes] = await Promise.all([
                fetch('/api/settings/profile', {
                    method: 'POST',
                    body: JSON.stringify({ thresholdHeartRate: thresholdHr, hrZone1Max, hrZone2Max, hrZone3Max, hrZone4Max, hrZone5Max, hrZone6Max }),
                    headers: { 'Content-Type': 'application/json' },
                }),
                fetch('/api/settings/cycling', {
                    method: 'PUT',
                    body: JSON.stringify({ ftpWatts }),
                    headers: { 'Content-Type': 'application/json' },
                }),
            ]);
            if (!hrRes.ok || !bikeRes.ok) throw new Error('Failed to update');
            return hrRes.json();
        },
        onSuccess: () => {
            setMessage('Running & Cycling zones saved!');
            queryClient.invalidateQueries({ queryKey: ['user-settings'] });
            queryClient.invalidateQueries({ queryKey: ['cycling-settings'] });
            setTimeout(() => setMessage(''), 2000);
        },
        onError: () => setMessage('Error saving. Try again.'),
    });

    const zones = [
        { label: 'Zone 1 (Recovery)', desc: '<75% LTHR', value: hrZone1Max, setter: setHrZone1Max, color: 'text-zone-1' },
        { label: 'Zone 2 (Aerobic)', desc: '76-87% LTHR', value: hrZone2Max, setter: setHrZone2Max, color: 'text-zone-2' },
        { label: 'Zone 3 (Tempo)', desc: '88-94% LTHR', value: hrZone3Max, setter: setHrZone3Max, color: 'text-zone-3' },
        { label: 'Zone 4 (Threshold)', desc: '95-100% LTHR', value: hrZone4Max, setter: setHrZone4Max, color: 'text-zone-4' },
        { label: 'Zone 5 (VO2max)', desc: '101-105% LTHR', value: hrZone5Max, setter: setHrZone5Max, color: 'text-zone-5' },
        { label: 'Zone 6 (Anaerobic)', desc: '106-110% LTHR', value: hrZone6Max, setter: setHrZone6Max, color: 'text-accent-pink' },
    ];

    const cogganPowerZones = [
        { name: 'Z1 Active Recovery', pct: '<55% FTP', min: 0, max: Math.round(ftpWatts * 0.55), color: 'text-emerald-400' },
        { name: 'Z2 Endurance', pct: '56–75% FTP', min: Math.round(ftpWatts * 0.56), max: Math.round(ftpWatts * 0.75), color: 'text-blue-400' },
        { name: 'Z3 Tempo', pct: '76–90% FTP', min: Math.round(ftpWatts * 0.76), max: Math.round(ftpWatts * 0.90), color: 'text-cyan-400' },
        { name: 'Z4 Threshold', pct: '91–105% FTP', min: Math.round(ftpWatts * 0.91), max: Math.round(ftpWatts * 1.05), color: 'text-amber-400' },
        { name: 'Z5 VO2max', pct: '106–120% FTP', min: Math.round(ftpWatts * 1.06), max: Math.round(ftpWatts * 1.20), color: 'text-orange-400' },
        { name: 'Z6 Anaerobic', pct: '121–150% FTP', min: Math.round(ftpWatts * 1.21), max: Math.round(ftpWatts * 1.50), color: 'text-purple-400' },
        { name: 'Z7 Neuromuscular', pct: '>150% FTP', min: Math.round(ftpWatts * 1.51), max: null, color: 'text-rose-400' },
    ];

    const cyclingHrZones = [
        { name: 'Z1 Recovery', min: 0, max: Math.round(cyclingLthr * 0.75), color: 'text-zone-1' },
        { name: 'Z2 Endurance', min: Math.round(cyclingLthr * 0.75) + 1, max: Math.round(cyclingLthr * 0.87), color: 'text-zone-2' },
        { name: 'Z3 Tempo / Sweet Spot', min: Math.round(cyclingLthr * 0.87) + 1, max: Math.round(cyclingLthr * 0.94), color: 'text-zone-3' },
        { name: 'Z4 Threshold', min: Math.round(cyclingLthr * 0.94) + 1, max: cyclingLthr, color: 'text-zone-4' },
        { name: 'Z5 VO2max', min: cyclingLthr + 1, max: Math.round(cyclingLthr * 1.05), color: 'text-zone-5' },
        { name: 'Z6 Anaerobic', min: Math.round(cyclingLthr * 1.05) + 1, max: Math.round(cyclingLthr * 1.10), color: 'text-accent-pink' },
        { name: 'Z7 Neuromuscular', min: Math.round(cyclingLthr * 1.10) + 1, max: null, color: 'text-workout-long-run' },
    ];

    return (
        <div className="p-5 space-y-5">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">Heart Rate & Power Zones</h3>
            </div>

            <div className="grid grid-cols-2 gap-2 p-1 bg-surface rounded-lg border border-line">
                <button
                    type="button"
                    onClick={() => setActiveTab('running')}
                    className={`py-2 px-3 rounded-md text-xs font-semibold transition-colors ${
                        activeTab === 'running'
                            ? 'bg-accent-orange text-white'
                            : 'text-foreground-muted hover:text-foreground'
                    }`}
                >
                    Running HR Zones
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('cycling')}
                    className={`py-2 px-3 rounded-md text-xs font-semibold transition-colors ${
                        activeTab === 'cycling'
                            ? 'bg-accent-cyan text-white'
                            : 'text-foreground-muted hover:text-foreground'
                    }`}
                >
                    Cycling Power & HR
                </button>
            </div>

            {activeTab === 'running' ? (
                <div className="space-y-4">
                    <Input
                        label="Running Threshold Heart Rate (LTHR)"
                        id="thresholdHr"
                        type="number"
                        value={thresholdHr || ''}
                        onChange={e => handleThresholdChange(parseInt(e.target.value) || 0)}
                        placeholder="e.g. 170"
                        helperText="Enter Running LTHR to auto-calculate 7-zone running HR thresholds"
                    />

                    <div className="space-y-3">
                        {zones.map((zone) => (
                            <div key={zone.label} className="flex items-center gap-3">
                                <div className={`text-sm font-medium w-32 ${zone.color}`}>{zone.label}</div>
                                <input
                                    type="number"
                                    value={zone.value}
                                    onChange={e => zone.setter(parseInt(e.target.value) || 0)}
                                    className="flex-1 bg-surface border border-line rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent-orange/50"
                                />
                                <span className="text-[10px] text-foreground-muted w-20 text-right">{zone.desc}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-foreground-muted mb-1">Cycling FTP (Watts)</label>
                            <input
                                type="number"
                                min={50}
                                max={600}
                                value={ftpWatts}
                                onChange={e => setFtpWatts(parseInt(e.target.value, 10) || 200)}
                                className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-accent-cyan/50"
                            />
                            {cyclingData?.eFtpWatts && (
                                <button
                                    type="button"
                                    onClick={() => setFtpWatts(cyclingData.eFtpWatts)}
                                    className="text-[11px] text-accent-cyan hover:underline mt-1 block"
                                >
                                    Detected from rides/FTP test: {cyclingData.eFtpWatts}W (click to apply)
                                </button>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs text-foreground-muted mb-1">Cycling LTHR (bpm)</label>
                            <input
                                type="number"
                                min={100}
                                max={220}
                                value={cyclingLthr}
                                onChange={e => setCyclingLthr(parseInt(e.target.value, 10) || 160)}
                                className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-accent-cyan/50"
                            />
                            <span className="text-[10px] text-foreground-muted mt-1 block">
                                Typically ~5–10 bpm lower than Running LTHR
                            </span>
                        </div>
                    </div>

                    <div className="bg-surface border border-line rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between border-b border-line pb-1.5">
                            <span className="text-xs font-semibold text-accent-cyan">Coggan Power Zones (Biking Watts)</span>
                            {cyclingData?.weightKg && ftpWatts > 0 && (
                                <span className="text-[11px] font-mono text-foreground-muted">
                                    {(ftpWatts / cyclingData.weightKg).toFixed(2)} W/kg
                                </span>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            {cogganPowerZones.map((z) => (
                                <div key={z.name} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-background-secondary/60">
                                    <span className={`font-medium ${z.color}`}>{z.name}</span>
                                    <div className="flex items-center gap-3 font-mono">
                                        <span className="text-foreground-muted text-[10px]">{z.pct}</span>
                                        <span className="text-foreground font-semibold">{z.min}–{z.max ?? '∞'} W</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-surface border border-line rounded-lg p-3 space-y-2">
                        <span className="text-xs font-semibold text-accent-orange block border-b border-line pb-1.5">
                            Cycling Heart Rate Zones (7-Zone Model)
                        </span>
                        <div className="space-y-1.5">
                            {cyclingHrZones.map((z) => (
                                <div key={z.name} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-background-secondary/60">
                                    <span className={`font-medium ${z.color}`}>{z.name}</span>
                                    <span className="font-mono text-foreground font-semibold">
                                        {z.min}–{z.max ?? '∞'} bpm
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {message && (
                <div className={`p-3 rounded-lg text-sm ${message.includes('Error') ? 'bg-negative/10 text-negative' : 'bg-positive/10 text-positive'}`}>
                    {message}
                </div>
            )}

            <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
                {saveMutation.isPending ? <Save className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                Save Running & Cycling Zones
            </button>
        </div>
    );
}

// ─── Biometrics ─────────────────────────────────────────────

function BiometricsSubPage({ onBack: _onBack }: { onBack: () => void }) {
    const queryClient = useQueryClient();
    const { data: settingsData } = useQuery({
        queryKey: ['user-settings'],
        queryFn: async () => {
            const res = await fetch('/api/settings/update-vdot');
            if (!res.ok) throw new Error('Failed to fetch settings');
            return res.json();
        },
        refetchOnWindowFocus: false,
    });

    const [weight, setWeight] = useState(70);
    const [height, setHeight] = useState(175);
    const [includeCrossTraining, setIncludeCrossTraining] = useState(false);
    const [useImperial, setUseImperial] = useState(false);
    const [healthTrackingEnabled, setHealthTrackingEnabled] = useState(false);
    const [matchToMyWhoosh, setMatchToMyWhoosh] = useState(false);
    const [effectiveVo2maxCorrectionFactor, setEffectiveVo2maxCorrectionFactor] = useState(1.0);
    const [vdotCorrectionFactor, setVdotCorrectionFactor] = useState(1.0);
    const [message, setMessage] = useState('');

    const { data: cyclingData } = useQuery({
        queryKey: ['cycling-settings'],
        queryFn: async () => {
            const res = await fetch('/api/settings/cycling');
            if (!res.ok) throw new Error('Failed to fetch cycling settings');
            return res.json();
        },
        refetchOnWindowFocus: false,
    });

    useEffect(() => {
        if (settingsData) {
            setWeight(settingsData.weight || 70);
            setHeight(settingsData.height || 175);
            if (typeof settingsData.includeCrossTraining === 'boolean') setIncludeCrossTraining(settingsData.includeCrossTraining);
            if (typeof settingsData.useImperial === 'boolean') setUseImperial(settingsData.useImperial);
            if (typeof settingsData.healthTrackingEnabled === 'boolean') setHealthTrackingEnabled(settingsData.healthTrackingEnabled);
            if (typeof settingsData.effectiveVo2maxCorrectionFactor === 'number' && settingsData.effectiveVo2maxCorrectionFactor > 0) {
                setEffectiveVo2maxCorrectionFactor(settingsData.effectiveVo2maxCorrectionFactor);
            }
            if (typeof settingsData.vdotCorrectionFactor === 'number' && settingsData.vdotCorrectionFactor > 0) {
                setVdotCorrectionFactor(settingsData.vdotCorrectionFactor);
            }
        }
    }, [settingsData]);

    const [dashboardLayoutMode, setDashboardLayoutMode] = useState<DashboardStatusLayoutMode>('COMBINED_STRIP');
    const [selectedCyclingMetrics, setSelectedCyclingMetrics] = useState<CyclingDashboardMetricId[]>(DEFAULT_CYCLING_METRICS);
    const [selectedRunningMetrics, setSelectedRunningMetrics] = useState<RunningDashboardMetricId[]>(DEFAULT_RUNNING_METRICS);

    useEffect(() => {
        if (typeof cyclingData?.matchToMyWhoosh === 'boolean') {
            setMatchToMyWhoosh(cyclingData.matchToMyWhoosh);
        }
    }, [cyclingData]);

    useEffect(() => {
        const syncDashboardPrefs = () => {
            setDashboardLayoutMode(readDashboardLayoutMode());
            setSelectedCyclingMetrics(readDashboardCyclingMetrics());
            setSelectedRunningMetrics(readDashboardRunningMetrics());
        };
        syncDashboardPrefs();
        window.addEventListener(EVENT_DASHBOARD_LAYOUT_CHANGE, syncDashboardPrefs);
        window.addEventListener('storage', syncDashboardPrefs);
        return () => {
            window.removeEventListener(EVENT_DASHBOARD_LAYOUT_CHANGE, syncDashboardPrefs);
            window.removeEventListener('storage', syncDashboardPrefs);
        };
    }, []);

    const handleSelectDashboardLayoutMode = (mode: DashboardStatusLayoutMode) => {
        setDashboardLayoutMode(mode);
        try {
            localStorage.setItem(STORAGE_KEY_LAYOUT_MODE, mode);
            window.dispatchEvent(new Event(EVENT_DASHBOARD_LAYOUT_CHANGE));
        } catch {
            // ignore
        }
    };

    const handleToggleDashboardCyclingMetric = (id: CyclingDashboardMetricId) => {
        setSelectedCyclingMetrics((prev) => {
            const next = prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id];
            try {
                localStorage.setItem(STORAGE_KEY_CYCLING_METRICS, JSON.stringify(next));
                window.dispatchEvent(new Event(EVENT_DASHBOARD_LAYOUT_CHANGE));
            } catch {
                // ignore
            }
            return next;
        });
    };

    const handleToggleDashboardRunningMetric = (id: RunningDashboardMetricId) => {
        setSelectedRunningMetrics((prev) => {
            const next = prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id];
            try {
                localStorage.setItem(STORAGE_KEY_RUNNING_METRICS, JSON.stringify(next));
                window.dispatchEvent(new Event(EVENT_DASHBOARD_LAYOUT_CHANGE));
            } catch {
                // ignore
            }
            return next;
        });
    };

    const saveMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/settings/profile', {
                method: 'POST',
                body: JSON.stringify({ weight, height, includeCrossTraining, useImperial }),
                headers: { 'Content-Type': 'application/json' },
            });
            if (!res.ok) throw new Error('Failed to update');
            return res.json();
        },
        onSuccess: () => {
            setMessage('Profile updated!');
            queryClient.invalidateQueries({ queryKey: ['user-settings'] });
            queryClient.invalidateQueries({ queryKey: ['analytics-stats'] });
            setTimeout(() => setMessage(''), 2000);
        },
        onError: () => setMessage('Error updating profile.'),
    });

    const mywhooshToggleMutation = useMutation({
        mutationFn: async (enabled: boolean) => {
            const res = await fetch('/api/settings/cycling', {
                method: 'PUT',
                body: JSON.stringify({ matchToMyWhoosh: enabled }),
                headers: { 'Content-Type': 'application/json' },
            });
            if (!res.ok) throw new Error('Failed to update MyWhoosh setting');
            return res.json();
        },
        onSuccess: () => {
            setMessage('MyWhoosh preference saved!');
            queryClient.invalidateQueries({ queryKey: ['cycling-settings'] });
            setTimeout(() => setMessage(''), 2000);
        },
        onError: () => setMessage('Error saving MyWhoosh setting.'),
    });

    const vdotCorrectionMutation = useMutation({
        mutationFn: async (payload: { manualEffectiveVo2maxFactor?: number; manualFactor?: number; correctionFactor?: number }) => {
            const res = await fetch('/api/settings/vdot-correction', {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' },
            });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to update calibration');
            }
            return res.json();
        },
        onSuccess: () => {
            setMessage('Calibration saved!');
            queryClient.invalidateQueries({ queryKey: ['user-settings'] });
            queryClient.invalidateQueries({ queryKey: ['analytics-stats'] });
            setTimeout(() => setMessage(''), 2000);
        },
        onError: (err: Error) => setMessage(`Error saving calibration: ${err.message}`),
    });

    const healthToggleMutation = useMutation({
        mutationFn: async (enabled: boolean) => {
            const res = await fetch('/api/user/health-settings', {
                method: 'PUT',
                body: JSON.stringify({ healthTrackingEnabled: enabled }),
                headers: { 'Content-Type': 'application/json' },
            });
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        onSuccess: (data) => {
            setHealthTrackingEnabled(data.healthTrackingEnabled);
            queryClient.invalidateQueries({ queryKey: ['user-settings'] });
            setMessage(data.healthTrackingEnabled ? 'Health tracking enabled!' : 'Disabled.');
            setTimeout(() => setMessage(''), 2000);
        },
        onError: () => setMessage('Error updating health settings.'),
    });

    return (
        <div className="p-5 space-y-5">
            <h3 className="text-lg font-bold text-foreground">Biometrics</h3>

            <div className="grid grid-cols-2 gap-4">
                <Input
                    label={useImperial ? 'Weight (lbs)' : 'Weight (kg)'}
                    id="weight"
                    type="number"
                    value={weight}
                    onChange={e => setWeight(parseInt(e.target.value) || 70)}
                    min="30"
                    max="200"
                    placeholder="70"
                />
                <Input
                    label={useImperial ? 'Height (in)' : 'Height (cm)'}
                    id="height"
                    type="number"
                    value={height}
                    onChange={e => setHeight(parseInt(e.target.value) || 175)}
                    min="100"
                    max="250"
                    placeholder="175"
                />
            </div>

            <div className="space-y-3 pt-2 border-t border-line">
                <h4 className="text-xs text-accent-orange font-semibold">Marathon Shape</h4>
                <div className="flex items-center justify-between p-3 rounded-md bg-surface border border-line">
                    <div>
                        <p className="text-sm text-foreground">Include Cross-Training</p>
                        <p className="text-[10px] text-foreground-muted">Count cycling, swimming towards shape</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIncludeCrossTraining(!includeCrossTraining)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${includeCrossTraining ? 'bg-accent-orange' : 'bg-line-strong'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${includeCrossTraining ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-line">
                <h4 className="text-xs text-accent-orange font-semibold">Running Fitness · Race Predictions</h4>

                <div className="p-3 rounded-md bg-surface border border-line space-y-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-foreground">Effective VO2max Correction Factor</p>
                            <p className="text-[10px] text-foreground-muted">Scales HR-based aerobic fitness for race predictions</p>
                        </div>
                        <span className="text-sm font-mono tabular-nums text-foreground shrink-0">{effectiveVo2maxCorrectionFactor.toFixed(2)}x</span>
                    </div>
                    <input
                        type="range"
                        min="0.85"
                        max="1.15"
                        step="0.01"
                        value={effectiveVo2maxCorrectionFactor}
                        onChange={e => setEffectiveVo2maxCorrectionFactor(parseFloat(e.target.value))}
                        className="w-full accent-accent-orange"
                        aria-label="Effective VO2max Correction Factor"
                    />
                    <div className="flex items-center justify-between gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setEffectiveVo2maxCorrectionFactor(1.0);
                                vdotCorrectionMutation.mutate({ manualEffectiveVo2maxFactor: 1.0 });
                            }}
                            disabled={vdotCorrectionMutation.isPending}
                            className="text-xs text-foreground-muted hover:text-foreground underline disabled:opacity-50"
                        >
                            Reset to 1.00x
                        </button>
                        <button
                            type="button"
                            onClick={() => vdotCorrectionMutation.mutate({ manualEffectiveVo2maxFactor: effectiveVo2maxCorrectionFactor })}
                            disabled={vdotCorrectionMutation.isPending}
                            className="px-3 py-1.5 rounded-md bg-accent-blue text-white text-xs font-medium disabled:opacity-50"
                        >
                            {vdotCorrectionMutation.isPending ? 'Saving...' : 'Save Factor'}
                        </button>
                    </div>
                </div>

                <div className="p-3 rounded-md bg-surface border border-line space-y-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-foreground">Training Pace Adjustment</p>
                            <p className="text-[10px] text-foreground-muted">Scales best-effort VDOT for training paces</p>
                        </div>
                        <span className="text-sm font-mono tabular-nums text-foreground shrink-0">{vdotCorrectionFactor.toFixed(2)}x</span>
                    </div>
                    <input
                        type="range"
                        min="0.75"
                        max="1.25"
                        step="0.01"
                        value={vdotCorrectionFactor}
                        onChange={e => setVdotCorrectionFactor(parseFloat(e.target.value))}
                        className="w-full accent-accent-orange"
                        aria-label="Training Pace Adjustment"
                    />
                    <div className="flex items-center justify-between gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setVdotCorrectionFactor(1.0);
                                vdotCorrectionMutation.mutate({ manualFactor: 1.0, correctionFactor: 1.0 });
                            }}
                            disabled={vdotCorrectionMutation.isPending}
                            className="text-xs text-foreground-muted hover:text-foreground underline disabled:opacity-50"
                        >
                            Reset to 1.00x
                        </button>
                        <button
                            type="button"
                            onClick={() => vdotCorrectionMutation.mutate({ manualFactor: vdotCorrectionFactor, correctionFactor: vdotCorrectionFactor })}
                            disabled={vdotCorrectionMutation.isPending}
                            className="px-3 py-1.5 rounded-md bg-accent-blue text-white text-xs font-medium disabled:opacity-50"
                        >
                            {vdotCorrectionMutation.isPending ? 'Saving...' : 'Save Factor'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-line">
                <div className="flex items-center justify-between">
                    <h4 className="text-xs text-accent-cyan font-semibold">Dashboard Status Layout &amp; Cycling / Running Metrics</h4>
                    <span className="text-[10px] font-mono text-accent-cyan bg-accent-cyan/10 px-2 py-0.5 rounded border border-accent-cyan/30">
                        Live Preview
                    </span>
                </div>

                {/* 4 Layout Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {DASHBOARD_LAYOUT_MODE_OPTIONS.map((opt) => {
                        const active = dashboardLayoutMode === opt.id;
                        return (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => handleSelectDashboardLayoutMode(opt.id)}
                                className={`p-2.5 rounded-md border text-left transition-all ${
                                    active
                                        ? 'border-accent-cyan bg-accent-cyan/10 text-foreground'
                                        : 'border-line bg-surface text-foreground-muted hover:text-foreground'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-1">
                                    <span className="text-xs font-semibold text-foreground">{opt.badge}</span>
                                    {active && <span className="text-[10px] font-mono text-accent-cyan">Active</span>}
                                </div>
                                <p className="text-[11px] font-medium text-foreground mt-0.5">{opt.title}</p>
                                <p className="text-[10px] text-foreground-muted mt-0.5 leading-snug">{opt.description}</p>
                            </button>
                        );
                    })}
                </div>

                {/* Metric Toggles */}
                <div className="p-3 rounded-md bg-surface border border-line space-y-2.5">
                    <p className="text-[11px] font-semibold text-accent-cyan">Cycling Metrics to Show</p>
                    <div className="grid grid-cols-2 gap-1.5">
                        {CYCLING_METRIC_OPTIONS.map((opt) => {
                            const checked = selectedCyclingMetrics.includes(opt.id);
                            return (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => handleToggleDashboardCyclingMetric(opt.id)}
                                    className={`flex items-center justify-between px-2.5 py-1.5 rounded text-left text-[11px] border transition-colors ${
                                        checked
                                            ? 'bg-accent-cyan/10 border-accent-cyan/40 text-foreground font-medium'
                                            : 'bg-background-tertiary border-line text-foreground-muted hover:text-foreground'
                                    }`}
                                >
                                    <span className="truncate pr-1">{opt.shortLabel} ({opt.unit})</span>
                                    <span className={`text-[10px] font-mono ${checked ? 'text-accent-cyan' : 'text-foreground-muted'}`}>
                                        {checked ? 'ON' : 'OFF'}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <p className="text-[11px] font-semibold text-workout-recovery pt-1">Running Card Extra Metrics (Dual Sport Cards Mode)</p>
                    <div className="grid grid-cols-2 gap-1.5">
                        {RUNNING_METRIC_OPTIONS.map((opt) => {
                            const checked = selectedRunningMetrics.includes(opt.id);
                            return (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => handleToggleDashboardRunningMetric(opt.id)}
                                    className={`flex items-center justify-between px-2.5 py-1.5 rounded text-left text-[11px] border transition-colors ${
                                        checked
                                            ? 'bg-workout-recovery/10 border-workout-recovery/40 text-foreground font-medium'
                                            : 'bg-background-tertiary border-line text-foreground-muted hover:text-foreground'
                                    }`}
                                >
                                    <span className="truncate pr-1">{opt.shortLabel} ({opt.unit})</span>
                                    <span className={`text-[10px] font-mono ${checked ? 'text-workout-recovery' : 'text-foreground-muted'}`}>
                                        {checked ? 'ON' : 'OFF'}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Live Interactive Preview inside Settings */}
                <div className="p-3 rounded-md bg-background-tertiary/80 border border-accent-cyan/30 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-accent-cyan">
                            Live Preview — {DASHBOARD_LAYOUT_MODE_OPTIONS.find((m) => m.id === dashboardLayoutMode)?.title}
                        </span>
                    </div>

                    {dashboardLayoutMode === 'DUAL_BOXES' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {/* Preview Card 1: Running */}
                            <div className="p-3 rounded-md bg-surface border border-line space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-foreground">Running Status</span>
                                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-workout-recovery/15 text-workout-recovery">Running Card</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-1.5 rounded bg-background-secondary">
                                        <span className="block text-[9px] text-foreground-muted">Shape</span>
                                        <span className="text-xs font-mono font-bold text-foreground">84%</span>
                                    </div>
                                    <div className="p-1.5 rounded bg-background-secondary">
                                        <span className="block text-[9px] text-foreground-muted">Running VO2max</span>
                                        <span className="text-xs font-mono font-bold text-accent-cyan">53.2</span>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {RUNNING_METRIC_OPTIONS.filter((o) => selectedRunningMetrics.includes(o.id)).map((o) => (
                                        <span key={o.id} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-background-secondary border border-line/60 text-foreground-muted">
                                            {o.shortLabel}
                                        </span>
                                    ))}
                                </div>
                                <div className="text-[9px] font-mono text-foreground-muted pt-1 border-t border-line/60">
                                    Run ATL · Run CTL · Run TSB · Weekly TRIMP
                                </div>
                            </div>

                            {/* Preview Card 2: Cycling */}
                            <div className="p-3 rounded-md bg-surface border border-line space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-foreground">Cycling Status</span>
                                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-accent-cyan/15 text-accent-cyan">Cycling Card</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-1.5 rounded bg-background-secondary">
                                        <span className="block text-[9px] text-foreground-muted">Active FTP</span>
                                        <span className="text-xs font-mono font-bold text-accent-orange">255W (3.40 W/kg)</span>
                                    </div>
                                    <div className="p-1.5 rounded bg-background-secondary">
                                        <span className="block text-[9px] text-foreground-muted">Cycling VO2max</span>
                                        <span className="text-xs font-mono font-bold text-accent-purple">52.1</span>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {CYCLING_METRIC_OPTIONS.filter((o) => selectedCyclingMetrics.includes(o.id)).map((o) => (
                                        <span key={o.id} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-background-secondary border border-line/60 text-accent-cyan">
                                            {o.shortLabel}
                                        </span>
                                    ))}
                                </div>
                                <div className="text-[9px] font-mono text-foreground-muted pt-1 border-t border-line/60">
                                    Bike ATL · Bike CTL · Bike TSB · Weekly Bike TSS
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-3 rounded-md bg-surface border border-line space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-foreground">
                                    {dashboardLayoutMode === 'CYCLING_HERO'
                                        ? 'Cycling Status — Cycling Cockpit'
                                        : dashboardLayoutMode === 'COMBINED_STRIP'
                                        ? 'Training Status — Hybrid Overview'
                                        : 'Training Status — Classic Running'}
                                </span>
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-accent-cyan/15 text-accent-cyan">Single Card</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="p-1.5 rounded bg-background-secondary">
                                    <span className="block text-[9px] text-foreground-muted">
                                        {dashboardLayoutMode === 'CYCLING_HERO' ? 'Active FTP' : 'Shape'}
                                    </span>
                                    <span className="text-xs font-mono font-bold text-foreground">
                                        {dashboardLayoutMode === 'CYCLING_HERO' ? '255W · 3.40 W/kg' : '84%'}
                                    </span>
                                </div>
                                <div className="p-1.5 rounded bg-background-secondary">
                                    <span className="block text-[9px] text-foreground-muted">
                                        {dashboardLayoutMode === 'CYCLING_HERO' ? 'Cycling VO2max' : 'Aerobic Fitness (VO2max)'}
                                    </span>
                                    <span className="text-xs font-mono font-bold text-accent-cyan">
                                        {dashboardLayoutMode === 'CYCLING_HERO' ? '52.1 mL/kg' : '53.2 (Run VDOT · Bike VO2)'}
                                    </span>
                                </div>
                            </div>
                            {dashboardLayoutMode !== 'CLASSIC_RUN' && (
                                <div className="flex flex-wrap gap-1 pt-1">
                                    {CYCLING_METRIC_OPTIONS.filter((o) => selectedCyclingMetrics.includes(o.id)).map((o) => (
                                        <span key={o.id} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-background-secondary border border-line/60 text-accent-cyan">
                                            {o.shortLabel} ({o.unit})
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-line">
                <h4 className="text-xs text-accent-orange font-semibold">Display</h4>
                <div className="flex items-center justify-between p-3 rounded-md bg-surface border border-line">
                    <div>
                        <p className="text-sm text-foreground">Use Miles</p>
                        <p className="text-[10px] text-foreground-muted">Distance and pace in miles</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setUseImperial(!useImperial)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${useImperial ? 'bg-accent-orange' : 'bg-line-strong'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useImperial ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-line">
                <h4 className="text-xs text-positive font-semibold">Health Tracking</h4>
                <div className="flex items-center justify-between p-3 rounded-md bg-surface border border-line">
                    <div>
                        <p className="text-sm text-foreground">Enable Health Features</p>
                        <p className="text-[10px] text-foreground-muted">Track weight, steps, supplements</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => healthToggleMutation.mutate(!healthTrackingEnabled)}
                        disabled={healthToggleMutation.isPending}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${healthTrackingEnabled ? 'bg-positive' : 'bg-line-strong'} ${healthToggleMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${healthTrackingEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
            </div>

            {message && (
                <div className={`p-3 rounded-lg text-sm ${message.includes('Error') ? 'bg-negative/10 text-negative' : 'bg-positive/10 text-positive'}`}>
                    {message}
                </div>
            )}

            <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
                {saveMutation.isPending ? <Save className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                Save Profile
            </button>
        </div>
    );
}

// ─── AI Coach ───────────────────────────────────────────────

function AiCoachSubPage({ onBack }: { onBack: () => void }) {
    const [isOpen, setIsOpen] = useState(true);

    useEffect(() => {
        setIsOpen(true);
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        setTimeout(onBack, 150);
    };

    return <AiSettingsModal isOpen={isOpen} onClose={handleClose} />;
}

// ─── Connections ────────────────────────────────────────────

function ConnectionsSubPage({ onBack: _onBack }: { onBack: () => void }) {
    const queryClient = useQueryClient();
    const [message, setMessage] = useState('');
    const [showReauthPrompt, setShowReauthPrompt] = useState(false);
    const [copiedMcpUrl, setCopiedMcpUrl] = useState(false);
    const [showMcpDocs, setShowMcpDocs] = useState(false);

    const [hrZone1Max, setHrZone1Max] = useState(130);
    const [hrZone2Max, setHrZone2Max] = useState(148);
    const [hrZone3Max, setHrZone3Max] = useState(160);
    const [hrZone4Max, setHrZone4Max] = useState(170);
    const [hrZone5Max, setHrZone5Max] = useState(178);
    const [hrZone6Max, setHrZone6Max] = useState(187);

    const mcpEndpointUrl = typeof window !== 'undefined' ? `${window.location.origin}/mcp` : 'https://runflow.schuelken.uk/mcp';

    const { data: settingsData } = useQuery({
        queryKey: ['user-settings'],
        queryFn: async () => {
            const res = await fetch('/api/settings/update-vdot');
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        refetchOnWindowFocus: false,
    });

    const { data: mcpTokensData, refetch: refetchMcpTokens, isLoading: isLoadingMcpTokens } = useQuery({
        queryKey: ['mcp-tokens'],
        queryFn: async () => {
            const res = await fetch('/api/settings/mcp-tokens');
            if (!res.ok) throw new Error('Failed to load MCP tokens');
            return res.json();
        },
        refetchOnWindowFocus: false,
    });

    const revokeMcpTokenMutation = useMutation({
        mutationFn: async (tokenId?: string) => {
            const url = tokenId ? `/api/settings/mcp-tokens?tokenId=${encodeURIComponent(tokenId)}` : '/api/settings/mcp-tokens';
            const res = await fetch(url, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to revoke MCP client');
            return res.json();
        },
        onSuccess: (_data, tokenId) => {
            setMessage(tokenId ? 'Disconnected MCP client.' : 'Revoked all connected MCP clients.');
            refetchMcpTokens();
        },
        onError: () => setMessage('Error revoking MCP client token.'),
    });

    useEffect(() => {
        if (settingsData) {
            if (settingsData.hrZone1Max) setHrZone1Max(settingsData.hrZone1Max);
            if (settingsData.hrZone2Max) setHrZone2Max(settingsData.hrZone2Max);
            if (settingsData.hrZone3Max) setHrZone3Max(settingsData.hrZone3Max);
            if (settingsData.hrZone4Max) setHrZone4Max(settingsData.hrZone4Max);
            if (settingsData.hrZone5Max) setHrZone5Max(settingsData.hrZone5Max);
            if (settingsData.hrZone6Max) setHrZone6Max(settingsData.hrZone6Max);
        }
    }, [settingsData]);

    const resyncMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/sync', {
                method: 'POST',
                body: JSON.stringify({ range: 'ALL' }),
                headers: { 'Content-Type': 'application/json' },
            });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to resync');
            }
            return res.json();
        },
        onSuccess: () => {
            setMessage('Full resync started! May take a few minutes.');
            setShowReauthPrompt(false);
            queryClient.invalidateQueries({ queryKey: ['analytics-stats'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
        },
        onError: (err) => {
            const isAuthError = err.message.toLowerCase().includes('authenticate') ||
                err.message.toLowerCase().includes('token') ||
                err.message.includes('400') || err.message.includes('401');
            if (isAuthError) {
                setMessage('Connection lost. Reconnect Strava.');
                setShowReauthPrompt(true);
            } else {
                setMessage(`Resync failed: ${err.message}`);
                setShowReauthPrompt(false);
            }
        },
    });

    const healthConnectSyncMutation = useMutation({
        mutationFn: async () => {
            const permitted = await requestHealthPermissions();
            if (!permitted) throw new Error('Health Connect permissions not granted');
            const result = await syncHealthData(90, {
                z1: hrZone1Max, z2: hrZone2Max, z3: hrZone3Max,
                z4: hrZone4Max, z5: hrZone5Max, z6: hrZone6Max,
            });
            return result;
        },
        onSuccess: (result) => {
            setMessage(result.synced > 0 ? `Synced ${result.synced} activities!` : 'No new activities found.');
            queryClient.invalidateQueries({ queryKey: ['analytics-stats'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
            queryClient.invalidateQueries({ queryKey: ['activities'] });
        },
        onError: (err) => setMessage(`Health Connect failed: ${err.message}`),
    });

    const activeMcpTokens: Array<{
        id: string;
        clientId: string;
        clientName?: string;
        scope: string;
        createdAt: string;
        lastUsedAt?: string | null;
        expiresAt: string;
    }> = mcpTokensData?.tokens || [];

    return (
        <div className="p-5 space-y-5">
            <h3 className="text-lg font-bold text-foreground">Connections</h3>

            <div className="space-y-3">
                <h4 className="text-xs text-accent-orange font-semibold">Strava</h4>
                <button
                    onClick={() => resyncMutation.mutate()}
                    disabled={resyncMutation.isPending}
                    className="w-full py-3 border border-line text-foreground rounded-md hover:bg-surface-hover transition-colors text-sm flex items-center justify-center gap-2"
                >
                    <RefreshCw className={`w-4 h-4 ${resyncMutation.isPending ? 'animate-spin' : ''}`} />
                    {resyncMutation.isPending ? 'Syncing...' : 'Sync from Strava'}
                </button>
                <button
                    onClick={() => signIn('strava', { callbackUrl: window.location.href })}
                    className="w-full py-3 border border-accent-orange/30 text-accent-orange rounded-md hover:bg-accent-orange/10 transition-colors text-sm flex items-center justify-center gap-2"
                >
                    <Link2 className="w-4 h-4" />
                    Reconnect Strava
                </button>
                <p className="text-[10px] text-foreground-muted">Re-authenticate if sync is failing</p>
            </div>

            <div className="space-y-3 pt-2 border-t border-line">
                <h4 className="text-xs text-positive font-semibold">Health Connect</h4>
                <button
                    onClick={() => healthConnectSyncMutation.mutate()}
                    disabled={healthConnectSyncMutation.isPending}
                    className="w-full py-3 border border-positive/30 text-positive rounded-md hover:bg-positive/10 transition-colors text-sm flex items-center justify-center gap-2"
                >
                    <RefreshCw className={`w-4 h-4 ${healthConnectSyncMutation.isPending ? 'animate-spin' : ''}`} />
                    {healthConnectSyncMutation.isPending ? 'Syncing...' : 'Sync from Health Connect'}
                </button>
            </div>

            {/* MCP Server Documentation & Connected AI Clients Organization */}
            <div className="space-y-3 pt-3 border-t border-line">
                <div className="flex items-center justify-between">
                    <h4 className="text-xs text-accent-cyan font-semibold flex items-center gap-1.5">
                        <Bot className="w-3.5 h-3.5" />
                        MCP Server & AI Clients
                    </h4>
                    <button
                        type="button"
                        onClick={() => setShowMcpDocs(!showMcpDocs)}
                        className="text-[11px] text-accent-cyan hover:underline font-medium"
                    >
                        {showMcpDocs ? 'Hide Setup Guide' : 'MCP Setup Guide'}
                    </button>
                </div>

                <div className="p-3 bg-surface border border-line rounded-md space-y-2">
                    <label className="block text-[10px] uppercase tracking-wider text-foreground-muted font-semibold">
                        Remote MCP Endpoint URL
                    </label>
                    <div className="flex items-center gap-2">
                        <code className="flex-1 bg-background-secondary border border-line rounded px-2.5 py-1.5 text-xs font-mono text-foreground truncate">
                            {mcpEndpointUrl}
                        </code>
                        <button
                            type="button"
                            onClick={() => {
                                navigator.clipboard.writeText(mcpEndpointUrl);
                                setCopiedMcpUrl(true);
                                setTimeout(() => setCopiedMcpUrl(false), 2000);
                            }}
                            className="px-2.5 py-1.5 bg-accent-cyan/15 text-accent-cyan hover:bg-accent-cyan/25 rounded text-xs font-medium flex items-center gap-1 shrink-0 transition-colors"
                        >
                            {copiedMcpUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedMcpUrl ? 'Copied' : 'Copy'}
                        </button>
                    </div>
                    <p className="text-[10px] text-foreground-muted leading-relaxed">
                        Connect Claude, Cursor, Windsurf, ChatGPT, or Gemini to inspect your training readiness, activities, and manage workouts.
                    </p>
                </div>

                {showMcpDocs && (
                    <div className="p-3.5 bg-background-tertiary border border-line rounded-md space-y-3 text-xs">
                        <div>
                            <p className="font-semibold text-foreground mb-1">1. OAuth 2.1 Interactive Login (Full Read + Write)</p>
                            <p className="text-[11px] text-foreground-muted leading-relaxed">
                                In Claude Desktop/Web, Cursor, or ChatGPT Connectors, add a Remote MCP Server with URL <code className="text-accent-cyan font-mono">{mcpEndpointUrl}</code>. RunFlow supports OAuth 2.1 Dynamic Client Registration + PKCE—your browser will open a consent screen to authorize full plan and workout tools (<code className="font-mono">create_planned_workout</code>, <code className="font-mono">update_planned_workout</code>, <code className="font-mono">complete_workout</code>, <code className="font-mono">swap_workout_days</code>, <code className="font-mono">log_daily_nutrition</code>).
                            </p>
                        </div>
                        <div className="border-t border-line pt-2.5">
                            <p className="font-semibold text-foreground mb-1">2. Headless API Key (Read-Only)</p>
                            <p className="text-[11px] text-foreground-muted leading-relaxed mb-1.5">
                                For scripts or CLI MCP hosts, generate a personal <code className="font-mono">rf_...</code> key in <strong>App Settings → API Access</strong> and pass it as a Bearer token:
                            </p>
                            <pre className="p-2 bg-background border border-line rounded text-[10px] font-mono text-foreground-secondary overflow-x-auto">
{`{
  "mcpServers": {
    "runflow": {
      "url": "${mcpEndpointUrl}",
      "headers": {
        "Authorization": "Bearer rf_YOUR_API_KEY"
      }
    }
  }
}`}
                            </pre>
                        </div>
                    </div>
                )}

                {/* Connected MCP OAuth Clients Organization */}
                <div className="p-3 bg-surface border border-line rounded-md space-y-2.5">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">
                            Connected MCP Clients ({activeMcpTokens.length})
                        </span>
                        {activeMcpTokens.length > 1 && (
                            <button
                                type="button"
                                onClick={() => revokeMcpTokenMutation.mutate(undefined)}
                                disabled={revokeMcpTokenMutation.isPending}
                                className="text-[11px] text-negative hover:underline font-medium"
                            >
                                Revoke All
                            </button>
                        )}
                    </div>

                    {isLoadingMcpTokens ? (
                        <p className="text-[11px] text-foreground-muted">Loading connected clients...</p>
                    ) : activeMcpTokens.length === 0 ? (
                        <p className="text-[11px] text-foreground-muted">
                            No active OAuth MCP clients connected. Connect an AI client to <code className="font-mono">{mcpEndpointUrl}</code> to see it here.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {activeMcpTokens.map((tok) => (
                                <div
                                    key={tok.id}
                                    className="flex items-center justify-between gap-2 p-2 rounded bg-background-secondary border border-line"
                                >
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs font-semibold text-foreground truncate">
                                                {tok.clientName || tok.clientId}
                                            </span>
                                            <span className="px-1.5 py-0.5 rounded bg-accent-cyan/15 text-accent-cyan text-[9px] font-mono">
                                                {tok.scope}
                                            </span>
                                        </div>
                                        <div className="text-[10px] text-foreground-muted">
                                            Connected {new Date(tok.createdAt).toLocaleDateString()}
                                            {tok.lastUsedAt ? ` • Last used ${new Date(tok.lastUsedAt).toLocaleDateString()}` : ''}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => revokeMcpTokenMutation.mutate(tok.id)}
                                        disabled={revokeMcpTokenMutation.isPending}
                                        className="px-2 py-1 rounded border border-negative/30 text-negative hover:bg-negative/10 text-[11px] font-medium shrink-0 transition-colors"
                                    >
                                        Revoke
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {message && (
                <div className={`p-3 rounded-lg text-sm flex flex-col gap-2 ${message.includes('Error') || message.includes('failed') || message.includes('lost') ? 'bg-negative/10 text-negative' : 'bg-positive/10 text-positive'}`}>
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {message}
                    </div>
                    {showReauthPrompt && (
                        <button
                            onClick={() => signIn('strava', { callbackUrl: window.location.href })}
                            className="mt-1 w-full py-2 bg-negative/15 hover:bg-negative/25 text-negative rounded-md text-xs flex items-center justify-center gap-2 transition-colors font-semibold"
                        >
                            <Link2 className="w-3 h-3" />
                            Reconnect Now
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Reminders ──────────────────────────────────────────────

function RemindersSubPage({ onBack }: { onBack: () => void }) {
    const [isOpen, setIsOpen] = useState(true);

    useEffect(() => {
        setIsOpen(true);
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        setTimeout(onBack, 150);
    };

    return <ReminderSettingsModal isOpen={isOpen} onClose={handleClose} />;
}

// ─── App Settings (Units, API, Privacy, Export) ─────────────

function AppSettingsSubPage({ onBack: _onBack }: { onBack: () => void }) {
    const [section, setSection] = useState<'main' | 'api' | 'privacy' | 'danger'>('main');
    const [healthTrackingEnabled, setHealthTrackingEnabled] = useState(false);
    const [dashboardLayoutMode, setDashboardLayoutMode] = useState<DashboardStatusLayoutMode>('COMBINED_STRIP');
    const [selectedCyclingMetrics, setSelectedCyclingMetrics] = useState<CyclingDashboardMetricId[]>(DEFAULT_CYCLING_METRICS);
    const [selectedRunningMetrics, setSelectedRunningMetrics] = useState<RunningDashboardMetricId[]>(DEFAULT_RUNNING_METRICS);

    const { data: settingsData } = useQuery({
        queryKey: ['user-settings'],
        queryFn: async () => {
            const res = await fetch('/api/settings/update-vdot');
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        refetchOnWindowFocus: false,
    });

    useEffect(() => {
        if (settingsData?.healthTrackingEnabled !== undefined) {
            setHealthTrackingEnabled(settingsData.healthTrackingEnabled);
        }
    }, [settingsData]);

    useEffect(() => {
        const syncDashboardPrefs = () => {
            setDashboardLayoutMode(readDashboardLayoutMode());
            setSelectedCyclingMetrics(readDashboardCyclingMetrics());
            setSelectedRunningMetrics(readDashboardRunningMetrics());
        };
        syncDashboardPrefs();
        window.addEventListener(EVENT_DASHBOARD_LAYOUT_CHANGE, syncDashboardPrefs);
        window.addEventListener('storage', syncDashboardPrefs);
        return () => {
            window.removeEventListener(EVENT_DASHBOARD_LAYOUT_CHANGE, syncDashboardPrefs);
            window.removeEventListener('storage', syncDashboardPrefs);
        };
    }, []);

    const handleSelectDashboardLayoutMode = (mode: DashboardStatusLayoutMode) => {
        setDashboardLayoutMode(mode);
        try {
            localStorage.setItem(STORAGE_KEY_LAYOUT_MODE, mode);
            window.dispatchEvent(new Event(EVENT_DASHBOARD_LAYOUT_CHANGE));
        } catch {
            // ignore
        }
    };

    const handleToggleDashboardCyclingMetric = (id: CyclingDashboardMetricId) => {
        setSelectedCyclingMetrics((prev) => {
            const next = prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id];
            try {
                localStorage.setItem(STORAGE_KEY_CYCLING_METRICS, JSON.stringify(next));
                window.dispatchEvent(new Event(EVENT_DASHBOARD_LAYOUT_CHANGE));
            } catch {
                // ignore
            }
            return next;
        });
    };

    const handleToggleDashboardRunningMetric = (id: RunningDashboardMetricId) => {
        setSelectedRunningMetrics((prev) => {
            const next = prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id];
            try {
                localStorage.setItem(STORAGE_KEY_RUNNING_METRICS, JSON.stringify(next));
                window.dispatchEvent(new Event(EVENT_DASHBOARD_LAYOUT_CHANGE));
            } catch {
                // ignore
            }
            return next;
        });
    };

    if (section === 'api') return <ApiSection onBack={() => setSection('main')} />;
    if (section === 'privacy') return <PrivacySection healthTrackingEnabled={healthTrackingEnabled} onBack={() => setSection('main')} />;
    if (section === 'danger') return <DangerSection onBack={() => setSection('main')} />;

    return (
        <div className="p-5 space-y-5">
            <h3 className="text-lg font-bold text-foreground">App Settings</h3>

            {/* Home Dashboard Layout & Metrics Customizer */}
            <div className="space-y-3 p-3.5 rounded-md bg-surface border border-line">
                <div className="flex items-center justify-between">
                    <h4 className="text-xs text-accent-cyan font-semibold">Home Dashboard Status Layout &amp; Metrics</h4>
                    <span className="text-[10px] font-mono text-accent-cyan bg-accent-cyan/10 px-2 py-0.5 rounded border border-accent-cyan/30">
                        Live Preview
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {DASHBOARD_LAYOUT_MODE_OPTIONS.map((opt) => {
                        const active = dashboardLayoutMode === opt.id;
                        return (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => handleSelectDashboardLayoutMode(opt.id)}
                                className={`p-2.5 rounded-md border text-left transition-all ${
                                    active
                                        ? 'border-accent-cyan bg-accent-cyan/10 text-foreground'
                                        : 'border-line bg-background-secondary text-foreground-muted hover:text-foreground'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-1">
                                    <span className="text-xs font-semibold text-foreground">{opt.badge}</span>
                                    {active && <span className="text-[10px] font-mono text-accent-cyan">Active</span>}
                                </div>
                                <p className="text-[11px] font-medium text-foreground mt-0.5">{opt.title}</p>
                                <p className="text-[10px] text-foreground-muted mt-0.5 leading-snug">{opt.description}</p>
                            </button>
                        );
                    })}
                </div>

                <div className="p-2.5 rounded-md bg-background-secondary border border-line space-y-2">
                    <p className="text-[11px] font-semibold text-accent-cyan">Cycling Metrics to Show</p>
                    <div className="grid grid-cols-2 gap-1.5">
                        {CYCLING_METRIC_OPTIONS.map((opt) => {
                            const checked = selectedCyclingMetrics.includes(opt.id);
                            return (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => handleToggleDashboardCyclingMetric(opt.id)}
                                    className={`flex items-center justify-between px-2 py-1 rounded text-left text-[10px] border transition-colors ${
                                        checked
                                            ? 'bg-accent-cyan/10 border-accent-cyan/40 text-foreground font-medium'
                                            : 'bg-background-tertiary border-line text-foreground-muted hover:text-foreground'
                                    }`}
                                >
                                    <span className="truncate pr-1">{opt.shortLabel} ({opt.unit})</span>
                                    <span className={`text-[9px] font-mono ${checked ? 'text-accent-cyan' : 'text-foreground-muted'}`}>
                                        {checked ? 'ON' : 'OFF'}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <p className="text-[11px] font-semibold text-workout-recovery pt-1">Running Card Extra Metrics (Dual Sport Cards Mode)</p>
                    <div className="grid grid-cols-2 gap-1.5">
                        {RUNNING_METRIC_OPTIONS.map((opt) => {
                            const checked = selectedRunningMetrics.includes(opt.id);
                            return (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => handleToggleDashboardRunningMetric(opt.id)}
                                    className={`flex items-center justify-between px-2 py-1 rounded text-left text-[10px] border transition-colors ${
                                        checked
                                            ? 'bg-workout-recovery/10 border-workout-recovery/40 text-foreground font-medium'
                                            : 'bg-background-tertiary border-line text-foreground-muted hover:text-foreground'
                                    }`}
                                >
                                    <span className="truncate pr-1">{opt.shortLabel} ({opt.unit})</span>
                                    <span className={`text-[9px] font-mono ${checked ? 'text-workout-recovery' : 'text-foreground-muted'}`}>
                                        {checked ? 'ON' : 'OFF'}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Live Interactive Preview */}
                <div className="p-2.5 rounded-md bg-background-tertiary/80 border border-accent-cyan/30 space-y-2">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-accent-cyan">
                        Live Preview — {DASHBOARD_LAYOUT_MODE_OPTIONS.find((m) => m.id === dashboardLayoutMode)?.title}
                    </span>
                    {dashboardLayoutMode === 'DUAL_BOXES' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="p-2.5 rounded bg-surface border border-line space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-semibold text-foreground">Running Status</span>
                                    <span className="text-[9px] font-mono text-workout-recovery">Running Card</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {RUNNING_METRIC_OPTIONS.filter((o) => selectedRunningMetrics.includes(o.id)).map((o) => (
                                        <span key={o.id} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-background-secondary border border-line/60 text-foreground-muted">
                                            {o.shortLabel}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="p-2.5 rounded bg-surface border border-line space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-semibold text-foreground">Cycling Status</span>
                                    <span className="text-[9px] font-mono text-accent-cyan">Cycling Card</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {CYCLING_METRIC_OPTIONS.filter((o) => selectedCyclingMetrics.includes(o.id)).map((o) => (
                                        <span key={o.id} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-background-secondary border border-line/60 text-accent-cyan">
                                            {o.shortLabel}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-2.5 rounded bg-surface border border-line space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-semibold text-foreground">
                                    {dashboardLayoutMode === 'CYCLING_HERO'
                                        ? 'Cycling Status — Cycling Cockpit'
                                        : dashboardLayoutMode === 'COMBINED_STRIP'
                                        ? 'Training Status — Hybrid Overview'
                                        : 'Training Status — Classic Running'}
                                </span>
                                <span className="text-[9px] font-mono text-accent-cyan">Single Card</span>
                            </div>
                            {dashboardLayoutMode !== 'CLASSIC_RUN' && (
                                <div className="flex flex-wrap gap-1">
                                    {CYCLING_METRIC_OPTIONS.filter((o) => selectedCyclingMetrics.includes(o.id)).map((o) => (
                                        <span key={o.id} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-background-secondary border border-line/60 text-accent-cyan">
                                            {o.shortLabel} ({o.unit})
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-1.5">
                <button
                    onClick={() => setSection('api')}
                    className="w-full flex items-center gap-3 px-3.5 py-3 bg-surface rounded-md transition-colors hover:bg-surface-hover"
                >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-accent-blue/15">
                        <Key className="w-4 h-4 text-accent-blue" />
                    </div>
                    <div className="flex-1 text-left">
                        <div className="text-sm font-medium text-foreground">API Access</div>
                        <div className="text-[11px] text-foreground-muted">Generate & manage read-only API key</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-foreground-muted" />
                </button>
                <button
                    onClick={() => setSection('privacy')}
                    className="w-full flex items-center gap-3 px-3.5 py-3 bg-surface rounded-md transition-colors hover:bg-surface-hover"
                >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-workout-long-run/15">
                        <ShieldCheck className="w-4 h-4 text-workout-long-run" />
                    </div>
                    <div className="flex-1 text-left">
                        <div className="text-sm font-medium text-foreground">Privacy & Consent</div>
                        <div className="text-[11px] text-foreground-muted">Terms, privacy policy, data consent</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-foreground-muted" />
                </button>
                <ExportDataButton />
            </div>

            <div className="border-t border-line pt-4">
                <DangerShortcut />
            </div>
        </div>
    );
}

function ExportDataButton() {
    const [isExporting, setIsExporting] = useState(false);
    const [message, setMessage] = useState('');

    const handleExportData = async () => {
        setIsExporting(true);
        setMessage('');
        try {
            const res = await fetch('/api/user/export');
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to export data');
            }

            const disposition = res.headers.get('Content-Disposition');
            let filename = `runflow-data-export-${new Date().toISOString().split('T')[0]}.json`;
            if (disposition && disposition.indexOf('attachment') !== -1) {
                const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                const matches = filenameRegex.exec(disposition);
                if (matches != null && matches[1]) {
                    filename = matches[1].replace(/['"]/g, '');
                }
            }

            const { Capacitor } = await import('@capacitor/core');
            const isNative = Capacitor.isNativePlatform();

            if (isNative) {
                const { Filesystem, Directory } = await import('@capacitor/filesystem');
                const { Share } = await import('@capacitor/share');
                const jsonText = await res.text();
                const writeResult = await Filesystem.writeFile({
                    path: filename,
                    data: jsonText,
                    directory: Directory.Cache,
                });
                await Share.share({
                    title: 'My RunFlow Data Export',
                    url: writeResult.uri,
                });
            } else {
                const blob = await res.blob();
                const windowUrl = window.URL || window.webkitURL;
                const url = windowUrl.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                windowUrl.revokeObjectURL(url);
                document.body.removeChild(a);
            }

            setMessage('Data exported successfully!');
        } catch (error: any) {
            setMessage(`Export failed: ${error.message}`);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <>
            <button
                onClick={handleExportData}
                disabled={isExporting}
                className="w-full flex items-center gap-3 px-3.5 py-3 bg-surface rounded-md transition-colors hover:bg-surface-hover"
            >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-accent-cyan/15">
                    <Download className={`w-4 h-4 text-accent-cyan ${isExporting ? 'animate-spin' : ''}`} />
                </div>
                <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-foreground">Export Data</div>
                    <div className="text-[11px] text-foreground-muted">{isExporting ? 'Generating export...' : 'Download all your data as JSON'}</div>
                </div>
            </button>
            {message && (
                <p className={`text-xs px-3.5 ${message.includes('failed') ? 'text-negative' : 'text-positive'}`}>{message}</p>
            )}
        </>
    );
}

function DangerShortcut() {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [message, setMessage] = useState('');

    const deleteMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/user/delete', { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete account');
            return res.json();
        },
        onSuccess: async () => {
            // Evict auth-bound SW runtime caches before the sign-out
            // navigation (account deletion is also an auth-state change).
            await evictAuthBoundCaches();
            await signOut({ callbackUrl: '/' });
        },
        onError: () => {
            setMessage('Error deleting account.');
            setIsDeleting(false);
        },
    });

    return (
        <div>
            <h4 className="text-xs text-negative font-medium mb-3">Danger Zone</h4>
            {!showDeleteConfirm ? (
                <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full py-2.5 border border-negative/30 text-negative rounded-md hover:bg-negative/10 transition-colors text-sm flex items-center justify-center gap-2"
                >
                    <Trash2 className="w-4 h-4" />
                    Delete Account
                </button>
            ) : (
                <div className="bg-negative/10 border border-negative/20 rounded-md p-4">
                    <p className="text-negative text-xs mb-4 leading-relaxed">
                        Are you sure? This will permanently delete your account, activities, and goals.
                    </p>
                    <div className="flex gap-3">
                        <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 bg-background-tertiary text-foreground text-xs rounded-md hover:bg-surface-hover">Cancel</button>
                        <button
                            onClick={() => { setIsDeleting(true); deleteMutation.mutate(); }}
                            disabled={isDeleting}
                            className="flex-1 py-2 bg-negative hover:bg-negative/90 text-white text-xs rounded-lg flex items-center justify-center gap-2 font-medium"
                        >
                            {isDeleting ? <AlertCircle className="animate-spin w-3 h-3" /> : <Trash2 className="w-3 h-3" />}
                            {isDeleting ? 'Deleting...' : 'Confirm'}
                        </button>
                    </div>
                </div>
            )}
            {message && <p className="text-xs text-negative mt-2">{message}</p>}
        </div>
    );
}

// ─── API Section ────────────────────────────────────────────

function ApiSection({ onBack }: { onBack: () => void }) {
    const [generatedApiKey, setGeneratedApiKey] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
    const [message, setMessage] = useState('');

    const { data: apiKeyData, refetch: refetchApiKey } = useQuery({
        queryKey: ['api-key'],
        queryFn: async () => {
            const res = await fetch('/api/settings/api-key');
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        refetchOnWindowFocus: false,
    });

    const generateMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/settings/api-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'My API Key' }),
            });
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        onSuccess: (data) => { setGeneratedApiKey(data.apiKey); refetchApiKey(); },
        onError: () => setMessage('Failed to generate API key.'),
    });

    const revokeMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/settings/api-key', { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        onSuccess: () => { setGeneratedApiKey(null); setShowRevokeConfirm(false); refetchApiKey(); setMessage('API key revoked.'); },
        onError: () => setMessage('Failed to revoke.'),
    });

    return (
        <div className="p-5 space-y-5">
            <div className="flex items-center gap-2">
                <button onClick={onBack} className="text-foreground-muted hover:text-foreground"><ChevronLeft className="w-4 h-4" /></button>
                <h3 className="text-lg font-bold text-foreground">API Access</h3>
            </div>

            <p className="text-xs text-foreground-muted">Enable read-only API access for external AI assistants.</p>

            <div className="flex justify-end">
                <Link href="/api-docs" target="_blank" className="text-xs text-accent-blue hover:opacity-80 flex items-center gap-1">
                    API Docs <ExternalLink className="w-3 h-3" />
                </Link>
            </div>

            {generatedApiKey ? (
                <div className="bg-positive/10 border border-positive/20 rounded-md p-4">
                    <p className="text-positive text-xs mb-2 font-medium flex items-center gap-1">
                        <Key className="w-3 h-3" /> Your API Key (copy now):
                    </p>
                    <div className="flex items-center gap-2">
                        <code className="flex-1 bg-background-tertiary px-3 py-2 rounded-md text-xs text-positive font-mono break-all">{generatedApiKey}</code>
                        <button onClick={() => { navigator.clipboard.writeText(generatedApiKey); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="p-2 bg-positive/15 rounded-md hover:bg-positive/25">
                            {copied ? <Check className="w-4 h-4 text-positive" /> : <Copy className="w-4 h-4 text-positive" />}
                        </button>
                    </div>
                </div>
            ) : apiKeyData?.hasKey ? (
                <div className="bg-surface border border-line rounded-md p-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-foreground text-sm">Active API Key</p>
                            <code className="text-xs text-foreground-muted font-mono">{apiKeyData.keyPrefix}</code>
                        </div>
                        {apiKeyData.lastUsedAt && <p className="text-[10px] text-foreground-muted">Last: {new Date(apiKeyData.lastUsedAt).toLocaleDateString()}</p>}
                    </div>
                </div>
            ) : null}

            <div className="space-y-2">
                {!apiKeyData?.hasKey ? (
                    <button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending} className="w-full py-3 border border-accent-blue/30 text-accent-blue rounded-md hover:bg-accent-blue/10 text-sm flex items-center justify-center gap-2">
                        <Key className="w-4 h-4" />
                        {generateMutation.isPending ? 'Generating...' : 'Generate API Key'}
                    </button>
                ) : !showRevokeConfirm ? (
                    <button onClick={() => setShowRevokeConfirm(true)} className="w-full py-3 border border-accent-orange/30 text-accent-orange rounded-md hover:bg-accent-orange/10 text-sm flex items-center justify-center gap-2">
                        <Trash2 className="w-4 h-4" /> Revoke API Key
                    </button>
                ) : (
                    <div className="flex gap-2">
                        <button onClick={() => setShowRevokeConfirm(false)} className="flex-1 py-2 bg-background-tertiary text-foreground text-xs rounded-md hover:bg-surface-hover">Cancel</button>
                        <button onClick={() => revokeMutation.mutate()} disabled={revokeMutation.isPending} className="flex-1 py-2 bg-accent-orange hover:bg-accent-orange/90 text-white text-xs rounded-lg flex items-center justify-center gap-1">
                            {revokeMutation.isPending ? 'Revoking...' : 'Confirm'}
                        </button>
                    </div>
                )}
            </div>

            {message && <p className={`text-sm ${message.includes('Failed') ? 'text-negative' : 'text-positive'}`}>{message}</p>}
        </div>
    );
}

// ─── Privacy Section ────────────────────────────────────────

function PrivacySection({ healthTrackingEnabled: initialHealth, onBack }: { healthTrackingEnabled: boolean; onBack: () => void }) {
    const [healthTrackingEnabled, setHealthTrackingEnabled] = useState(initialHealth);
    const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [message, setMessage] = useState('');
    const queryClient = useQueryClient();

    return (
        <div className="p-5 space-y-5">
            <div className="flex items-center gap-2">
                <button onClick={onBack} className="text-foreground-muted hover:text-foreground"><ChevronLeft className="w-4 h-4" /></button>
                <h3 className="text-lg font-bold text-foreground">Privacy & Consent</h3>
            </div>

            <div className="bg-surface border border-line rounded-md p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-positive" />
                        <span className="text-sm text-foreground">Terms of Service</span>
                    </div>
                    <span className="text-[10px] text-positive">Accepted</span>
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-positive" />
                        <span className="text-sm text-foreground">Privacy Policy</span>
                    </div>
                    <span className="text-[10px] text-positive">Accepted</span>
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {healthTrackingEnabled ? <ShieldCheck className="w-3.5 h-3.5 text-positive" /> : <ShieldOff className="w-3.5 h-3.5 text-foreground-muted" />}
                        <span className="text-sm text-foreground">Health Data Processing</span>
                    </div>
                    <span className={`text-[10px] ${healthTrackingEnabled ? 'text-positive' : 'text-foreground-muted'}`}>
                        {healthTrackingEnabled ? 'Granted' : 'Withdrawn'}
                    </span>
                </div>
            </div>

            {healthTrackingEnabled && (
                !showWithdrawConfirm ? (
                    <button onClick={() => setShowWithdrawConfirm(true)} className="w-full py-2.5 border border-accent-orange/30 text-accent-orange rounded-md hover:bg-accent-orange/10 text-xs flex items-center justify-center gap-2">
                        <ShieldOff className="w-3.5 h-3.5" /> Withdraw Health Data Consent
                    </button>
                ) : (
                    <div className="bg-accent-orange/10 border border-accent-orange/20 rounded-md p-4">
                        <p className="text-foreground-secondary text-xs mb-3 leading-relaxed">
                            <strong>Warning:</strong> Withdrawing health data consent will permanently delete all your activities, fitness metrics, health logs, supplements, and nutrition data.
                        </p>
                        <div className="flex gap-2">
                            <button onClick={() => setShowWithdrawConfirm(false)} className="flex-1 py-2 bg-background-tertiary text-foreground text-xs rounded-md hover:bg-surface-hover">Cancel</button>
                            <button
                                onClick={async () => {
                                    setIsWithdrawing(true);
                                    try {
                                        const res = await fetch('/api/user/consent', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ consentType: 'HEALTH_DATA', action: 'WITHDRAWN' }),
                                        });
                                        if (!res.ok) throw new Error('Failed');
                                        setHealthTrackingEnabled(false);
                                        setShowWithdrawConfirm(false);
                                        setMessage('Consent withdrawn. Health data deleted.');
                                        queryClient.invalidateQueries();
                                    } catch { setMessage('Failed to withdraw consent.'); }
                                    finally { setIsWithdrawing(false); }
                                }}
                                disabled={isWithdrawing}
                                className="flex-1 py-2 bg-accent-orange hover:bg-accent-orange/90 text-white text-xs rounded-lg flex items-center justify-center gap-1 font-medium"
                            >
                                {isWithdrawing ? 'Processing...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                )
            )}

            {message && <p className={`text-sm ${message.includes('Failed') ? 'text-negative' : 'text-positive'}`}>{message}</p>}
        </div>
    );
}

// ─── Danger Section ─────────────────────────────────────────

function DangerSection({ onBack }: { onBack: () => void }) {
    return (
        <div className="p-5 space-y-5">
            <div className="flex items-center gap-2">
                <button onClick={onBack} className="text-foreground-muted hover:text-foreground"><ChevronLeft className="w-4 h-4" /></button>
                <h3 className="text-lg font-bold text-negative">Danger Zone</h3>
            </div>
            <DangerShortcut />
        </div>
    );
}

export default MinimalistPillsMenu;
