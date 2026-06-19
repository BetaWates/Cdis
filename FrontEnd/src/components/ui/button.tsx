import React from 'react';
import { cn } from '../../utils/cn';

type ButtonVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  default:
    'bg-[#00236f] text-white hover:bg-[#1e3a8a] shadow-sm active:scale-[0.98]',
  secondary:
    'bg-[#dce1ff]/30 text-[#00236f] border border-[#b6c4ff] hover:bg-[#dce1ff]/60',
  destructive:
    'bg-[#ba1a1a] text-white hover:bg-red-800 shadow-sm active:scale-[0.98]',
  outline:
    'border border-[#c5c5d3] bg-white text-[#444651] hover:bg-[#f3f4f5] hover:text-[#191c1d]',
  ghost:
    'bg-transparent text-[#444651] hover:bg-[#f3f4f5] hover:text-[#191c1d]',
  link: 'bg-transparent text-[#00236f] underline-offset-4 hover:underline p-0 h-auto',
};

const sizeClasses: Record<ButtonSize, string> = {
  default: 'px-4 py-2 text-xs font-bold',
  sm: 'px-3 py-1.5 text-[11px] font-bold',
  lg: 'px-6 py-2.5 text-sm font-bold',
  icon: 'p-2 w-8 h-8',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', size = 'default', className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-1.5 rounded-lg transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00236f] disabled:opacity-50 disabled:pointer-events-none',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
