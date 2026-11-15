import { TextareaHTMLAttributes, forwardRef, useId } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className = '', label, error, helperText, id, 'aria-describedby': ariaDescribedBy, ...props }, ref) => {
        const generatedId = useId();
        const textareaId = id || generatedId;
        const messageId = `${textareaId}-message`;
        const hasMessage = Boolean(error || helperText);
        const describedBy = [ariaDescribedBy, hasMessage ? messageId : undefined].filter(Boolean).join(' ') || undefined;

        return (
            <div className={`w-full ${className}`}>
                {label && (
                    <label htmlFor={textareaId} className="block text-sm font-medium text-foreground-muted mb-1.5">
                        {label}
                    </label>
                )}
                <textarea
                    ref={ref}
                    id={textareaId}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={describedBy}
                    className={`
                        w-full bg-background-secondary border border-line rounded-md px-4 py-3 text-base sm:text-sm text-foreground placeholder:text-foreground-muted
                        focus:outline-hidden focus:ring-2 focus:ring-accent-orange/50 transition-colors
                        [field-sizing:content] [min-block-size:3lh] [max-block-size:10lh] resize-y
                        user-invalid:border-negative
                        ${error ? 'border-negative focus:border-negative' : 'focus:border-accent-orange'}
                    `}
                    {...props}
                />
                {error && (
                    <p id={messageId} className="mt-1.5 text-xs text-negative">{error}</p>
                )}
                {helperText && !error && (
                    <p id={messageId} className="mt-1.5 text-xs text-foreground-muted">{helperText}</p>
                )}
            </div>
        );
    }
);

Textarea.displayName = 'Textarea';
