'use client';

import * as React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function SearchInput({
  value,
  onValueChange,
  placeholder = 'Rechercher…',
  className,
  autoFocus,
}: {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className={cn('relative', className)}>
      <Search
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
        aria-hidden
      />
      <Input
        type="search"
        role="searchbox"
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(event) => onValueChange(event.target.value)}
        className="pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
      />
      {value.length > 0 && (
        <button
          type="button"
          onClick={() => onValueChange('')}
          className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-0.5 transition-colors"
          aria-label="Effacer la recherche"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
