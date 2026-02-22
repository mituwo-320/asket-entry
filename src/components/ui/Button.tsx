import { ButtonHTMLAttributes, forwardRef } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'glass';
    size?: 'sm' | 'md' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                    'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.97] touch-manipulation',
                    {
                        'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white hover:from-indigo-400 hover:to-indigo-500 shadow-lg shadow-indigo-500/25 border border-indigo-400/20':
                            variant === 'primary',
                        'bg-slate-800 text-white hover:bg-slate-700 border border-slate-700': variant === 'secondary',
                        'border border-slate-700 hover:bg-slate-800 hover:border-slate-600 text-slate-200 bg-slate-900/50 backdrop-blur-sm':
                            variant === 'outline',
                        'hover:bg-slate-800/50 text-slate-200': variant === 'ghost',
                        'bg-white/5 hover:bg-white/10 text-white border border-white/10 backdrop-blur-md shadow-xl': variant === 'glass',
                        'min-h-[36px] px-4 py-1.5 text-sm': size === 'sm',
                        'min-h-[44px] px-6 py-2.5 text-base': size === 'md', // 44px for comfortable mobile tap
                        'min-h-[56px] px-8 py-3.5 text-lg': size === 'lg',
                    },
                    className
                )}
                {...props}
            />
        );
    }
);
Button.displayName = 'Button';

export { Button, cn };
