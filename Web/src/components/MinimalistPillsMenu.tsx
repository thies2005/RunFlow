'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { evictAuthBoundCaches } from '@/lib/pwa/authCacheEviction';
import { useTheme } from 'next-themes';
import {
    ChevronLeft, ChevronRight, LogOut, Sun, Moon, Monitor,
    Trophy, Heart, Activity, Sliders, Link2, Bell, Settings,
} from 'lucide-react';

import { UserAvatar } from '@/components/UserAvatar';
import { Modal } from '@/components/ui/Modal';
import AiSettingsModal from '@/components/AiSettingsModal';
import { ReminderSettingsModal } from '@/components/views/ReminderSettingsModal';
import PastRacesSection from '@/components/PastRacesSection';
import SettingsModal from '@/components/SettingsModal';
import { useDeviceType } from '@/hooks/useDeviceType';
import { HrZonesSubPage } from '@/components/settings/HrZonesSubPage';
import { BiometricsSubPage } from '@/components/settings/BiometricsSubPage';
import { ConnectionsSubPage } from '@/components/settings/ConnectionsSubPage';
import { AppSettingsSubPage } from '@/components/settings/AppSettingsSubPage';

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
                    <button aria-label="Open profile settings" aria-expanded={isOpen} className="flex items-center gap-2 p-1 rounded-full hover:bg-surface-hover transition-colors border border-transparent hover:border-line">
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
                            <button aria-label="Back to settings" onClick={handleBack} className="text-foreground-muted hover:text-foreground p-1 -ml-1">
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
                            <button aria-label="Close settings" onClick={onClose} className="text-foreground-muted hover:text-foreground p-1">
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
            if (e.key === 'Escape' && !subPage) onClose();
        };
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [onClose, subPage]);

    const menuItems = getMenuItems(session, theme);

    if (subPage) {
        return (
            <Modal isOpen onClose={() => setSubPage(null)} title={menuItems.find(i => i.subPage === subPage)?.label || 'Settings'} maxWidth="2xl">
                <div className="max-h-[70vh] overflow-y-auto">
                    <SubPageContent subPage={subPage} onBack={() => setSubPage(null)} />
                </div>
            </Modal>
        );
    }

    return (
        <div
            ref={popoverRef}
            className="fixed top-16 right-4 z-[200] w-72 bg-background-secondary border border-line rounded-md overflow-hidden animate-slide-in"
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
            iconColor: 'text-negative',
            iconBg: 'bg-negative/15',
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
            icon: Sliders,
            iconColor: 'text-accent-orange',
            iconBg: 'bg-accent-orange/15',
            rightIcon: ChevronRight,
            subPage: 'ai-coach',
        },
        {
            id: 'connections',
            label: 'Connections',
            subtitle: 'Strava, MCP & AI clients',
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
            iconColor: 'text-positive',
            iconBg: 'bg-positive/15',
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

export default MinimalistPillsMenu;
