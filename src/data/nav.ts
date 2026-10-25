import { LayoutDashboard, Trophy, GitCompare, Database, Grid2x2, Lightbulb, Workflow, UploadCloud, type LucideIcon } from 'lucide-react';

export interface NavItem {
  path: string;
  label: string;
  title: string;
  icon: LucideIcon;
  /** Included in presentation-mode slide navigation. */
  slide?: boolean;
}

export const NAV: NavItem[] = [
  { path: '/', label: 'Overview', title: 'Overview', icon: LayoutDashboard, slide: true },
  { path: '/leaderboard', label: 'Model Leaderboard', title: 'Model Leaderboard', icon: Trophy, slide: true },
  { path: '/comparison', label: 'Model Comparison', title: 'Model Comparison', icon: GitCompare, slide: true },
  { path: '/datasets', label: 'Dataset Explorer', title: 'Dataset Explorer', icon: Database },
  { path: '/confusion', label: 'Confusion Matrix Lab', title: 'Confusion Matrix Lab', icon: Grid2x2, slide: true },
  { path: '/insights', label: 'Evaluation Insights', title: 'Evaluation Insights', icon: Lightbulb, slide: true },
  { path: '/methodology', label: 'Methodology', title: 'Methodology', icon: Workflow, slide: true },
  { path: '/import', label: 'Data Import', title: 'Data Import', icon: UploadCloud },
];

export const APP_VERSION = 'v1.0.0';
