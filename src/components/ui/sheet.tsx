'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DialogOverlay, DialogPortal } from './dialog';

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

const sides = {
  left: 'inset-y-0 left-0 h-full w-[19rem] border-r data-[state=open]:animate-fade-in',
  right: 'inset-y-0 right-0 h-full w-[19rem] border-l data-[state=open]:animate-fade-in',
  bottom: 'inset-x-0 bottom-0 rounded-t-2xl border-t data-[state=open]:animate-slide-up',
} as const;

export const SheetContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { side?: keyof typeof sides }
>(({ className, children, side = 'left', ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn('bg-card fixed z-50 flex flex-col shadow-xl', sides[side], className)}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="text-muted-foreground hover:text-foreground absolute top-4 right-4 rounded-md p-1 transition-colors">
        <X className="size-4" />
        <span className="sr-only">Fermer</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
SheetContent.displayName = 'SheetContent';

export const SheetTitle = DialogPrimitive.Title;
export const SheetDescription = DialogPrimitive.Description;
