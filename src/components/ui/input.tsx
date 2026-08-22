import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'border-input bg-card ring-offset-background placeholder:text-muted-foreground flex h-10 w-full rounded-lg border px-3 py-2 text-sm shadow-xs transition-colors',
        'focus-visible:border-primary focus-visible:ring-primary/25 focus-visible:ring-2 focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'file:border-0 file:bg-transparent file:text-sm file:font-medium',
        'aria-invalid:border-danger aria-invalid:ring-danger/25',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'border-input bg-card placeholder:text-muted-foreground flex min-h-24 w-full rounded-lg border px-3 py-2 text-sm shadow-xs transition-colors',
        'focus-visible:border-primary focus-visible:ring-primary/25 focus-visible:ring-2 focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-danger aria-invalid:ring-danger/25',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';
