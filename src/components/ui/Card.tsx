import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/utils/format';

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & { glow?: 'cyan' | 'emerald' | false; interactive?: boolean }>(
  ({ className, glow = false, interactive = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'card relative',
        interactive && 'card-hover',
        glow === 'cyan' && 'shadow-glow',
        glow === 'emerald' && 'shadow-glow-emerald',
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = 'Card';

interface CardHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
  as?: 'h2' | 'h3';
}

export function CardHeader({ title, subtitle, icon, actions, className, as: Tag = 'h3' }: CardHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3 px-5 pt-5', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line/10 bg-surface-2 text-cyan">{icon}</div>
        )}
        <div className="min-w-0">
          <Tag className="text-[15px] font-semibold tracking-tight text-fg">{title}</Tag>
          {subtitle && <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...props} />;
}
