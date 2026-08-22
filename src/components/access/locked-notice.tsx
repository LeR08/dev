import Link from 'next/link';
import { KeyRound, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { routes } from '@/lib/constants/routes';
import { cn } from '@/lib/utils';

/**
 * Affiché à la place du contenu réservé. Le verrouillage réel est appliqué par
 * les policies PostgreSQL — ce composant explique, il ne protège pas.
 */
export function LockedNotice({
  title = 'Contenu réservé aux membres',
  description = "Activez le code reçu après votre achat pour débloquer les vidéos, ressources et quiz de cette formation.",
  className,
}: {
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'bg-muted/60 flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed px-6 py-12 text-center',
        className,
      )}
    >
      <div className="bg-primary-muted text-primary grid size-12 place-items-center rounded-full">
        <Lock className="size-5" aria-hidden />
      </div>
      <div className="max-w-md space-y-1.5">
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      <Button asChild>
        <Link href={routes.activate}>
          <KeyRound /> Activer mon code
        </Link>
      </Button>
    </div>
  );
}
