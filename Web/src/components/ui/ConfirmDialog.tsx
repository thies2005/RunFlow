'use client';

import React, { useEffect, useId, useRef, ReactNode } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';

export interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (_open: boolean) => void;
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
    const dialogRef = useRef<HTMLDialogElement>(null);
    const titleId = useId();
    const onOpenChangeRef = useRef(onOpenChange);
    onOpenChangeRef.current = onOpenChange;
    const busyRef = useRef(busy);
    busyRef.current = busy;

    useEffect(() => {
        if (!open) return;

        const dialog = dialogRef.current;
        if (!dialog) return;

        if (typeof dialog.showModal === 'function') {
            if (!dialog.open) {
                try {
                    dialog.showModal();
                } catch {
                    dialog.setAttribute('open', '');
                }
            }
        } else {
            dialog.setAttribute('open', '');
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !busyRef.current) {
                e.preventDefault();
                onOpenChangeRef.current(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            if (typeof dialog.close === 'function') {
                if (dialog.open) dialog.close();
            } else {
                dialog.removeAttribute('open');
            }
        };
    }, [open]);

    if (!open) return null;

    const resolvedDescription = description
        ?? (planName ? `${planName} and all its workouts will be removed.` : 'This action cannot be undone.');

    const dialogContent = (
        <dialog
            ref={dialogRef}
            className="w-[calc(100%-2rem)] max-w-sm m-auto p-6 relative animate-slide-in bg-background-secondary border border-line rounded-md text-foreground"
            aria-labelledby={titleId}
            tabIndex={-1}
            {...({ closedby: busy ? 'none' : 'any' } as Record<string, string>)}
            onCancel={(e) => {
                e.preventDefault();
                if (!busy) {
                    onOpenChangeRef.current(false);
                }
            }}
            onClose={() => {
                if (open && !busy) {
                    onOpenChangeRef.current(false);
                }
            }}
            onClick={(e) => {
                if (
                    !busy &&
                    typeof HTMLDialogElement !== 'undefined' &&
                    !('closedBy' in HTMLDialogElement.prototype) &&
                    e.target === dialogRef.current
                ) {
                    const rect = dialogRef.current.getBoundingClientRect();
                    const clickedOutside =
                        e.clientX < rect.left ||
                        e.clientX > rect.right ||
                        e.clientY < rect.top ||
                        e.clientY > rect.bottom;
                    if (clickedOutside) {
                        onOpenChangeRef.current(false);
                    }
                }
            }}
        >
            <div className="flex items-start gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-negative/10 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-negative" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                    <h3 id={titleId} className="text-base font-bold text-foreground break-words">
                        {title}
                    </h3>
                    <p className="text-xs text-foreground-muted mt-1 break-words">{resolvedDescription}</p>
                </div>
            </div>
            <div className="flex justify-end gap-2">
                <button
                    type="button"
                    autoFocus
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
                    {busy && <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />}
                    {confirmLabel}
                </button>
            </div>
        </dialog>
    );

    if (typeof document !== 'undefined') {
        return createPortal(dialogContent, document.body);
    }

    return dialogContent;
}

export default ConfirmDialog;
