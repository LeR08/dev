'use client';

import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/utils';

const sizes = { sm: 'h-1.5', md: 'h-2', lg: 'h-3' } as const;

export interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  size?: keyof typeof sizes;
  tone?: 'primary' | 'success';
}

export const Progress = React.forwardRef<
  React.ComponentRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, size = 'md', tone = 'primary', ...props }, ref) => {
  const pct = Math.min(100, Math.max(0, value ?? 0));
  return (
    <ProgressPrimitive.Root
      ref={ref}
      value={pct}
      className={cn('bg-muted relative w-full overflow-hidden rounded-full', sizes[size], className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          'h-full w-full flex-1 rounded-full transition-transform duration-500 ease-out',
          tone === 'success' ? 'bg-success' : 'bg-primary',
        )}
        style={{ transform: `translateX(-${100 - pct}%)` }}
      />
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

/** Anneau de progression — dashboard et cartes de formation. */
export function ProgressRing({
  value,
  size = 44,
  strokeWidth = 4,
  className,
  children,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  children?: React.ReactNode;
}) {
  const pct = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`${Math.round(pct)} %`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="stroke-muted"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={cn('transition-[stroke-dashoffset] duration-700 ease-out', pct >= 100 ? 'stroke-success' : 'stroke-primary')}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute text-[0.6875rem] font-semibold tabular-nums">
        {children ?? `${Math.round(pct)}%`}
      </span>
    </div>
  );
}
