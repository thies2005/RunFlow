import { InputHTMLAttributes, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className = '', label, error, helperText, id, ...props }, ref) => {
        const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

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
                    className={`
                        w-full bg-background-secondary border border-line rounded-md px-4 py-2.5 text-foreground placeholder:text-foreground-muted
                        focus:outline-hidden focus:ring-2 focus:ring-accent-orange/50 transition-colors
                        ${error ? 'border-negative focus:border-negative' : 'focus:border-accent-orange'}
                    `}
                    {...props}
                />
                {error && (
                    <p className="mt-1.5 text-xs text-negative">{error}</p>
                )}
                {helperText && !error && (
                    <p className="mt-1.5 text-xs text-foreground-muted">{helperText}</p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';
