'use client';

import PlanSetupForm from './PlanSetupForm';
import { Modal } from '@/components/ui/Modal';

import { useUserMetrics } from './providers/UserMetricsProvider';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const { effectiveVO2max, marathonShape } = useUserMetrics();
    const shapePercent = marathonShape?.shape || 0;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Plan Settings" maxWidth="lg">
            <PlanSetupForm
                mode="settings"
                onSuccess={onClose}
                onCancel={onClose}
                effectiveVO2max={effectiveVO2max}
                shapePercent={shapePercent}
            />
        </Modal>
    );
}
