import { useId, useState, type ReactNode } from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/utils/format';

interface InfoTipProps {
  content: ReactNode;
  children?: ReactNode;
  side?: 'top' | 'bottom';
  align?: 'center' | 'start' | 'end';
  className?: string;
  label?: string;
}

/** Hover / focus tooltip. Keyboard accessible via the trigger button. */
export function InfoTip({ content, children, side = 'top', align = 'center', className, label = 'More information' }: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={children ? undefined : label}
        aria-describedby={open ? id : undefined}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        className="inline-flex items-center gap-1 rounded text-subtle transition-colors hover:text-fg"
      >
        {children ?? <Info className="h-3.5 w-3.5" />}
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className={cn(
            'pointer-events-none absolute z-50 w-64 rounded-lg border border-line/15 bg-surface-2/95 px-3 py-2 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-fg shadow-2xl backdrop-blur-xl',
            side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
            align === 'center' && 'left-1/2 -translate-x-1/2',
            align === 'start' && 'left-0',
            align === 'end' && 'right-0',
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}
