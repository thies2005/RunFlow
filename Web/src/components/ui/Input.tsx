import { InputHTMLAttributes, forwardRef, useId } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className = '', label, error, helperText, id, 'aria-describedby': ariaDescribedBy, ...props }, ref) => {
        const generatedId = useId();
        const inputId = id || generatedId;
        const messageId = `${inputId}-message`;
        const hasMessage = Boolean(error || helperText);
        const describedBy = [ariaDescribedBy, hasMessage ? messageId : undefined].filter(Boolean).join(' ') || undefined;

        return (
            <div className={`w-full ${className}`}>
                {label && (
                    <label htmlFor={inputId} className="block text-sm font-medium text-foreground-muted mb-1.5">
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    id={inputId}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={describedBy}
                    className={`
                        w-full bg-background-secondary border border-line rounded-md px-4 py-2.5 text-base sm:text-sm text-foreground placeholder:text-foreground-muted
                        focus:outline-hidden focus:ring-2 focus:ring-accent-orange/50 transition-colors
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

Input.displayName = 'Input';
