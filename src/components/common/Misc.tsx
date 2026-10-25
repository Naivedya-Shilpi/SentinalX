import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Database } from 'lucide-react';
import { EmptyState } from '@/components/ui/Feedback';
import { UploadCloud } from 'lucide-react';

/** Standard empty state when no benchmark rows exist. */
export function NoDataState() {
  return (
    <EmptyState
      icon={<Database className="h-5 w-5" />}
      title="No benchmark data loaded"
      description="Import a benchmark CSV exported from Databricks, or reset to the built-in demo data."
      action={
        <Link to="/import" className="inline-flex h-9 items-center gap-2 rounded-lg border border-cyan/30 px-4 text-sm font-medium text-cyan hover:bg-cyan/10">
          <UploadCloud className="h-4 w-4" /> Go to Data Import
        </Link>
      }
    />
  );
}

export function Stagger({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }} className={className}>
      {children}
    </motion.div>
  );
}

export function LinkArrow({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1 text-[13px] font-medium text-cyan hover:underline">
      {children} <ArrowUpRight className="h-3.5 w-3.5" />
    </Link>
  );
}
