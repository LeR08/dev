'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchInput } from '@/components/shared/search-input';
import { cn } from '@/lib/utils';

interface Option {
  id: string;
  name: string;
}

const ALL = '__all__';

const DIFFICULTIES: Option[] = [
  { id: 'beginner', name: 'Débutant' },
  { id: 'intermediate', name: 'Intermédiaire' },
  { id: 'advanced', name: 'Avancé' },
];

const DURATIONS: Option[] = [
  { id: '2', name: 'Moins de 2 h' },
  { id: '5', name: 'Moins de 5 h' },
  { id: '10', name: 'Moins de 10 h' },
];

/**
 * Les filtres vivent dans l'URL : la page reste partageable, le bouton retour
 * fonctionne, et le rendu reste côté serveur.
 */
export function CatalogFilters({
  levels,
  subjects,
}: {
  levels: Option[];
  subjects: Option[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [expanded, setExpanded] = React.useState(false);
  const [search, setSearch] = React.useState(searchParams.get('q') ?? '');

  const activeCount = ['level', 'subject', 'difficulty', 'duration'].filter((key) =>
    searchParams.get(key),
  ).length;

  const apply = React.useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '' || value === ALL) params.delete(key);
        else params.set(key, value);
      }
      params.delete('page');
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // Recherche débattue : on n'interroge pas le serveur à chaque frappe.
  React.useEffect(() => {
    const current = searchParams.get('q') ?? '';
    if (search === current) return;
    const timer = setTimeout(() => apply({ q: search || null }), 350);
    return () => clearTimeout(timer);
  }, [search, apply, searchParams]);

  function reset() {
    setSearch('');
    router.replace(pathname, { scroll: false });
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <SearchInput
          value={search}
          onValueChange={setSearch}
          placeholder="Rechercher une formation, un sujet…"
          className="flex-1"
        />
        <Button
          variant="secondary"
          onClick={() => setExpanded((value) => !value)}
          className="shrink-0"
          aria-expanded={expanded}
        >
          <SlidersHorizontal />
          <span className="hidden sm:inline">Filtres</span>
          {activeCount > 0 && <Badge variant="primary">{activeCount}</Badge>}
        </Button>
      </div>

      <div
        className={cn(
          'grid gap-3 sm:grid-cols-2 lg:grid-cols-4',
          expanded ? 'animate-fade-in' : 'hidden',
        )}
      >
        <FilterSelect
          label="Parcours"
          value={searchParams.get('level') ?? ALL}
          options={levels}
          onChange={(value) => apply({ level: value })}
        />
        <FilterSelect
          label="Domaine"
          value={searchParams.get('subject') ?? ALL}
          options={subjects}
          onChange={(value) => apply({ subject: value })}
        />
        <FilterSelect
          label="Difficulté"
          value={searchParams.get('difficulty') ?? ALL}
          options={DIFFICULTIES}
          onChange={(value) => apply({ difficulty: value })}
        />
        <FilterSelect
          label="Durée"
          value={searchParams.get('duration') ?? ALL}
          options={DURATIONS}
          onChange={(value) => apply({ duration: value })}
        />
      </div>

      {(activeCount > 0 || search) && (
        <Button variant="ghost" size="sm" onClick={reset}>
          <X /> Réinitialiser les filtres
        </Button>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{label} : tous</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
