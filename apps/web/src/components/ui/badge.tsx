import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-helm-500/40 focus:ring-offset-2 focus:ring-offset-surface-0',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-helm-500/15 text-helm-400',
        secondary:
          'border-transparent bg-surface-200 text-surface-600',
        destructive:
          'border-transparent bg-red-500/15 text-red-400',
        outline:
          'border-surface-300/50 text-surface-600',
        success:
          'border-transparent bg-emerald-500/15 text-emerald-400',
        warning:
          'border-transparent bg-amber-500/15 text-amber-400',
        glow:
          'border-helm-500/20 bg-helm-500/10 text-helm-400 shadow-sm shadow-helm-500/10',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
