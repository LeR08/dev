'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { routes } from '@/lib/constants/routes';

export function NotificationBell({ unreadCount }: { unreadCount: number }) {
  return (
    <Button asChild variant="ghost" size="icon-sm" className="relative">
      <Link href={routes.notifications} aria-label={`Notifications (${unreadCount} non lues)`}>
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full px-1 text-[0.625rem] font-semibold tabular-nums">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Link>
    </Button>
  );
}
