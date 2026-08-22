'use client';

import * as React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // En production, brancher ici un service de suivi d'erreurs.
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-dvh place-items-center px-5">
      <div className="max-w-md space-y-5 text-center">
        <div className="bg-danger-muted text-danger mx-auto grid size-14 place-items-center rounded-full">
          <AlertCircle className="size-6" aria-hidden />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Une erreur est survenue</h1>
          <p className="text-muted-foreground text-sm">
            La page n&apos;a pas pu être affichée. Réessayez ; si le problème persiste, revenez dans
            quelques minutes.
          </p>
          {error.digest && (
            <p className="text-muted-foreground font-mono text-xs">Référence : {error.digest}</p>
          )}
        </div>
        <Button onClick={reset}>Réessayer</Button>
      </div>
    </div>
  );
}
