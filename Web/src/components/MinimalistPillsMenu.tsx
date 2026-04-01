'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession, signOut, signIn } from 'next-auth/react';
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
                    <button className="flex items-center gap-2 p-1 rounded-full hover:bg-surface-hover transition-colors border border-transparent hover:border-glass-border">
                        <UserAvatar
                            image={session.user.image}
                            name={session.user.name}
                            className="w-8 h-8 border border-glass-border"
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

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    const menuItems = getMenuItems(session, theme);

    return (
        <div className="fixed inset-0 z-[200] bg-background animate-fade-in">
            <div className="h-full flex flex-col">
                {subPage ? (
                    <SubPageContent
                        subPage={subPage}
                        onBack={() => setSubPage(null)}
                    />
                ) : (
                    <>
                        <div className="flex items-center justify-between px-4 pt-safe pb-2">
                            <div className="w-8" />
                            <h2 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider">Settings</h2>
                            <button onClick={onClose} className="text-foreground-muted hover:text-foreground p-1">
                                <ChevronRight className="w-5 h-5 rotate-180" />
                            </button>
                        </div>

                        <div className="px-5 pt-2 pb-4 text-center">
                            <UserAvatar
                                image={session.user.image}
                                name={session.user.name}
                                className="w-16 h-16 mx-auto mb-2 border-2 border-glass-border"
                            />
                            <div className="text-base font-semibold text-foreground">{session.user.name}</div>
                            <div className="text-xs text-foreground-muted">{session.user.email}</div>
                        </div>

                        <div className="h-px bg-glass-border mx-5" />

                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
                            {menuItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        if (item.action) item.action();
                                        else if (item.subPage) setSubPage(item.subPage);
                                    }}
                                    className="w-full flex items-center gap-3 px-3.5 py-3 bg-surface rounded-xl transition-colors active:bg-surface-hover"
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

                        <div className="px-5 pt-2 pb-4 border-t border-glass-border bg-background">
                            <div className="flex items-center justify-center gap-2 mb-3">
                                {[
                                    { id: 'light', icon: Sun },
                                    { id: 'dark', icon: Moon },
                                    { id: 'system', icon: Monitor },
                                ].map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => setTheme(t.id)}
                                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                                            theme === t.id
                                                ? 'bg-accent-orange text-white shadow-lg shadow-accent-orange/25'
                                                : 'bg-surface text-foreground-muted'
                                        }`}
                                    >
                                        <t.icon className="w-4 h-4" />
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => signOut({ callbackUrl: '/login' })}
                                className="w-full py-3 text-red-400 text-sm font-medium rounded-xl hover:bg-red-500/10 transition-colors"
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
                className="fixed top-16 right-4 z-[200] w-80 glass-card shadow-2xl rounded-2xl overflow-hidden animate-slide-in-from-top-2"
            >
                <div className="flex items-center gap-2 px-4 py-3 border-b border-glass-border">
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
            className="fixed top-16 right-4 z-[200] w-72 glass-card shadow-2xl rounded-2xl overflow-hidden animate-slide-in-from-top-2"
        >
            <div className="p-3 border-b border-glass-border">
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

            <div className="p-2 border-t border-glass-border">
                <div className="flex bg-background-tertiary rounded-lg p-1 border border-glass-border mb-2">
                    {[
                        { id: 'light', icon: Sun, label: 'Light' },
                        { id: 'dark', icon: Moon, label: 'Dark' },
                        { id: 'system', icon: Monitor, label: 'Auto' },
                    ].map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setTheme(t.id)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs transition-all ${
                                theme === t.id
                                    ? 'bg-background shadow-xs text-foreground'
                                    : 'text-foreground-muted hover:text-foreground hover:bg-surface-hover'
                            }`}
                        >
                            <t.icon className="w-3.5 h-3.5" />
                            <span>{t.label}</span>
                        </button>
                    ))}
                </div>
                <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
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
            iconColor: 'text-yellow-400',
            iconBg: 'bg-yellow-400/15',
            badge: undefined,
            rightIcon: ChevronRight,
            subPage: 'past-races',
        },
        {
            id: 'hr-zones',
            label: 'Heart Rate Zones',
            subtitle: 'LTHR & 7 training zones',
            icon: Heart,
            iconColor: 'text-red-400',
            iconBg: 'bg-red-400/15',
            rightIcon: ChevronRight,
            subPage: 'hr-zones',
        },
        {
            id: 'biometrics',
            label: 'Biometrics',
            subtitle: 'Weight, height, marathon shape',
            icon: Activity,
            iconColor: 'text-blue-400',
            iconBg: 'bg-blue-400/15',
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
            iconColor: 'text-green-400',
            iconBg: 'bg-green-400/15',
            rightIcon: ChevronRight,
            subPage: 'connections',
        },
        {
            id: 'reminders',
            label: 'Reminders',
            subtitle: 'Supplements, weigh-in, workouts',
            icon: Bell,
            iconColor: 'text-cyan-400',
            iconBg: 'bg-cyan-400/15',
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

// ─── Heart Rate Zones ───────────────────────────────────────

function HrZonesSubPage({ onBack: _onBack }: { onBack: () => void }) {
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

    const [thresholdHr, setThresholdHr] = useState<number | undefined>(undefined);
    const [hrZone1Max, setHrZone1Max] = useState(130);
    const [hrZone2Max, setHrZone2Max] = useState(148);
    const [hrZone3Max, setHrZone3Max] = useState(160);
    const [hrZone4Max, setHrZone4Max] = useState(170);
    const [hrZone5Max, setHrZone5Max] = useState(178);
    const [hrZone6Max, setHrZone6Max] = useState(187);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (settingsData) {
            if (settingsData.thresholdHeartRate) setThresholdHr(settingsData.thresholdHeartRate);
            if (settingsData.hrZone1Max) setHrZone1Max(settingsData.hrZone1Max);
            if (settingsData.hrZone2Max) setHrZone2Max(settingsData.hrZone2Max);
            if (settingsData.hrZone3Max) setHrZone3Max(settingsData.hrZone3Max);
            if (settingsData.hrZone4Max) setHrZone4Max(settingsData.hrZone4Max);
            if (settingsData.hrZone5Max) setHrZone5Max(settingsData.hrZone5Max);
            if (settingsData.hrZone6Max) setHrZone6Max(settingsData.hrZone6Max);
        }
    }, [settingsData]);

    const handleThresholdChange = (val: number) => {
        setThresholdHr(val);
        if (val > 0) {
            setHrZone1Max(Math.round(val * 0.75));
            setHrZone2Max(Math.round(val * 0.87));
            setHrZone3Max(Math.round(val * 0.94));
            setHrZone4Max(Math.round(val * 1.00));
            setHrZone5Max(Math.round(val * 1.05));
            setHrZone6Max(Math.round(val * 1.10));
        }
    };

    const saveMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/settings/profile', {
                method: 'POST',
                body: JSON.stringify({ thresholdHeartRate: thresholdHr, hrZone1Max, hrZone2Max, hrZone3Max, hrZone4Max, hrZone5Max, hrZone6Max }),
                headers: { 'Content-Type': 'application/json' },
            });
            if (!res.ok) throw new Error('Failed to update');
            return res.json();
        },
        onSuccess: () => {
            setMessage('HR zones saved!');
            queryClient.invalidateQueries({ queryKey: ['user-settings'] });
            setTimeout(() => setMessage(''), 2000);
        },
        onError: () => setMessage('Error saving. Try again.'),
    });

    const zones = [
        { label: 'Zone 1 (Recovery)', desc: '<75% LTHR', value: hrZone1Max, setter: setHrZone1Max, color: 'text-blue-400' },
        { label: 'Zone 2 (Aerobic)', desc: '76-87% LTHR', value: hrZone2Max, setter: setHrZone2Max, color: 'text-green-400' },
        { label: 'Zone 3 (Tempo)', desc: '88-94% LTHR', value: hrZone3Max, setter: setHrZone3Max, color: 'text-yellow-400' },
        { label: 'Zone 4 (Threshold)', desc: '95-100% LTHR', value: hrZone4Max, setter: setHrZone4Max, color: 'text-orange-400' },
        { label: 'Zone 5 (VO2max)', desc: '101-105% LTHR', value: hrZone5Max, setter: setHrZone5Max, color: 'text-red-400' },
        { label: 'Zone 6 (Anaerobic)', desc: '106-110% LTHR', value: hrZone6Max, setter: setHrZone6Max, color: 'text-pink-400' },
    ];

    return (
        <div className="p-5 space-y-5">
            <h3 className="text-lg font-bold text-foreground">Heart Rate Zones</h3>

            <div className="space-y-4">
                <Input
                    label="Threshold Heart Rate (LTHR)"
                    id="thresholdHr"
                    type="number"
                    value={thresholdHr || ''}
                    onChange={e => handleThresholdChange(parseInt(e.target.value) || 0)}
                    placeholder="e.g. 170"
                    helperText="Enter LTHR to auto-calculate zones"
                />

                <div className="space-y-3">
                    {zones.map((zone) => (
                        <div key={zone.label} className="flex items-center gap-3">
                            <div className={`text-sm font-medium w-32 ${zone.color}`}>{zone.label}</div>
                            <input
                                type="number"
                                value={zone.value}
                                onChange={e => zone.setter(parseInt(e.target.value) || 0)}
                                className="flex-1 bg-surface border border-glass-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent-orange/50"
                            />
                            <span className="text-[10px] text-foreground-muted w-20 text-right">{zone.desc}</span>
                        </div>
                    ))}
                </div>
            </div>

            {message && (
                <div className={`p-3 rounded-lg text-sm ${message.includes('Error') ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                    {message}
                </div>
            )}

            <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
                {saveMutation.isPending ? <Save className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                Save Zones
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
    const [includeCrossTraining, setIncludeCrossTraining] = useState(true);
    const [useImperial, setUseImperial] = useState(false);
    const [healthTrackingEnabled, setHealthTrackingEnabled] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (settingsData) {
            setWeight(settingsData.weight || 70);
            setHeight(settingsData.height || 175);
            if (typeof settingsData.includeCrossTraining === 'boolean') setIncludeCrossTraining(settingsData.includeCrossTraining);
            if (typeof settingsData.useImperial === 'boolean') setUseImperial(settingsData.useImperial);
            if (typeof settingsData.healthTrackingEnabled === 'boolean') setHealthTrackingEnabled(settingsData.healthTrackingEnabled);
        }
    }, [settingsData]);

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

            <div className="space-y-3 pt-2 border-t border-glass-border">
                <h4 className="text-xs text-accent-orange uppercase font-semibold tracking-wider">Marathon Shape</h4>
                <div className="flex items-center justify-between p-3 rounded-xl bg-surface border border-glass-border">
                    <div>
                        <p className="text-sm text-foreground">Include Cross-Training</p>
                        <p className="text-[10px] text-foreground-muted">Count cycling, swimming towards shape</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIncludeCrossTraining(!includeCrossTraining)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${includeCrossTraining ? 'bg-accent-orange' : 'bg-white/20'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${includeCrossTraining ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-glass-border">
                <h4 className="text-xs text-accent-orange uppercase font-semibold tracking-wider">Display</h4>
                <div className="flex items-center justify-between p-3 rounded-xl bg-surface border border-glass-border">
                    <div>
                        <p className="text-sm text-foreground">Use Miles</p>
                        <p className="text-[10px] text-foreground-muted">Distance and pace in miles</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setUseImperial(!useImperial)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${useImperial ? 'bg-accent-orange' : 'bg-white/20'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useImperial ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-glass-border">
                <h4 className="text-xs text-green-400 uppercase font-semibold tracking-wider">Health Tracking</h4>
                <div className="flex items-center justify-between p-3 rounded-xl bg-surface border border-glass-border">
                    <div>
                        <p className="text-sm text-foreground">Enable Health Features</p>
                        <p className="text-[10px] text-foreground-muted">Track weight, steps, supplements</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => healthToggleMutation.mutate(!healthTrackingEnabled)}
                        disabled={healthToggleMutation.isPending}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${healthTrackingEnabled ? 'bg-green-500' : 'bg-white/20'} ${healthToggleMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${healthTrackingEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
            </div>

            {message && (
                <div className={`p-3 rounded-lg text-sm ${message.includes('Error') ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
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

    const [hrZone1Max, setHrZone1Max] = useState(130);
    const [hrZone2Max, setHrZone2Max] = useState(148);
    const [hrZone3Max, setHrZone3Max] = useState(160);
    const [hrZone4Max, setHrZone4Max] = useState(170);
    const [hrZone5Max, setHrZone5Max] = useState(178);
    const [hrZone6Max, setHrZone6Max] = useState(187);

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

    return (
        <div className="p-5 space-y-5">
            <h3 className="text-lg font-bold text-foreground">Connections</h3>

            <div className="space-y-3">
                <h4 className="text-xs text-accent-orange uppercase font-semibold tracking-wider">Strava</h4>
                <button
                    onClick={() => resyncMutation.mutate()}
                    disabled={resyncMutation.isPending}
                    className="w-full py-3 border border-glass-border text-foreground rounded-xl hover:bg-surface-hover transition-colors text-sm flex items-center justify-center gap-2"
                >
                    <RefreshCw className={`w-4 h-4 ${resyncMutation.isPending ? 'animate-spin' : ''}`} />
                    {resyncMutation.isPending ? 'Syncing...' : 'Sync from Strava'}
                </button>
                <button
                    onClick={() => signIn('strava', { callbackUrl: window.location.href })}
                    className="w-full py-3 border border-accent-orange/30 text-accent-orange rounded-xl hover:bg-accent-orange/10 transition-colors text-sm flex items-center justify-center gap-2"
                >
                    <Link2 className="w-4 h-4" />
                    Reconnect Strava
                </button>
                <p className="text-[10px] text-foreground-muted">Re-authenticate if sync is failing</p>
            </div>

            <div className="space-y-3 pt-2 border-t border-glass-border">
                <h4 className="text-xs text-green-400 uppercase font-semibold tracking-wider">Health Connect</h4>
                <button
                    onClick={() => healthConnectSyncMutation.mutate()}
                    disabled={healthConnectSyncMutation.isPending}
                    className="w-full py-3 border border-green-500/30 text-green-400 rounded-xl hover:bg-green-500/10 transition-colors text-sm flex items-center justify-center gap-2"
                >
                    <RefreshCw className={`w-4 h-4 ${healthConnectSyncMutation.isPending ? 'animate-spin' : ''}`} />
                    {healthConnectSyncMutation.isPending ? 'Syncing...' : 'Sync from Health Connect'}
                </button>
            </div>

            {message && (
                <div className={`p-3 rounded-lg text-sm flex flex-col gap-2 ${message.includes('Error') || message.includes('failed') || message.includes('lost') ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {message}
                    </div>
                    {showReauthPrompt && (
                        <button
                            onClick={() => signIn('strava', { callbackUrl: window.location.href })}
                            className="mt-1 w-full py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded text-xs flex items-center justify-center gap-2 transition-colors uppercase font-semibold tracking-wide"
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

    if (section === 'api') return <ApiSection onBack={() => setSection('main')} />;
    if (section === 'privacy') return <PrivacySection healthTrackingEnabled={healthTrackingEnabled} onBack={() => setSection('main')} />;
    if (section === 'danger') return <DangerSection onBack={() => setSection('main')} />;

    return (
        <div className="p-5 space-y-5">
            <h3 className="text-lg font-bold text-foreground">App Settings</h3>

            <div className="space-y-1.5">
                {[
                    { icon: Key, label: 'API Access', desc: 'Generate & manage read-only API key', color: 'text-blue-400', bg: 'bg-blue-400/15', target: 'api' as 'api' },
                    { icon: ShieldCheck, label: 'Privacy & Consent', desc: 'Terms, privacy policy, data consent', color: 'text-purple-400', bg: 'bg-purple-400/15', target: 'privacy' as 'privacy' },
                    { icon: Download, label: 'Export Data', desc: 'Download all your data as JSON', color: 'text-cyan-400', bg: 'bg-cyan-400/15', target: undefined as undefined },
                ].map((item) => (
                    <button
                        key={item.label}
                        onClick={() => {
                            if (item.target) setSection(item.target);
                        }}
                        className="w-full flex items-center gap-3 px-3.5 py-3 bg-surface rounded-xl transition-colors hover:bg-surface-hover"
                    >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.bg}`}>
                            <item.icon className={`w-4 h-4 ${item.color}`} />
                        </div>
                        <div className="flex-1 text-left">
                            <div className="text-sm font-medium text-foreground">{item.label}</div>
                            <div className="text-[11px] text-foreground-muted">{item.desc}</div>
                        </div>
                        {item.target && <ChevronRight className="w-4 h-4 text-foreground-muted" />}
                    </button>
                ))}
            </div>

            <div className="border-t border-glass-border pt-4">
                <DangerShortcut />
            </div>
        </div>
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
            await signOut({ callbackUrl: '/' });
        },
        onError: () => {
            setMessage('Error deleting account.');
            setIsDeleting(false);
        },
    });

    return (
        <div>
            <h4 className="text-xs text-red-400 font-medium uppercase tracking-wider mb-3">Danger Zone</h4>
            {!showDeleteConfirm ? (
                <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full py-2.5 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/10 transition-colors text-sm flex items-center justify-center gap-2"
                >
                    <Trash2 className="w-4 h-4" />
                    Delete Account
                </button>
            ) : (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                    <p className="text-red-200 text-xs mb-4 leading-relaxed">
                        Are you sure? This will permanently delete your account, activities, and goals.
                    </p>
                    <div className="flex gap-3">
                        <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 bg-white/5 text-white text-xs rounded-lg hover:bg-white/10">Cancel</button>
                        <button
                            onClick={() => { setIsDeleting(true); deleteMutation.mutate(); }}
                            disabled={isDeleting}
                            className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white text-xs rounded-lg flex items-center justify-center gap-2 font-medium"
                        >
                            {isDeleting ? <AlertCircle className="animate-spin w-3 h-3" /> : <Trash2 className="w-3 h-3" />}
                            {isDeleting ? 'Deleting...' : 'Confirm'}
                        </button>
                    </div>
                </div>
            )}
            {message && <p className="text-xs text-red-400 mt-2">{message}</p>}
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
                <Link href="/api-docs" target="_blank" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                    API Docs <ExternalLink className="w-3 h-3" />
                </Link>
            </div>

            {generatedApiKey ? (
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                    <p className="text-green-300 text-xs mb-2 font-medium flex items-center gap-1">
                        <Key className="w-3 h-3" /> Your API Key (copy now):
                    </p>
                    <div className="flex items-center gap-2">
                        <code className="flex-1 bg-black/30 px-3 py-2 rounded-lg text-xs text-green-400 font-mono break-all">{generatedApiKey}</code>
                        <button onClick={() => { navigator.clipboard.writeText(generatedApiKey); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="p-2 bg-green-500/20 rounded-lg hover:bg-green-500/30">
                            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-green-400" />}
                        </button>
                    </div>
                </div>
            ) : apiKeyData?.hasKey ? (
                <div className="bg-surface border border-glass-border rounded-xl p-3">
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
                    <button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending} className="w-full py-3 border border-blue-500/30 text-blue-400 rounded-xl hover:bg-blue-500/10 text-sm flex items-center justify-center gap-2">
                        <Key className={`w-4 h-4 ${generateMutation.isPending ? 'animate-pulse' : ''}`} />
                        {generateMutation.isPending ? 'Generating...' : 'Generate API Key'}
                    </button>
                ) : !showRevokeConfirm ? (
                    <button onClick={() => setShowRevokeConfirm(true)} className="w-full py-3 border border-accent-orange/30 text-accent-orange rounded-xl hover:bg-accent-orange/10 text-sm flex items-center justify-center gap-2">
                        <Trash2 className="w-4 h-4" /> Revoke API Key
                    </button>
                ) : (
                    <div className="flex gap-2">
                        <button onClick={() => setShowRevokeConfirm(false)} className="flex-1 py-2 bg-white/5 text-white text-xs rounded-lg hover:bg-white/10">Cancel</button>
                        <button onClick={() => revokeMutation.mutate()} disabled={revokeMutation.isPending} className="flex-1 py-2 bg-accent-orange hover:bg-orange-600 text-white text-xs rounded-lg flex items-center justify-center gap-1">
                            {revokeMutation.isPending ? 'Revoking...' : 'Confirm'}
                        </button>
                    </div>
                )}
            </div>

            {message && <p className={`text-sm ${message.includes('Failed') ? 'text-red-400' : 'text-green-400'}`}>{message}</p>}
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

            <div className="bg-surface border border-glass-border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
                        <span className="text-sm text-foreground">Terms of Service</span>
                    </div>
                    <span className="text-[10px] text-green-400">Accepted</span>
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
                        <span className="text-sm text-foreground">Privacy Policy</span>
                    </div>
                    <span className="text-[10px] text-green-400">Accepted</span>
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {healthTrackingEnabled ? <ShieldCheck className="w-3.5 h-3.5 text-green-400" /> : <ShieldOff className="w-3.5 h-3.5 text-foreground-muted" />}
                        <span className="text-sm text-foreground">Health Data Processing</span>
                    </div>
                    <span className={`text-[10px] ${healthTrackingEnabled ? 'text-green-400' : 'text-foreground-muted'}`}>
                        {healthTrackingEnabled ? 'Granted' : 'Withdrawn'}
                    </span>
                </div>
            </div>

            {healthTrackingEnabled && (
                !showWithdrawConfirm ? (
                    <button onClick={() => setShowWithdrawConfirm(true)} className="w-full py-2.5 border border-accent-orange/30 text-accent-orange rounded-xl hover:bg-accent-orange/10 text-xs flex items-center justify-center gap-2">
                        <ShieldOff className="w-3.5 h-3.5" /> Withdraw Health Data Consent
                    </button>
                ) : (
                    <div className="bg-accent-orange/10 border border-accent-orange/20 rounded-xl p-4">
                        <p className="text-orange-200 text-xs mb-3 leading-relaxed">
                            <strong>Warning:</strong> Withdrawing health data consent will permanently delete all your activities, fitness metrics, health logs, supplements, and nutrition data.
                        </p>
                        <div className="flex gap-2">
                            <button onClick={() => setShowWithdrawConfirm(false)} className="flex-1 py-2 bg-white/5 text-white text-xs rounded-lg hover:bg-white/10">Cancel</button>
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
                                className="flex-1 py-2 bg-accent-orange hover:bg-orange-600 text-white text-xs rounded-lg flex items-center justify-center gap-1 font-medium"
                            >
                                {isWithdrawing ? 'Processing...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                )
            )}

            {message && <p className={`text-sm ${message.includes('Failed') ? 'text-red-400' : 'text-green-400'}`}>{message}</p>}
        </div>
    );
}

// ─── Danger Section ─────────────────────────────────────────

function DangerSection({ onBack }: { onBack: () => void }) {
    return (
        <div className="p-5 space-y-5">
            <div className="flex items-center gap-2">
                <button onClick={onBack} className="text-foreground-muted hover:text-foreground"><ChevronLeft className="w-4 h-4" /></button>
                <h3 className="text-lg font-bold text-red-400">Danger Zone</h3>
            </div>
            <DangerShortcut />
        </div>
    );
}

export default MinimalistPillsMenu;
