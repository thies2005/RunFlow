'use client';

import { X } from 'lucide-react';
import PlanSetupForm from './PlanSetupForm';

import { useUserMetrics } from './providers/UserMetricsProvider';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const { effectiveVO2max, marathonShape } = useUserMetrics();
    const shapePercent = marathonShape?.shape || 0;
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/[var(--modal-backdrop-opacity)] backdrop-blur-sm animate-fade-in">
            <div className="glass-card w-full max-w-lg p-6 relative animate-slide-in max-h-[90vh] overflow-y-auto">
                <button onClick={onClose} className="absolute top-4 right-4 text-foreground-muted hover:text-foreground transition-colors">
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-xl font-bold text-foreground mb-6">Plan Settings</h2>

                <PlanSetupForm
                    mode="settings"
                    onSuccess={onClose}
                    onCancel={onClose}
                    effectiveVO2max={effectiveVO2max}
                    shapePercent={shapePercent}
                />
            </div>
        </div>
    );
}
