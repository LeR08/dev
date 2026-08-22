'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

export const Tabs = TabsPrimitive.Root;

export const TabsList = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'border-border text-muted-foreground no-scrollbar flex h-11 items-center gap-1 overflow-x-auto border-b',
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

export const TabsTrigger = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'relative inline-flex h-11 items-center gap-2 px-3 text-sm font-medium whitespace-nowrap transition-colors',
      'hover:text-foreground disabled:pointer-events-none disabled:opacity-50',
      'data-[state=active]:text-foreground',
      'after:bg-primary after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:scale-x-0 after:rounded-full after:transition-transform data-[state=active]:after:scale-x-100',
      '[&_svg]:size-4',
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

export const TabsContent = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn('focus-visible:outline-none data-[state=active]:animate-fade-in', className)}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;
