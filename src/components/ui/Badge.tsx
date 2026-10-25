import type { HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/format';

const badgeVariants = cva('inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4', {
  variants: {
    tone: {
      neutral: 'border-line/15 bg-line/5 text-muted',
      cyan: 'border-cyan/30 bg-cyan/10 text-cyan',
      violet: 'border-violet/30 bg-violet/10 text-violet',
      emerald: 'border-emerald/30 bg-emerald/10 text-emerald',
      coral: 'border-coral/30 bg-coral/10 text-coral',
      amber: 'border-amber/30 bg-amber/10 text-amber',
      blue: 'border-blue/30 bg-blue/10 text-blue',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>['tone']>;

export function Badge({ className, tone, dot, ...props }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants> & { dot?: boolean }) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {props.children}
    </span>
  );
}
