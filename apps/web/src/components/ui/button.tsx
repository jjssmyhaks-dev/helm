import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-helm-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-r from-helm-600 to-helm-500 text-white shadow-lg shadow-helm-500/20 hover:from-helm-500 hover:to-helm-400 hover:shadow-xl hover:shadow-helm-500/30 active:scale-[0.98]',
        destructive:
          'bg-red-500 text-white shadow-lg shadow-red-500/20 hover:bg-red-600 active:scale-[0.98]',
        outline:
          'border border-surface-300 bg-transparent text-surface-700 hover:bg-surface-100 hover:text-white hover:border-surface-400',
        secondary:
          'bg-surface-100 text-surface-700 hover:bg-surface-200 hover:text-white',
        ghost:
          'text-surface-600 hover:bg-surface-100 hover:text-white',
        link:
          'text-helm-400 underline-offset-4 hover:underline hover:text-helm-300',
        glow:
          'bg-gradient-to-r from-helm-600 to-helm-500 text-white shadow-lg shadow-helm-500/25 hover:shadow-xl hover:shadow-helm-500/40 hover:from-helm-500 hover:to-helm-400 active:scale-[0.98] ring-1 ring-helm-400/20',
      },
      size: {
        default: 'h-10 px-5 py-2',
        sm: 'h-8 rounded-lg px-3 text-xs',
        lg: 'h-12 rounded-xl px-8 text-base',
        xl: 'h-14 rounded-2xl px-10 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
