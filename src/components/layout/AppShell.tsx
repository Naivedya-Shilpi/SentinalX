import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronsLeft, ChevronsRight, Menu, Moon, Presentation, Search, Sun, UploadCloud, X, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { useAppStore, toast } from '@/store/useAppStore';
import { useBenchmarkData } from '@/hooks/useBenchmarkData';
import { useThemeClass } from '@/hooks/useVisuals';
import { NAV, APP_VERSION } from '@/data/nav';
import { METRICS } from '@/data/metrics';
import { datasetColor } from '@/data/datasets';
import { modelColor } from '@/data/models';
import { Button } from '@/components/ui/Button';
import { PageSkeleton, Toaster } from '@/components/ui/Feedback';
import { DatasetSwitcher, SourceBadge } from '@/components/common/Controls';
import { cn } from '@/utils/format';

function Logo({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 64 64" className="h-8 w-8 shrink-0" aria-hidden>
        <defs>
          <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#22D3EE" />
            <stop offset="1" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="14" fill="rgb(var(--surface-2))" />
        <path d="M32 9 51 16v15c0 12-8 20-19 24-11-4-19-12-19-24V16z" fill="none" stroke="url(#lg)" strokeWidth="4" strokeLinejoin="round" />
        <path d="m23 24 18 16M41 24 23 40" stroke="url(#lg)" strokeWidth="4" strokeLinecap="round" />
      </svg>
      {!compact && (
        <div className="leading-tight">
          <p className="text-[15px] font-semibold tracking-tight">
            Sentinel<span className="gradient-text">X</span>
          </p>
          <p className="text-[10px] uppercase tracking-[0.14em] text-subtle">Intrusion Intelligence</p>
        </div>
      )}
    </div>
  );
}

