import React, { useState, useCallback, ReactNode } from 'react';
import Modal from '@/components/ui/Modal';

export interface ConfirmOptions {
    title: string;
    message: ReactNode;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
}

export function useConfirmAction() {
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState<ConfirmOptions | null>(null);
    const [resolver, setResolver] = useState<((_value: boolean) => void) | null>(null);

    const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
        setOptions(opts);
        setIsOpen(true);
        return new Promise<boolean>((resolve) => {
            setResolver(() => resolve);
        });
    }, []);

    const handleConfirm = useCallback(() => {
        if (resolver) resolver(true);
        setIsOpen(false);
    }, [resolver]);

    const handleCancel = useCallback(() => {
        if (resolver) resolver(false);
        setIsOpen(false);
    }, [resolver]);

    const ConfirmDialog = useCallback(() => {
        if (!isOpen || !options) return null;

        return (
            <Modal isOpen={isOpen} onClose={handleCancel} title={options.title} maxWidth="sm">
                <div className="space-y-4">
                    <p className="text-sm text-foreground-secondary">{options.message}</p>
                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            autoFocus
                            onClick={handleCancel}
                            className="px-4 py-2 border border-line text-foreground hover:bg-background-tertiary rounded font-medium text-sm transition-colors"
                        >
                            {options.cancelText || 'Cancel'}
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            className={`px-4 py-2 text-white rounded font-medium text-sm transition-colors ${options.isDestructive
                                ? 'bg-negative hover:bg-negative/90'
                                : 'bg-accent-orange hover:bg-accent-orange/90'
                            }`}
                        >
                            {options.confirmText || 'Confirm'}
                        </button>
                    </div>
                </div>
            </Modal>
        );
}, [isOpen, options, handleCancel, handleConfirm]);

return { confirm, ConfirmDialog };
}

export default useConfirmAction;
