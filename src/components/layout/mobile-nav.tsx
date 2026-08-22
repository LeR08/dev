'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { mobileNav } from '@/lib/constants/nav';
import { cn } from '@/lib/utils';

/** Barre de navigation basse — remplace la sidebar sous le point de rupture lg. */
export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="bg-card/95 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur-md lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Navigation mobile"
    >
      <ul className="grid grid-cols-5">
        {mobileNav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-1 px-1 py-2.5 text-[0.6875rem] font-medium transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <item.icon className="size-5" aria-hidden />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