function SidebarContent({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const benchmarks = useAppStore((s) => s.benchmarks);
  const confusion = useAppStore((s) => s.confusion);
  const { datasets } = useBenchmarkData();
  const view = useAppStore((s) => s.datasetView);
  const setView = useAppStore((s) => s.setDatasetView);

  return (
    <div className="flex h-full flex-col">
      <div className={cn('flex h-16 items-center border-b border-line/10', collapsed ? 'justify-center' : 'px-4')}>
        <Logo compact={collapsed} />
      </div>

      <nav aria-label="Primary" className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-3">
        {NAV.map((n) => (
          <NavLink
            key={n.path}
            to={n.path}
            end={n.path === '/'}
            onClick={onNavigate}
            title={collapsed ? n.label : undefined}
            className={({ isActive }) =>
              cn(
                'group relative flex h-10 items-center gap-3 rounded-lg text-[13.5px] font-medium transition-colors',
                collapsed ? 'justify-center' : 'px-3',
                isActive ? 'text-fg' : 'text-muted hover:bg-line/5 hover:text-fg',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-lg border border-cyan/20 bg-gradient-to-r from-cyan/15 to-violet/10"
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                  />
                )}
                {isActive && <motion.span layoutId="nav-bar" className="absolute -left-2.5 h-5 w-[3px] rounded-full bg-cyan shadow-[0_0_12px_rgb(var(--cyan))]" />}
                <n.icon className={cn('relative h-[18px] w-[18px] shrink-0', isActive && 'text-cyan')} />
                {!collapsed && <span className="relative truncate">{n.label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-3 border-t border-line/10 p-3">
        {!collapsed && datasets.length > 0 && (
          <div>
            <p className="label-xs mb-1.5 px-1">Dataset</p>
            <div className="space-y-1">
              {[...datasets, ...(datasets.length > 1 ? ['both'] : [])].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setView(d)}
                  aria-pressed={view === d}
                  className={cn(
                    'flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-xs transition-colors',
                    view === d ? 'bg-line/10 text-fg' : 'text-muted hover:bg-line/5 hover:text-fg',
                  )}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: d === 'both' ? 'rgb(var(--blue))' : datasetColor(d) }} />
                  {d === 'both' ? 'Compare Both' : d}
                </button>
              ))}
            </div>
          </div>
        )}
        {collapsed ? (
          <div className="flex justify-center" title={`Data source: ${benchmarks.source ?? 'none'}`}>
            <span
              className={cn(
                'h-2.5 w-2.5 rounded-full',
                benchmarks.source === 'imported' ? 'bg-emerald' : benchmarks.source === 'demo' ? 'bg-amber' : 'bg-neutral',
              )}
            />
          </div>
        ) : (
          <div className="rounded-lg border border-line/10 bg-surface-2/50 p-2.5">
            <p className="label-xs mb-1.5">Data source</p>
            <div className="flex flex-wrap gap-1.5">
              <SourceBadge source={benchmarks.source} label="Benchmarks" />
              <SourceBadge source={confusion.source} label="Matrices" />
            </div>
            {benchmarks.fileName && <p className="mt-1.5 truncate text-[11px] text-subtle">{benchmarks.fileName}</p>}
          </div>
        )}
        {!collapsed && (
          <p className="num px-1 text-[11px] text-subtle">
            SentinelX {APP_VERSION} · offline batch benchmarks
          </p>
        )}
      </div>
    </div>
  );
}

function GlobalSearch() {
  const { models } = useBenchmarkData();
  const query = useAppStore((s) => s.modelQuery);
  const setQuery = useAppStore((s) => s.setModelQuery);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const matches = useMemo(() => models.filter((m) => m.toLowerCase().includes(query.trim().toLowerCase())), [models, query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const go = (m: string) => {
    setQuery(m);
    setOpen(false);
    navigate('/leaderboard');
  };

  return (
    <div className="relative hidden w-64 md:block lg:w-72">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
      <input
        ref={ref}
        id="global-model-search"
        type="search"
        role="combobox"
        aria-expanded={open}
        aria-controls="global-search-list"
        aria-label="Search models"
        placeholder="Search models…  Ctrl K"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && matches.length) go(matches[0]);
          if (e.key === 'Escape') {
            setOpen(false);
            ref.current?.blur();
          }
        }}
        className="h-9 w-full rounded-lg border border-line/10 bg-surface-2/60 pl-9 pr-8 text-sm text-fg placeholder:text-subtle focus:border-cyan/50 focus:outline-none"
      />
      {query && (
        <button type="button" aria-label="Clear search" onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-subtle hover:text-fg">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      <AnimatePresence>
        {open && (
          <motion.ul
            id="global-search-list"
            role="listbox"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-xl border border-line/15 bg-surface-2/95 p-1 shadow-2xl backdrop-blur-xl"
          >
            {matches.length === 0 ? (
              <li className="px-3 py-2 text-xs text-muted">{models.length ? 'No matching models.' : 'No models loaded.'}</li>
            ) : (
              matches.map((m) => (
                <li key={m} role="option" aria-selected={false}>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => go(m)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-line/10">
                    <span className="h-2 w-2 rounded-full" style={{ background: modelColor(m) }} />
                    {m}
                  </button>
                </li>
              ))
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function usePresentationMode() {
  const presentation = useAppStore((s) => s.presentation);
  const setPresentation = useAppStore((s) => s.setPresentation);

  useEffect(() => {
    const onFs = () => {
      if (!document.fullscreenElement && useAppStore.getState().presentation) setPresentation(false);
    };
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, [setPresentation]);

  const enter = async () => {
    setPresentation(true);
    try {
      await document.documentElement.requestFullscreen?.();
    } catch {
      toast({ kind: 'info', title: 'Presentation mode', description: 'Full-screen was blocked by the browser; the distraction-free layout is still active. Press Esc to exit.' });
    }
  };
  const exit = async () => {
    setPresentation(false);
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
  };
  return { presentation, enter, exit };
}

export function AppShell() {
  useThemeClass();
  const location = useLocation();
  const navigate = useNavigate();
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const storageError = useAppStore((s) => s.storageError);
  const rankingMetric = useAppStore((s) => s.rankingMetric);
  const view = useAppStore((s) => s.datasetView);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { presentation, enter, exit } = usePresentationMode();

  const current = NAV.find((n) => (n.path === '/' ? location.pathname === '/' : location.pathname.startsWith(n.path))) ?? NAV[0];
  const slides = NAV.filter((n) => n.slide);
  const slideIndex = slides.findIndex((s) => s.path === current.path);

  useEffect(() => setMobileOpen(false), [location.pathname]);
  useEffect(() => {
    document.title = `${current.title} · SentinelX`;
  }, [current.title]);
  useEffect(() => window.scrollTo({ top: 0 }), [location.pathname]);

  useEffect(() => {
    if (!presentation) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(t.tagName)) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        navigate(slides[(slideIndex + 1 + slides.length) % slides.length].path);
      }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        navigate(slides[(slideIndex - 1 + slides.length) % slides.length].path);
      }
      if (e.key === 'Escape') exit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const goSlide = (d: number) => navigate(slides[(Math.max(slideIndex, 0) + d + slides.length) % slides.length].path);

  return (
    <div className={cn('min-h-screen', presentation && 'presentation')}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[200] focus:rounded-lg focus:bg-cyan focus:px-3 focus:py-2 focus:text-sm focus:text-[#04121a]">
        Skip to content
      </a>

      {!presentation && (
        <aside className={cn('fixed inset-y-0 left-0 z-40 hidden border-r border-line/10 bg-bg-2/80 backdrop-blur-xl transition-[width] duration-300 lg:block', collapsed ? 'w-[68px]' : 'w-64')}>
          <SidebarContent collapsed={collapsed} />
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="absolute -right-3 top-[72px] grid h-6 w-6 place-items-center rounded-full border border-line/20 bg-surface-2 text-muted shadow-lg transition-colors hover:text-fg"
          >
            {collapsed ? <ChevronsRight className="h-3.5 w-3.5" /> : <ChevronsLeft className="h-3.5 w-3.5" />}
          </button>
        </aside>
      )}

      <AnimatePresence>
        {mobileOpen && !presentation && (
          <div className="fixed inset-0 z-[60] lg:hidden">
            <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              className="absolute inset-y-0 left-0 w-64 border-r border-line/10 bg-bg-2"
            >
              <SidebarContent collapsed={false} onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className={cn('transition-[padding] duration-300', !presentation && (collapsed ? 'lg:pl-[68px]' : 'lg:pl-64'))}>
        {!presentation ? (
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line/10 bg-bg/70 px-4 backdrop-blur-xl md:px-6">
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight">{current.title}</p>
              <p className="hidden truncate text-[11px] text-subtle sm:block">
                Active dataset: <span className="text-muted">{view === 'both' ? 'Compare Both' : view}</span>
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="hidden xl:block">
                <DatasetSwitcher size="sm" />
              </div>
              <GlobalSearch />
              <NavLink
                to="/import"
                className="hidden h-9 items-center gap-2 rounded-lg border border-line/10 bg-surface-2/80 px-3 text-[13px] font-medium text-fg transition-colors hover:border-line/25 sm:inline-flex"
              >
                <UploadCloud className="h-4 w-4 text-cyan" /> Import data
              </NavLink>
              <Button variant="ghost" size="icon" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
              </Button>
              <Button variant="outline" size="md" onClick={enter} aria-label="Enter presentation mode" className="px-3">
                <Presentation className="h-4 w-4" /> <span className="hidden sm:inline">Present</span>
              </Button>
            </div>
          </header>
        ) : (
          <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-line/10 bg-bg/80 px-6 backdrop-blur-xl">
            <Logo />
            <div className="mx-2 hidden h-6 w-px bg-line/15 md:block" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{current.title}</p>
            </div>
            <div className="ml-4 hidden items-center gap-2 text-xs md:flex">
              <span className="rounded-full border border-line/15 bg-surface-2 px-2.5 py-1 text-muted">
                Dataset: <span className="font-medium text-fg">{view === 'both' ? 'Compare Both' : view}</span>
              </span>
              <span className="rounded-full border border-cyan/25 bg-cyan/10 px-2.5 py-1 text-muted">
                Ranking: <span className="font-medium text-cyan">{METRICS[rankingMetric].label}</span>
              </span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="secondary" size="icon-sm" aria-label="Previous slide" onClick={() => goSlide(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="num w-12 text-center text-xs text-muted">
                {Math.max(slideIndex, 0) + 1} / {slides.length}
              </span>
              <Button variant="secondary" size="icon-sm" aria-label="Next slide" onClick={() => goSlide(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="danger" size="sm" onClick={exit} aria-label="Exit presentation mode">
                <X className="h-4 w-4" /> Exit
              </Button>
            </div>
          </header>
        )}

        {storageError && (
          <div role="alert" className="flex items-center gap-2 border-b border-amber/25 bg-amber/10 px-6 py-2 text-xs text-amber">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {storageError}
          </div>
        )}

        <main id="main" className={cn('mx-auto w-full px-4 py-6 md:px-6 md:py-8', presentation ? 'max-w-[1800px] text-[1.04em]' : 'max-w-[1500px]')}>
          <AnimatePresence mode="wait">
            <motion.div key={location.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}>
              <Suspense fallback={<PageSkeleton />}>
                <Outlet />
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <Toaster />
    </div>
  );
}
