import { TextareaHTMLAttributes, forwardRef } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className = '', label, error, helperText, id, ...props }, ref) => {
        const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');

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
                    className={`
                        w-full bg-background-tertiary border rounded-xl px-4 py-3 text-foreground placeholder-foreground-muted
                        focus:outline-hidden focus:ring-2 focus:ring-accent-orange/50 transition-all min-h-[100px] resize-y
                        ${error ? 'border-red-500/50 focus:border-red-500' : 'border-foreground/10 focus:border-accent-orange'}
                    `}
                    {...props}
                />
                {error && (
                    <p className="mt-1.5 text-xs text-red-400">{error}</p>
                )}
                {helperText && !error && (
                    <p className="mt-1.5 text-xs text-foreground-muted">{helperText}</p>
                )}
            </div>
        );
    }
);

Textarea.displayName = 'Textarea';
