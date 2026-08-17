import { SelectHTMLAttributes, forwardRef, ReactNode } from 'react';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    helperText?: string;
    children: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ className = '', label, error, helperText, id, children, ...props }, ref) => {
        const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

        return (
            <div className={`w-full ${className}`}>
                {label && (
                    <label htmlFor={selectId} className="block text-sm font-medium text-foreground-muted mb-1.5">
                        {label}
                    </label>
                )}
                <div className="relative">
                    <select
                        ref={ref}
                        id={selectId}
                        className={`
                            w-full bg-background-tertiary border rounded-xl px-4 py-2.5 text-foreground appearance-none
                            focus:outline-hidden focus:ring-2 focus:ring-accent-orange/50 transition-all
                            ${error ? 'border-red-500/50 focus:border-red-500' : 'border-foreground/10 focus:border-accent-orange'}
                        `}
                        {...props}
                    >
                        {children}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-foreground-muted">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd" />
                        </svg>
                    </div>
                </div>
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

Select.displayName = 'Select';
