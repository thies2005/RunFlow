'use client';

import React, { useEffect, useRef, ReactNode } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';

export interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: ReactNode;
    description?: ReactNode;
    /** Plan name; when set and no description given, the standard plan-deletion copy is used. */
    planName?: string;
    onConfirm: () => void;
    confirmLabel?: string;
    /** True while the mutation runs; disables both buttons and shows a spinner on the confirm button. */
    busy?: boolean;
}

export function ConfirmDialog({
    open,
    onOpenChange,
    title = 'Delete plan?',
    description,
    planName,
    onConfirm,
    confirmLabel = 'Delete',
    busy = false,
}: ConfirmDialogProps) {
    const dialogRef = useRef<HTMLDivElement>(null);

    // Escape key handler + focus management (mirrors Modal.tsx)
    useEffect(() => {
        if (!open) return;

        const focusTimer = setTimeout(() => {
            dialogRef.current?.focus();
        }, 0);

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onOpenChange(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            clearTimeout(focusTimer);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [open, onOpenChange]);

    if (!open) return null;

    const resolvedDescription = description
        ?? (planName ? `${planName} and all its workouts will be removed.` : 'This action cannot be undone.');

    const dialogContent = (
        <div
            ref={dialogRef}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/[var(--modal-backdrop-opacity,0.55)] animate-fade-in p-4 pt-safe pb-safe"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            tabIndex={-1}
            onClick={() => onOpenChange(false)}
        >
            <div
                className="w-full max-w-sm p-6 relative animate-slide-in bg-background-secondary border border-line rounded-md shadow-lg"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-start gap-3 mb-5">
                    <div className="w-10 h-10 rounded-full bg-negative/10 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5 text-negative" />
                    </div>
                    <div className="min-w-0">
                        <h3 id="confirm-dialog-title" className="text-base font-bold text-foreground break-words">
                            {title}
                        </h3>
                        <p className="text-xs text-foreground-muted mt-1 break-words">{resolvedDescription}</p>
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        disabled={busy}
                        className="px-3 py-1.5 rounded-md bg-background-tertiary text-foreground-secondary text-xs hover:bg-foreground/15 disabled:opacity-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={busy}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-negative text-white text-xs hover:bg-negative/85 disabled:opacity-50 transition-colors"
                    >
                        {busy && <Loader2 className="w-3 h-3 animate-spin" />}
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );

    // Render in portal if we are in the browser
    if (typeof document !== 'undefined') {
        return createPortal(dialogContent, document.body);
    }

    return dialogContent;
}

export default ConfirmDialog;
