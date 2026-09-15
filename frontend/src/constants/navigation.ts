import {
  LayoutDashboard,
  CalendarClock,
  Wrench,
  Layers,
  TrainFront,
  AlertTriangle,
  GitFork,
  Flame,
  Activity,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  badge?: string;
  badgeType?: 'default' | 'danger';
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/',
    icon: LayoutDashboard,
    description: 'Corridor overview, KPIs, active blocks, and performance metrics',
  },
  {
    id: 'planning',
    label: 'Planning',
    path: '/planning',
    icon: CalendarClock,
    badge: 'OPTIMAL',
    description: 'Corridor timetable, possession blocks, and 3D digital twin',
  },
  {
    id: 'tasks',
    label: 'Maintenance Tasks',
    path: '/tasks',
    icon: Wrench,
    badge: '4 P1',
    badgeType: 'danger',
    description: 'Civil Engineering, Traction (OHE), and S&T work items',
  },
  {
    id: 'shadow-blocks',
    label: 'Shadow Blocks',
    path: '/shadow-blocks',
    icon: Layers,
    badge: '2 New',
    description: 'Joint-possession opportunities across multiple departments',
  },
  {
    id: 'trains',
    label: 'Trains',
    path: '/trains',
    icon: TrainFront,
    description: 'Timetable movements, speed classes, and disruption penalties',
  },
  {
    id: 'conflicts',
    label: 'Conflicts & Alerts',
    path: '/conflicts',
    icon: AlertTriangle,
    badge: '3',
    badgeType: 'danger',
    description: 'Train overlaps, resource contention, and safety rule violations',
  },
  {
    id: 'what-if',
    label: 'What-If',
    path: '/what-if',
    icon: GitFork,
    description: 'Interactive disruption simulation and re-optimization diff',
  },
  {
    id: 'emergency',
    label: 'Emergency Planning',
    path: '/emergency',
    icon: Flame,
    description: 'Urgent defect injection and expedited block insertion',
  },
];
