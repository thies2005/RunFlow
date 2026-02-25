'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, BellOff, Clock, Dumbbell, UtensilsCrossed, Pill, Scale, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useMobileNotifications } from '@/hooks/useMobileNotifications';
import { Capacitor } from '@capacitor/core';

interface ReminderSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface ReminderSettingsData {
    supplementMorningEnabled: boolean;
    supplementMorningTime: string;
    supplementNoonEnabled: boolean;
    supplementNoonTime: string;
    supplementEveningEnabled: boolean;
    supplementEveningTime: string;
    weightReminderEnabled: boolean;
    weightReminderTime: string;
    foodBreakfastEnabled: boolean;
    foodBreakfastTime: string;
    foodLunchEnabled: boolean;
    foodLunchTime: string;
    foodDinnerEnabled: boolean;
    foodDinnerTime: string;
    workoutReminderEnabled: boolean;
    workoutReminderMinutes: number;
    timezone: string;
    hasSubscription: boolean;
}

export function ReminderSettingsModal({ isOpen, onClose }: ReminderSettingsModalProps) {
    const queryClient = useQueryClient();
    const [isNative, setIsNative] = useState(false);
    const webPush = usePushNotifications();
    const mobilePush = useMobileNotifications();

    useEffect(() => {
        setIsNative(Capacitor.isNativePlatform());
    }, []);

    // Dynamically use the correct hook implementation
    const push = isNative ? mobilePush : webPush;

    const [localSettings, setLocalSettings] = useState<Partial<ReminderSettingsData>>({});
    const [isDirty, setIsDirty] = useState(false);

    // Fetch current settings
    const { data: settings, isLoading } = useQuery<ReminderSettingsData>({
        queryKey: ['reminder-settings'],
        queryFn: async () => {
            const res = await fetch('/api/reminders/settings');
            if (!res.ok) throw new Error('Failed to fetch reminder settings');
            return res.json();
        },
        enabled: isOpen,
    });

    // Initialize local settings when data loads
    useEffect(() => {
        if (settings) {
            setLocalSettings(settings);
            setIsDirty(false);
        }
    }, [settings]);

    // Auto-detect timezone
    useEffect(() => {
        if (isOpen && !localSettings.timezone) {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            setLocalSettings(prev => ({ ...prev, timezone: tz }));
        }
    }, [isOpen, localSettings.timezone]);

    const saveMutation = useMutation({
        mutationFn: async (data: Partial<ReminderSettingsData>) => {
            const res = await fetch('/api/reminders/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to save');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reminder-settings'] });
            setIsDirty(false);
        },
    });

    const update = (key: string, value: any) => {
        setLocalSettings(prev => ({ ...prev, [key]: value }));
        setIsDirty(true);
    };

    const handleSave = () => {
        saveMutation.mutate(localSettings);
    };

    const handlePushToggle = async () => {
        if (push.isSubscribed) {
            await push.unsubscribe();
        } else {
            await push.subscribe();
        }
        queryClient.invalidateQueries({ queryKey: ['reminder-settings'] });
    };

    const anyReminderEnabled = localSettings.supplementMorningEnabled
        || localSettings.supplementNoonEnabled
        || localSettings.supplementEveningEnabled
        || localSettings.weightReminderEnabled
        || localSettings.foodBreakfastEnabled
        || localSettings.foodLunchEnabled
        || localSettings.foodDinnerEnabled
        || localSettings.workoutReminderEnabled;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Notification Reminders" maxWidth="md">
            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
                {/* Push Notification Status */}
                <div className="glass-card p-4 rounded-xl border border-glass-border">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {push.isSubscribed ? (
                                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                                    <Bell className="w-5 h-5 text-green-400" />
                                </div>
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-gray-500/20 flex items-center justify-center">
                                    <BellOff className="w-5 h-5 text-gray-400" />
                                </div>
                            )}
                            <div>
                                <p className="text-sm font-semibold text-white">
                                    Push Notifications
                                </p>
                                <p className="text-xs text-gray-400">
                                    {!push.isSupported
                                        ? 'Not supported on this device/browser'
                                        : push.permission === 'denied'
                                            ? isNative ? 'Blocked — enable in app settings' : 'Blocked — enable in browser settings'
                                            : push.isSubscribed
                                                ? 'Enabled — you\'ll receive reminders'
                                                : isNative ? 'Enable to get local reminders' : 'Enable to receive reminders'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handlePushToggle}
                            disabled={!push.isSupported || push.permission === 'denied' || push.isLoading}
                            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${push.isSubscribed
                                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                                : 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-500/20'
                                } disabled:opacity-40 disabled:cursor-not-allowed`}
                        >
                            {push.isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : push.isSubscribed ? 'Disable' : 'Enable'}
                        </button>
                    </div>

                    {push.permission === 'denied' && (
                        <div className="mt-3 flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-red-300">
                                Notifications are blocked. Open your {isNative ? 'device' : 'browser'} settings and allow notifications to receive reminders.
                            </p>
                        </div>
                    )}
                </div>

                {/* Show reminder settings only when push is subscribed */}
                {push.isSubscribed && (
                    <>
                        {/* Timezone */}
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-gray-400" />
                                <span className="text-xs text-gray-400">Timezone</span>
                            </div>
                            <span className="text-xs font-medium text-white bg-white/10 px-3 py-1 rounded-full">
                                {localSettings.timezone || 'UTC'}
                            </span>
                        </div>

                        {/* Supplement Reminders */}
                        <ReminderSection
                            icon={<Pill className="w-4 h-4 text-purple-400" />}
                            title="Supplement Reminders"
                            color="purple"
                        >
                            <ReminderRow
                                label="Morning"
                                enabled={!!localSettings.supplementMorningEnabled}
                                time={localSettings.supplementMorningTime || '08:00'}
                                onToggle={(v) => update('supplementMorningEnabled', v)}
                                onTimeChange={(v) => update('supplementMorningTime', v)}
                            />
                            <ReminderRow
                                label="Noon"
                                enabled={!!localSettings.supplementNoonEnabled}
                                time={localSettings.supplementNoonTime || '12:00'}
                                onToggle={(v) => update('supplementNoonEnabled', v)}
                                onTimeChange={(v) => update('supplementNoonTime', v)}
                            />
                            <ReminderRow
                                label="Evening"
                                enabled={!!localSettings.supplementEveningEnabled}
                                time={localSettings.supplementEveningTime || '20:00'}
                                onToggle={(v) => update('supplementEveningEnabled', v)}
                                onTimeChange={(v) => update('supplementEveningTime', v)}
                            />
                        </ReminderSection>

                        {/* Weight Reminder */}
                        <ReminderSection
                            icon={<Scale className="w-4 h-4 text-blue-400" />}
                            title="Weight Reminder"
                            color="blue"
                        >
                            <ReminderRow
                                label="Daily weigh-in"
                                enabled={!!localSettings.weightReminderEnabled}
                                time={localSettings.weightReminderTime || '07:00'}
                                onToggle={(v) => update('weightReminderEnabled', v)}
                                onTimeChange={(v) => update('weightReminderTime', v)}
                            />
                        </ReminderSection>

                        {/* Food Tracking Reminders */}
                        <ReminderSection
                            icon={<UtensilsCrossed className="w-4 h-4 text-pink-400" />}
                            title="Food Tracking Reminders"
                            color="pink"
                        >
                            <ReminderRow
                                label="Breakfast"
                                enabled={!!localSettings.foodBreakfastEnabled}
                                time={localSettings.foodBreakfastTime || '09:00'}
                                onToggle={(v) => update('foodBreakfastEnabled', v)}
                                onTimeChange={(v) => update('foodBreakfastTime', v)}
                            />
                            <ReminderRow
                                label="Lunch"
                                enabled={!!localSettings.foodLunchEnabled}
                                time={localSettings.foodLunchTime || '13:00'}
                                onToggle={(v) => update('foodLunchEnabled', v)}
                                onTimeChange={(v) => update('foodLunchTime', v)}
                            />
                            <ReminderRow
                                label="Dinner"
                                enabled={!!localSettings.foodDinnerEnabled}
                                time={localSettings.foodDinnerTime || '19:00'}
                                onToggle={(v) => update('foodDinnerEnabled', v)}
                                onTimeChange={(v) => update('foodDinnerTime', v)}
                            />
                        </ReminderSection>

                        {/* Workout Reminders */}
                        <ReminderSection
                            icon={<Dumbbell className="w-4 h-4 text-green-400" />}
                            title="Workout Reminders"
                            color="green"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-white">Planned workouts</p>
                                    <p className="text-[10px] text-gray-500">Get notified before scheduled activities</p>
                                </div>
                                <ToggleSwitch
                                    enabled={!!localSettings.workoutReminderEnabled}
                                    onToggle={(v) => update('workoutReminderEnabled', v)}
                                />
                            </div>
                            {localSettings.workoutReminderEnabled && (
                                <div className="flex items-center justify-between mt-3 pl-4 border-l-2 border-green-500/20">
                                    <span className="text-xs text-gray-400">Notify before</span>
                                    <select
                                        value={localSettings.workoutReminderMinutes || 60}
                                        onChange={(e) => update('workoutReminderMinutes', parseInt(e.target.value))}
                                        className="bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-green-500/50"
                                    >
                                        <option value={15}>15 minutes</option>
                                        <option value={30}>30 minutes</option>
                                        <option value={60}>1 hour</option>
                                        <option value={120}>2 hours</option>
                                    </select>
                                </div>
                            )}
                        </ReminderSection>

                        {/* Save Button */}
                        {isDirty && (
                            <div className="sticky bottom-0 bg-background/90 backdrop-blur-md pt-3 pb-1">
                                <button
                                    onClick={handleSave}
                                    disabled={saveMutation.isPending}
                                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                                >
                                    {saveMutation.isPending ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <CheckCircle className="w-4 h-4" />
                                    )}
                                    Save Changes
                                </button>
                            </div>
                        )}

                        {saveMutation.isSuccess && !isDirty && (
                            <p className="text-center text-xs text-green-400 flex items-center justify-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Settings saved
                            </p>
                        )}
                    </>
                )}

                {/* Not subscribed but has settings hint */}
                {!push.isSubscribed && push.isSupported && push.permission !== 'denied' && (
                    <div className="text-center py-8">
                        <Bell className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                        <p className="text-sm text-gray-400 mb-1">Enable push notifications above</p>
                        <p className="text-xs text-gray-500">to configure your reminders</p>
                    </div>
                )}
            </div>
        </Modal>
    );
}

// ============================================
// Sub-components
// ============================================

function ReminderSection({ icon, title, color, children }: {
    icon: React.ReactNode;
    title: string;
    color: string;
    children: React.ReactNode;
}) {
    return (
        <div className="glass-card p-4 rounded-xl border border-glass-border">
            <div className="flex items-center gap-2 mb-3">
                {icon}
                <h4 className="text-sm font-semibold text-white">{title}</h4>
            </div>
            <div className="space-y-3">
                {children}
            </div>
        </div>
    );
}

function ReminderRow({ label, enabled, time, onToggle, onTimeChange }: {
    label: string;
    enabled: boolean;
    time: string;
    onToggle: (enabled: boolean) => void;
    onTimeChange: (time: string) => void;
}) {
    return (
        <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-white flex-1">{label}</span>
            {enabled && (
                <input
                    type="time"
                    value={time}
                    onChange={(e) => onTimeChange(e.target.value)}
                    className="bg-white/10 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 [color-scheme:dark]"
                />
            )}
            <ToggleSwitch enabled={enabled} onToggle={onToggle} />
        </div>
    );
}

function ToggleSwitch({ enabled, onToggle }: { enabled: boolean; onToggle: (v: boolean) => void }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => onToggle(!enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${enabled ? 'bg-blue-500' : 'bg-gray-600'
                }`}
        >
            <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
            />
        </button>
    );
}
