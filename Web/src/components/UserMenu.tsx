'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { evictAuthBoundCaches } from '@/lib/pwa/authCacheEviction';
import { Settings, LogOut, User, Moon, Sun, Monitor, ChevronDown } from 'lucide-react';
import { useTheme } from 'next-themes';

import { UserAvatar } from '@/components/UserAvatar';

export function UserMenu({
    onOpenProfile,
    onOpenSettings,
    trigger
}: {
    onOpenProfile: () => void;
    onOpenSettings: () => void;
    trigger?: React.ReactNode;
}) {
    const { data: session } = useSession();
    const [isOpen, setIsOpen] = useState(false);
    const { theme, setTheme } = useTheme();
    const menuRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleTriggerKeydown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape' && isOpen) {
            e.preventDefault();
            setIsOpen(false);
            triggerRef.current?.focus();
        }
    };

    if (!session?.user) return null;

    return (
        <div className="relative" ref={menuRef}>
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                onKeyDown={handleTriggerKeydown}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                className={`flex items-center gap-2 p-1 rounded-full transition-colors border border-transparent hover:bg-surface-hover hover:border-line ${trigger ? "cursor-pointer" : ""}`}
            >
                {trigger || (
                    <>
                        <UserAvatar
                            image={session.user.image}
                            name={session.user.name}
                            className="w-8 h-8 border border-line"
                        />
                        <ChevronDown className={`w-4 h-4 text-foreground-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 glass-card shadow-lg z-[100] overflow-hidden animate-slide-in">
                    <div className="p-3 border-b border-line">
                        <p className="text-sm font-semibold text-foreground truncate">{session.user.name}</p>
                        <p className="text-xs text-foreground-muted truncate">{session.user.email}</p>
                    </div>

                    <div className="p-2 space-y-1">
                        <button
                            onClick={() => {
                                onOpenSettings();
                                setIsOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-surface-hover rounded-lg transition-colors"
                        >
                            <Settings className="w-4 h-4 text-accent-orange" />
                            <span>Plan Settings</span>
                        </button>

                        <button
                            onClick={() => {
                                onOpenProfile();
                                setIsOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-surface-hover rounded-lg transition-colors"
                        >
                            <User className="w-4 h-4 text-accent-purple" />
                            <span>Profile Settings</span>
                        </button>

                        <div className="pt-2 pb-1 px-3">
                            <p className="text-[10px] font-semibold text-foreground-muted mb-2">Appearance</p>
                            <div className="flex bg-background-tertiary rounded-md p-1 border border-line">
                                {[
                                    { id: 'light', icon: Sun, label: 'Light' },
                                    { id: 'dark', icon: Moon, label: 'Dark' },
                                    { id: 'system', icon: Monitor, label: 'Auto' },
                                ].map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => setTheme(t.id)}
                                        className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs transition-colors ${theme === t.id
                                            ? 'bg-background-secondary text-foreground'
                                            : 'text-foreground-muted hover:text-foreground hover:bg-surface-hover'
                                            }`}
                                    >
                                        <t.icon className="w-3.5 h-3.5" />
                                        <span>{t.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="h-px bg-line my-2" />

                        <button
                            onClick={() => {
                                // Evict auth-bound SW runtime caches before
                                // the sign-out navigation so the previous
                                // account's cached API responses can never be
                                // replayed.
                                void evictAuthBoundCaches().then(() =>
                                    signOut({ callbackUrl: '/login' })
                                );
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-negative hover:bg-negative/10 rounded-md transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            <span>Log Out</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
