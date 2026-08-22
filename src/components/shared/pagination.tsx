'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Pagination serveur — jamais de chargement complet d'une table (cahier §26). */
export function Pagination({
  page,
  pageCount,
  onPageChange,
  total,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  total?: number;
}) {
  if (pageCount <= 1) return null;

  return (
    <nav className="flex items-center justify-between gap-4 pt-2" aria-label="Pagination">
      <p className="text-muted-foreground text-sm">
        Page {page} sur {pageCount}
        {typeof total === 'number' && ` · ${total} résultats`}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft />
          Précédent
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          Suivant
          <ChevronRight />
        </Button>
      </div>
    </nav>
  );
}
