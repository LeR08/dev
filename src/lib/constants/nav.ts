import {
  BookMarked,
  Compass,
  GraduationCap,
  LayoutDashboard,
  NotebookPen,
  Star,
  Target,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { routes } from './routes';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Affiché dans la barre du bas sur mobile (5 entrées maximum). */
  mobile?: boolean;
}

export const mainNav: NavItem[] = [
  { href: routes.dashboard, label: 'Accueil', icon: LayoutDashboard, mobile: true },
  { href: routes.explore, label: 'Explorer', icon: Compass, mobile: true },
  { href: routes.myCourses, label: 'Mes formations', icon: GraduationCap, mobile: true },
  { href: routes.progress, label: 'Ma progression', icon: TrendingUp, mobile: true },
  { href: routes.notes, label: 'Mes notes', icon: NotebookPen },
  { href: routes.favorites, label: 'Mes favoris', icon: Star },
  { href: routes.goals, label: 'Mes objectifs', icon: Target },
];

export const mobileNav: NavItem[] = [
  ...mainNav.filter((item) => item.mobile),
  { href: routes.notes, label: 'Notes', icon: BookMarked, mobile: true },
];

export const adminNav = [
  { href: routes.admin, label: "Vue d'ensemble" },
  { href: routes.adminTree, label: 'Arborescence' },
  { href: routes.adminCourses, label: 'Formations' },
  { href: routes.adminLevels, label: 'Parcours' },
  { href: routes.adminSubjects, label: 'Domaines' },
  { href: routes.adminAccessCodes, label: "Codes d'accès" },
  { href: routes.adminUsers, label: 'Membres' },
  { href: routes.adminBadges, label: 'Badges' },
] as const;
