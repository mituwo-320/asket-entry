import { InputHTMLAttributes, forwardRef } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, id, ...props }, ref) => {
        return (
            <div className="flex flex-col gap-2 w-full">
                {label && (
                    <label htmlFor={id} className="text-sm font-medium text-slate-300 ml-1 tracking-wide">
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    id={id}
                    className={cn(
                        'flex min-h-[44px] w-full rounded-xl border border-slate-700/50 bg-slate-900/40 px-4 py-2 text-base text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 backdrop-blur-md shadow-inner shadow-black/20',
                        className
                    )}
                    {...props}
                />
            </div>
        );
    }
);
Input.displayName = 'Input';

export { Input };
