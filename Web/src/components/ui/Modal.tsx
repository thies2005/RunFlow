'use client';

import React, { useEffect, useRef, useId, ReactNode } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

const openDialogs: HTMLElement[] = [];
let previousBodyOverflow = '';

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

        if (openDialogs.length === 0) previousBodyOverflow = document.body.style.overflow;
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
            } else if (e.key === 'Tab' && dialogRef.current) {
                const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
                    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                )).filter(el => el.getClientRects().length > 0);
                if (!items.length) { e.preventDefault(); dialogRef.current.focus(); return; }
                const first = items[0];
                const last = items[items.length - 1];
                if (e.shiftKey && (document.activeElement === first || !dialogRef.current.contains(document.activeElement))) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && (document.activeElement === last || !dialogRef.current.contains(document.activeElement))) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };

        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', handleKeyDown);

        let isCancelled = false;
        let backListener: any = null;
        const setupCapacitor = async () => {
            try {
                const { Capacitor } = await import('@capacitor/core');
                if (Capacitor.isNativePlatform()) {
                    const { App } = await import('@capacitor/app');
                    const listener = await App.addListener('backButton', () => {
                        if (openDialogs[openDialogs.length - 1] === dialog) onCloseRef.current();
                    });
                    if (isCancelled) {
                        listener.remove();
                    } else {
                        backListener = listener;
                    }
                }
            } catch (e) {
                console.error('Failed to setup capacitor back button', e);
            }
        };
        setupCapacitor();

        return () => {
            clearTimeout(focusTimer);
            isCancelled = true;
            const index = openDialogs.indexOf(dialog);
            if (index !== -1) openDialogs.splice(index, 1);
            if (openDialogs.length === 0) document.body.style.overflow = previousBodyOverflow;
            document.removeEventListener('keydown', handleKeyDown);
            if (typeof dialog.close === 'function') {
                if (dialog.open) dialog.close();
            } else {
                dialog.removeAttribute('open');
            }
            if (index === openDialogs.length && previouslyFocused.current instanceof HTMLElement && typeof previouslyFocused.current.focus === 'function') {
                previouslyFocused.current.focus();
            }
            if (backListener) {
                backListener.remove();
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
        'full': 'max-w-full m-4',
    };

    const modalContent = (
        <dialog
            ref={dialogRef}
            className="fixed inset-0 m-0 max-w-none max-h-none w-full h-full z-[210] flex items-center justify-center bg-black/[var(--modal-backdrop-opacity,0.55)] border-0 text-foreground animate-fade-in p-4 sm:p-4 pt-safe pb-safe overflow-y-auto"
            aria-modal="true"
            tabIndex={-1}
            aria-labelledby={title ? titleId : undefined}
            onCancel={(e) => {
                // Escape closing is orchestrated through the openDialogs stack.
                e.preventDefault();
                if (openDialogs[openDialogs.length - 1] === dialogRef.current) {
                    onCloseRef.current();
                }
            }}
            onClick={(e) => {
                if (e.target === dialogRef.current && openDialogs[openDialogs.length - 1] === dialogRef.current) {
                    onCloseRef.current();
                }
            }}
        >
            <div
                className={`w-full ${maxWidthClasses[maxWidth]} p-6 relative animate-slide-in my-auto mx-auto bg-background-secondary border border-line rounded-md shadow-lg max-h-[90vh] overflow-y-auto`}
                onClick={e => e.stopPropagation()}
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
            </div>
        </dialog>
    );

    if (typeof document !== 'undefined') {
        return createPortal(modalContent, document.body);
    }

    return modalContent;
}

export default Modal;
