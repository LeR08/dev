import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

const alertVariants = cva('flex gap-3 rounded-xl border px-4 py-3 text-sm', {
  variants: {
    variant: {
      info: 'border-border bg-muted text-foreground',
      success: 'border-transparent bg-success-muted text-success',
      warning: 'border-transparent bg-warning-muted text-warning-foreground',
      danger: 'border-transparent bg-danger-muted text-danger',
    },
  },
  defaultVariants: { variant: 'info' },
});

const icons = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  danger: AlertCircle,
} as const;

export function Alert({
  className,
  variant = 'info',
  title,
  children,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof alertVariants> & { title?: string }) {
  const Icon = icons[variant ?? 'info'];
  return (
    <div role="alert" className={cn(alertVariants({ variant }), className)} {...props}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 space-y-0.5">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className="opacity-90">{children}</div>}
      </div>
    </div>
  );
}
