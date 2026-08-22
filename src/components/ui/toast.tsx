'use client';

import * as React from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastContextValue {
  toast: (input: { title: string; description?: string; tone?: ToastTone }) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

/**
 * Retours utilisateur (états success / error du cahier des charges).
 * Une seule implémentation, utilisée par toutes les server actions côté client.
 */
export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast doit être utilisé dans <ToastProvider>');
  return ctx;
}

const icons: Record<ToastTone, typeof Info> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const tones: Record<ToastTone, string> = {
  success: 'text-success',
  error: 'text-danger',
  info: 'text-primary',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const nextId = React.useRef(0);

  const toast = React.useCallback<ToastContextValue['toast']>(({ title, description, tone = 'info' }) => {
    const id = nextId.current++;
    setItems((prev) => [...prev, { id, title, description, tone }]);
  }, []);

  const dismiss = React.useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const value = React.useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      <ToastPrimitive.Provider swipeDirection="right" duration={5000}>
        {children}
        {items.map((item) => {
          const Icon = icons[item.tone];
          return (
            <ToastPrimitive.Root
              key={item.id}
              onOpenChange={(open) => !open && dismiss(item.id)}
              className="bg-popover data-[state=open]:animate-slide-up flex items-start gap-3 rounded-xl border p-4 shadow-lg data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]"
            >
              <Icon className={cn('mt-0.5 size-4 shrink-0', tones[item.tone])} aria-hidden />
              <div className="min-w-0 flex-1">
                <ToastPrimitive.Title className="text-sm font-medium">
                  {item.title}
                </ToastPrimitive.Title>
                {item.description && (
                  <ToastPrimitive.Description className="text-muted-foreground mt-0.5 text-sm">
                    {item.description}
                  </ToastPrimitive.Description>
                )}
              </div>
              <ToastPrimitive.Close className="text-muted-foreground hover:text-foreground rounded p-0.5 transition-colors">
                <X className="size-4" />
                <span className="sr-only">Fermer</span>
              </ToastPrimitive.Close>
            </ToastPrimitive.Root>
          );
        })}
        <ToastPrimitive.Viewport className="fixed right-0 bottom-0 z-100 flex w-full max-w-sm flex-col gap-2 p-4 outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
