'use client';

import * as React from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { toggleFavorite } from '@/server/actions/engagement.actions';
import { cn } from '@/lib/utils';

export function FavoriteButton({
  type,
  id,
  initialActive,
  withLabel = false,
}: {
  type: 'course' | 'lesson' | 'video' | 'resource';
  id: string;
  initialActive: boolean;
  withLabel?: boolean;
}) {
  const { toast } = useToast();
  const [active, setActive] = React.useState(initialActive);
  const [pending, setPending] = React.useState(false);

  async function handleClick() {
    setPending(true);
    // Retour optimiste : l'interface ne doit pas attendre l'aller-retour.
    setActive((value) => !value);

    const result = await toggleFavorite({ type, id });
    setPending(false);

    if (!result.ok) {
      setActive((value) => !value);
      toast({ title: 'Action impossible', description: result.error, tone: 'error' });
      return;
    }
    setActive(result.data.active);
  }

  return (
    <Button
      variant="secondary"
      size={withLabel ? 'md' : 'icon'}
      onClick={handleClick}
      disabled={pending}
      aria-pressed={active}
      aria-label={active ? 'Retirer des favoris' : 'Ajouter aux favoris'}
    >
      <Star className={cn('size-4', active && 'fill-warning text-warning')} />
      {withLabel && (active ? 'En favori' : 'Ajouter aux favoris')}
    </Button>
  );
}
