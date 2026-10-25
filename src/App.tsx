import { Component, lazy, type ErrorInfo, type ReactNode } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { EmptyState } from '@/components/ui/Feedback';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, Compass } from 'lucide-react';

const Overview = lazy(() => import('@/pages/Overview'));
const Leaderboard = lazy(() => import('@/pages/Leaderboard'));
const Comparison = lazy(() => import('@/pages/Comparison'));
const DatasetExplorer = lazy(() => import('@/pages/DatasetExplorer'));
const ConfusionLab = lazy(() => import('@/pages/ConfusionLab'));
const Insights = lazy(() => import('@/pages/Insights'));
const Methodology = lazy(() => import('@/pages/Methodology'));
const DataImport = lazy(() => import('@/pages/DataImport'));

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('SentinelX render error', error, info.componentStack);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <EmptyState
        icon={<AlertTriangle className="h-5 w-5 text-amber" />}
        title="Something went wrong rendering this page"
        description={this.state.error.message}
        action={
          <Button variant="outline" onClick={() => this.setState({ error: null })}>
            Try again
          </Button>
        }
      />
    );
  }
}

function NotFound() {
  return (
    <EmptyState
      icon={<Compass className="h-5 w-5" />}
      title="Page not found"
      description="That route does not exist."
      action={
        <Link to="/" className="text-sm text-cyan hover:underline">
          Back to Overview
        </Link>
      }
    />
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Overview />} />
          <Route path="leaderboard" element={<Leaderboard />} />
          <Route path="comparison" element={<Comparison />} />
          <Route path="datasets" element={<DatasetExplorer />} />
          <Route path="confusion" element={<ConfusionLab />} />
          <Route path="insights" element={<Insights />} />
          <Route path="methodology" element={<Methodology />} />
          <Route path="import" element={<DataImport />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
