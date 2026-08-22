'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Award,
  FolderTree,
  GraduationCap,
  KeyRound,
  Layers,
  LayoutDashboard,
  Tags,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { routes } from '@/lib/constants/routes';
import { cn } from '@/lib/utils';
import type { Enums } from '@/types/database.types';

const items: Array<{ href: string; label: string; icon: LucideIcon; adminOnly?: boolean }> = [
  { href: routes.admin, label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: routes.adminTree, label: 'Arborescence', icon: FolderTree },
  { href: routes.adminCourses, label: 'Formations', icon: GraduationCap },
  { href: routes.adminLevels, label: 'Parcours', icon: Layers },
  { href: routes.adminSubjects, label: 'Domaines', icon: Tags },
  { href: routes.adminAccessCodes, label: "Codes d'accès", icon: KeyRound, adminOnly: true },
  { href: routes.adminUsers, label: 'Membres', icon: Users, adminOnly: true },
  { href: routes.adminBadges, label: 'Badges', icon: Award, adminOnly: true },
];

export function AdminNav({
  role,
  horizontal = false,
}: {
  role: Enums<'user_role'>;
  horizontal?: boolean;
}) {
  const pathname = usePathname();
  const visible = items.filter((item) => !item.adminOnly || role === 'admin');

  return (
    <nav
      className={cn(
        horizontal ? 'no-scrollbar flex gap-1 overflow-x-auto' : 'space-y-1',
      )}
      aria-label="Navigation de l'administration"
    >
      {visible.map((item) => {
        const active =
          item.href === routes.admin
            ? pathname === routes.admin
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
              active
                ? 'bg-primary-muted text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <item.icon className="size-4 shrink-0" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
