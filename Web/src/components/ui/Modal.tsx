'use client';

import React, { useEffect, useRef, useId, ReactNode } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

const openDialogs: HTMLElement[] = [];

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: ReactNode;
    children: ReactNode;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
    icon?: ReactNode;
    hideCloseButton?: boolean;
}

export function Modal({
    isOpen,
    onClose,
    title,
    children,
    maxWidth = 'md',
    icon,
    hideCloseButton = false
}: ModalProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const previouslyFocused = useRef<Element | null>(null);
    const titleId = useId();
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useEffect(() => {
        if (!isOpen) return;

        const dialog = dialogRef.current;
        if (!dialog) return;

        openDialogs.push(dialog);
        previouslyFocused.current = document.activeElement;

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

        const focusTimer = setTimeout(() => {
            const node = dialogRef.current;
            if (!node || openDialogs[openDialogs.length - 1] !== node) return;
            const autoFocusEl = node.querySelector<HTMLElement>('[autofocus]');
            if (autoFocusEl && autoFocusEl.getClientRects().length > 0) {
                autoFocusEl.focus();
                return;
            }
            const focusable = Array.from(node.querySelectorAll<HTMLElement>(
                'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )).find(el => el.getClientRects().length > 0);
            (focusable ?? node).focus();
        }, 0);

        const handleKeyDown = (e: KeyboardEvent) => {
            if (openDialogs[openDialogs.length - 1] !== dialog) return;
            if (e.key === 'Escape') {
                e.preventDefault();
                onCloseRef.current();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            clearTimeout(focusTimer);
            const index = openDialogs.indexOf(dialog);
            if (index !== -1) openDialogs.splice(index, 1);
            document.removeEventListener('keydown', handleKeyDown);
            if (typeof dialog.close === 'function') {
                if (dialog.open) dialog.close();
            } else {
                dialog.removeAttribute('open');
            }
            if (index === openDialogs.length && previouslyFocused.current instanceof HTMLElement && typeof previouslyFocused.current.focus === 'function') {
                previouslyFocused.current.focus();
            }
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const maxWidthClasses = {
        'sm': 'max-w-sm',
        'md': 'max-w-md',
        'lg': 'max-w-lg',
        'xl': 'max-w-xl',
        '2xl': 'max-w-2xl',
        'full': 'max-w-full',
    };

    const modalContent = (
        <dialog
            ref={dialogRef}
            className={`w-[calc(100%-2rem)] ${maxWidthClasses[maxWidth]} m-auto p-6 relative animate-slide-in bg-background-secondary border border-line rounded-md text-foreground max-h-[90vh] overflow-y-auto`}
            tabIndex={-1}
            aria-labelledby={title ? titleId : undefined}
            {...({ closedby: 'any' } as Record<string, string>)}
            onCancel={(e) => {
                e.preventDefault();
                if (openDialogs[openDialogs.length - 1] === dialogRef.current) {
                    onCloseRef.current();
                }
            }}
            onClose={() => {
                if (isOpen) {
                    onCloseRef.current();
                }
            }}
            onClick={(e) => {
                if (
                    typeof HTMLDialogElement !== 'undefined' &&
                    !('closedBy' in HTMLDialogElement.prototype) &&
                    e.target === dialogRef.current &&
                    openDialogs[openDialogs.length - 1] === dialogRef.current
                ) {
                    const rect = dialogRef.current.getBoundingClientRect();
                    const clickedOutside =
                        e.clientX < rect.left ||
                        e.clientX > rect.right ||
                        e.clientY < rect.top ||
                        e.clientY > rect.bottom;
                    if (clickedOutside) {
                        onCloseRef.current();
                    }
                }
            }}
        >
            {!hideCloseButton && (
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-4 right-4 text-foreground-muted hover:text-foreground transition-colors z-10 p-1 rounded"
                    aria-label="Close modal"
                >
                    <X className="w-5 h-5" aria-hidden="true" />
                </button>
            )}

            {(title || icon) && (
                <div className="flex items-center gap-3 mb-6 pr-8">
                    {icon && (
                        <div className="w-10 h-10 rounded-full bg-accent-orange/20 flex items-center justify-center shrink-0">
                            {icon}
                        </div>
                    )}
                    {title && (
                        <h2 id={titleId} className="text-xl font-bold text-foreground break-words">
                            {title}
                        </h2>
                    )}
                </div>
            )}

            <div className="modal-content">
                {children}
            </div>
        </dialog>
    );

    if (typeof document !== 'undefined') {
        return createPortal(modalContent, document.body);
    }

    return modalContent;
}

export default Modal;
