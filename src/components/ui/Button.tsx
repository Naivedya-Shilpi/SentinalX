import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/format';

const buttonVariants = cva(
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary:
          'bg-gradient-to-b from-cyan to-cyan/80 text-[#04121a] shadow-[0_0_0_1px_rgb(var(--cyan)/0.5),0_8px_24px_-8px_rgb(var(--cyan)/0.6)] hover:brightness-110',
        secondary: 'border border-line/10 bg-surface-2/80 text-fg hover:border-line/25 hover:bg-surface-2',
        ghost: 'text-muted hover:bg-line/5 hover:text-fg',
        danger: 'border border-coral/30 bg-coral/10 text-coral hover:bg-coral/20',
        outline: 'border border-cyan/30 text-cyan hover:bg-cyan/10',
      },
      size: {
        sm: 'h-8 px-3 text-[13px]',
        md: 'h-9 px-4',
        lg: 'h-11 px-5 text-[15px]',
        icon: 'h-9 w-9',
        'icon-sm': 'h-8 w-8',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, type = 'button', ...props }, ref) => (
  <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
));
Button.displayName = 'Button';
