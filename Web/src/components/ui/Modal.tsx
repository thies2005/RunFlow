'use client';

import React, { useEffect, useRef, ReactNode } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

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
    const dialogRef = useRef<HTMLDivElement>(null);
    const previouslyFocused = useRef<Element | null>(null);
    const titleId = 'modal-title';

    // Focus trap and escape key handler
    useEffect(() => {
        if (!isOpen) return;

        // Save the element that had focus before opening
        previouslyFocused.current = document.activeElement;

        // Move focus into the modal so keyboard users land inside
        const focusTimer = setTimeout(() => {
            const node = dialogRef.current;
            if (!node) return;
            // Prefer the first focusable element, otherwise focus the container
            const focusable = node.querySelector<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            (focusable ?? node).focus();
        }, 0);

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        // Prevent body scrolling
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', handleKeyDown);

        // Capacitor back button handler
        let isCancelled = false;
        let backListener: any = null;
        const setupCapacitor = async () => {
            try {
                const { Capacitor } = await import('@capacitor/core');
                if (Capacitor.isNativePlatform()) {
                    const { App } = await import('@capacitor/app');
                    const listener = await App.addListener('backButton', () => {
                        onClose();
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
            document.body.style.overflow = '';
            document.removeEventListener('keydown', handleKeyDown);
            // Restore focus to the element that opened the modal
            if (previouslyFocused.current instanceof HTMLElement && typeof previouslyFocused.current.focus === 'function') {
                previouslyFocused.current.focus();
            }
            if (backListener) {
                backListener.remove();
            }
        };
    }, [isOpen, onClose]);

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
        <div
            ref={dialogRef}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/[var(--modal-backdrop-opacity,0.5)] backdrop-blur-xs animate-fade-in p-4 sm:p-4 pt-safe pb-safe overflow-y-auto"
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            aria-labelledby={title ? titleId : undefined}
        >
            <div className={`w-full ${maxWidthClasses[maxWidth]} p-6 relative animate-slide-in my-auto mx-auto bg-background/95 backdrop-blur-xl border border-glass-border shadow-2xl`} onClick={e => e.stopPropagation()}>
                {!hideCloseButton && (
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
                        aria-label="Close modal"
                    >
                        <X className="w-5 h-5" />
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
                            <h2 id={titleId} className="text-xl font-bold text-white break-words">
                                {title}
                            </h2>
                        )}
                    </div>
                )}

                <div className="modal-content">
                    {children}
                </div>
            </div>
        </div>
    );

    // Render in portal if we are in the browser
    if (typeof document !== 'undefined') {
        return createPortal(modalContent, document.body);
    }

    return modalContent;
}

export default Modal;
