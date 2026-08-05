/**
 * Minimal dot-path translator.
 *
 * Deliberately hand-rolled instead of pulling in i18next: the catalog is a
 * few hundred short phrases, not a full localisation pipeline, and this keeps
 * the same "small, auditable dependency footprint" the rest of the app favours
 * (see src/components/ui/Icon.tsx for the same reasoning applied to icons).
 */

export type Catalog = { [key: string]: string | Catalog };

/** Every dot-separated path reachable in a catalog shape, e.g. "common.save". */
export type NestedKeyOf<T> = {
  [K in keyof T & string]: T[K] extends string
    ? K
    : T[K] extends Record<string, unknown>
      ? `${K}.${NestedKeyOf<T[K]>}`
      : never;
}[keyof T & string];

function resolve(catalog: Catalog, path: string): string | undefined {
  let node: string | Catalog | undefined = catalog;
  for (const segment of path.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = node[segment];
  }
  return typeof node === 'string' ? node : undefined;
}

function interpolate(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text;
  return text.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match
  );
}

/**
 * Looks up `path` in `catalog`, falling back to `fallback` (normally the
 * English catalog), and finally to the raw key — so a missing translation
 * shows a slightly odd string instead of a blank space or a crash.
 */
export function translate(
  catalog: Catalog,
  fallback: Catalog,
  path: string,
  vars?: Record<string, string | number>
): string {
  const text = resolve(catalog, path) ?? resolve(fallback, path) ?? path;
  return interpolate(text, vars);
}
