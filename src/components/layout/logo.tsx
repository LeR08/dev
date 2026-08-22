import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Logo({ className, href = '/' }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      className={cn('inline-flex items-center gap-2.5 font-semibold tracking-tight', className)}
    >
      <span
        aria-hidden
        className="bg-primary text-primary-foreground grid size-8 shrink-0 place-items-center rounded-lg text-sm font-bold"
      >
        A
      </span>
      <span className="truncate text-[0.9375rem]">
        Atelier<span className="text-primary">Digital</span>
      </span>
    </Link>
  );
}
