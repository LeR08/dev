'use client';

import * as React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && (
          <span className="text-danger ml-0.5" aria-hidden>
            *
          </span>
        )}
      </Label>
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
            id: htmlFor,
            'aria-invalid': error ? true : undefined,
            'aria-describedby': [hintId, errorId].filter(Boolean).join(' ') || undefined,
          })
        : children}
      {hint && !error && (
        <p id={hintId} className="text-muted-foreground text-xs">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-danger text-xs" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function PasswordInputHint() {
  return (
    <span>8 caractères minimum, avec au moins une majuscule, une minuscule et un chiffre.</span>
  );
}
