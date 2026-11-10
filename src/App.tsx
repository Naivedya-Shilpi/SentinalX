import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { EmptyState } from '@/components/ui/Feedback';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, Compass } from 'lucide-react';
import Overview from '@/pages/Overview';
import Leaderboard from '@/pages/Leaderboard';
import Comparison from '@/pages/Comparison';
import DatasetExplorer from '@/pages/DatasetExplorer';
import ConfusionLab from '@/pages/ConfusionLab';
import Insights from '@/pages/Insights';
import Methodology from '@/pages/Methodology';
import DataImport from '@/pages/DataImport';

class ErrorBoundary extends Component<{ resetKey?: string; children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidUpdate(prevProps: { resetKey?: string }) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
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
  const location = useLocation();
  return (
    <ErrorBoundary resetKey={location.pathname}>
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
