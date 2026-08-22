import Link from 'next/link';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { routes } from '@/lib/constants/routes';

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-5">
      <div className="max-w-md space-y-5 text-center">
        <div className="bg-muted text-muted-foreground mx-auto grid size-14 place-items-center rounded-full">
          <Compass className="size-6" aria-hidden />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Page introuvable</h1>
          <p className="text-muted-foreground text-sm">
            Cette page n&apos;existe pas, ou vous n&apos;y avez pas accès.
          </p>
        </div>
        <div className="flex justify-center gap-2">
          <Button asChild variant="secondary">
            <Link href={routes.home}>Accueil</Link>
          </Button>
          <Button asChild>
            <Link href={routes.explore}>Explorer les formations</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
