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
                    <label htmlFor={inputId} className="block text-sm font-medium text-gray-300 mb-1.5">
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    id={inputId}
                    className={`
                        w-full bg-black/20 border rounded-xl px-4 py-2.5 text-white placeholder-gray-500
                        focus:outline-hidden focus:ring-2 focus:ring-accent-orange/50 transition-all
                        ${error ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-accent-orange'}
                    `}
                    {...props}
                />
                {error && (
                    <p className="mt-1.5 text-xs text-red-400">{error}</p>
                )}
                {helperText && !error && (
                    <p className="mt-1.5 text-xs text-gray-500">{helperText}</p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';
