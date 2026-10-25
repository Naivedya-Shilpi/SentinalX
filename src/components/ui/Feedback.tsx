import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToasts, type ToastKind } from '@/store/useAppStore';
import { useCountUp } from '@/hooks/useVisuals';
import { cn } from '@/utils/format';

/* ---------------- Empty state ---------------- */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact,
}: {
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'gap-2 py-8' : 'gap-3 py-14', className)}>
      <div className="relative">
        <div className="absolute inset-0 rounded-2xl bg-cyan/20 blur-xl" />
        <div className="relative grid h-12 w-12 place-items-center rounded-2xl border border-line/15 bg-surface-2 text-muted">{icon}</div>
      </div>
      <h3 className="mt-1 text-sm font-semibold text-fg">{title}</h3>
      {description && <p className="max-w-md text-[13px] leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ImportPrompt({ what }: { what: string }) {
  return (
    <Link
      to="/import"
      className="inline-flex h-9 items-center gap-2 rounded-lg border border-cyan/30 px-4 text-sm font-medium text-cyan transition-colors hover:bg-cyan/10"
    >
      Import {what}
    </Link>
  );
}

/* ---------------- Skeleton ---------------- */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-lg bg-line/5', className)}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-line/10 to-transparent" />
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading page">
      <Skeleton className="h-10 w-72" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-80" />
    </div>
  );
}

/* ---------------- Animated number ---------------- */
export function AnimatedNumber({
  value,
  format,
  className,
}: {
  value: number | null;
  format: (v: number) => string;
  className?: string;
}) {
  const v = useCountUp(value);
  return <span className={cn('num', className)}>{v == null ? '—' : format(v)}</span>;
}

/* ---------------- Toaster ---------------- */
const TOAST_ICON: Record<ToastKind, ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 text-emerald" />,
  error: <XCircle className="h-4 w-4 text-coral" />,
  warning: <AlertTriangle className="h-4 w-4 text-amber" />,
  info: <Info className="h-4 w-4 text-cyan" />,
};

export function Toaster() {
  const { toasts, dismiss } = useToasts();
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className="pointer-events-auto flex items-start gap-3 rounded-xl border border-line/15 bg-surface-2/95 p-3.5 shadow-2xl backdrop-blur-xl"
            role={t.kind === 'error' ? 'alert' : 'status'}
          >
            <div className="mt-0.5">{TOAST_ICON[t.kind]}</div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{t.title}</p>
              {t.description && <p className="mt-0.5 text-xs leading-relaxed text-muted">{t.description}</p>}
            </div>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dismiss(t.id)}
              className="rounded p-0.5 text-subtle hover:text-fg"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ---------------- Callout ---------------- */
export function Callout({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: 'info' | 'warning' | 'success' | 'danger';
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const styles = {
    info: 'border-cyan/20 bg-cyan/[0.06] text-cyan',
    warning: 'border-amber/25 bg-amber/[0.07] text-amber',
    success: 'border-emerald/25 bg-emerald/[0.07] text-emerald',
    danger: 'border-coral/25 bg-coral/[0.07] text-coral',
  }[tone];
  const Icon = { info: Info, warning: AlertTriangle, success: CheckCircle2, danger: XCircle }[tone];
  return (
    <div className={cn('flex gap-3 rounded-xl border px-4 py-3', styles, className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 text-[13px] leading-relaxed text-fg/85">
        {title && <p className="mb-0.5 font-semibold text-fg">{title}</p>}
        {children}
      </div>
    </div>
  );
}
