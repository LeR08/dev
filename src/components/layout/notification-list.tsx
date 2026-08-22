'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Award, BookOpen, Check, CheckCheck, FileQuestion, Info, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { markNotificationsRead } from '@/server/actions/engagement.actions';
import { cn, formatRelative } from '@/lib/utils';
import type { Enums } from '@/types/database.types';

interface NotificationItem {
  id: string;
  type: Enums<'notification_type'>;
  title: string;
  body: string | null;
  link_url: string | null;
  read_at: string | null;
  created_at: string;
}

const icons: Record<Enums<'notification_type'>, typeof Info> = {
  new_course: BookOpen,
  new_lesson: BookOpen,
  new_quiz: FileQuestion,
  goal_reached: Target,
  badge_earned: Award,
  study_reminder: Info,
  system: Info,
};

export function NotificationList({ notifications }: { notifications: NotificationItem[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [items, setItems] = React.useState(notifications);
  const [pending, setPending] = React.useState(false);

  const unreadCount = items.filter((item) => !item.read_at).length;

  async function markAll() {
    setPending(true);
    const result = await markNotificationsRead();
    setPending(false);

    if (!result.ok) {
      toast({ title: 'Action impossible', description: result.error, tone: 'error' });
      return;
    }

    const now = new Date().toISOString();
    setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? now })));
    router.refresh();
  }

  async function markOne(id: string) {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, read_at: item.read_at ?? new Date().toISOString() } : item,
      ),
    );
    await markNotificationsRead([id]);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {unreadCount > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            {unreadCount} notification{unreadCount > 1 ? 's' : ''} non lue
            {unreadCount > 1 ? 's' : ''}
          </p>
          <Button variant="secondary" size="sm" loading={pending} onClick={markAll}>
            <CheckCheck /> Tout marquer comme lu
          </Button>
        </div>
      )}

      <ul className="bg-card divide-y rounded-xl border">
        {items.map((item) => {
          const Icon = icons[item.type];
          const unread = !item.read_at;

          const inner = (
            <>
              <span
                className={cn(
                  'grid size-9 shrink-0 place-items-center rounded-lg',
                  unread ? 'bg-primary-muted text-primary' : 'bg-muted text-muted-foreground',
                )}
              >
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn('block text-sm', unread ? 'font-semibold' : 'font-medium')}>
                  {item.title}
                </span>
                {item.body && (
                  <span className="text-muted-foreground mt-0.5 block text-sm">{item.body}</span>
                )}
                <span className="text-muted-foreground mt-1 block text-xs">
                  {formatRelative(item.created_at)}
                </span>
              </span>
              {unread && <span className="bg-primary mt-2 size-2 shrink-0 rounded-full" aria-label="Non lue" />}
            </>
          );

          return (
            <li key={item.id} className={cn('transition-colors', unread && 'bg-primary-muted/25')}>
              {item.link_url ? (
                <Link
                  href={item.link_url}
                  onClick={() => void markOne(item.id)}
                  className="hover:bg-muted flex items-start gap-3 p-4 transition-colors"
                >
                  {inner}
                </Link>
              ) : (
                <div className="flex items-start gap-3 p-4">
                  {inner}
                  {unread && (
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Marquer comme lue"
                      onClick={() => void markOne(item.id)}
                    >
                      <Check />
                    </Button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
