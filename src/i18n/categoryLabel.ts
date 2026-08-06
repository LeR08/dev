import type { Category } from '@/domain/types';
import type { TranslationKey } from './index';

type TFunction = (key: TranslationKey, vars?: Record<string, string | number>) => string;

/** Translated drink category name, replacing the English-only `CATEGORY_LABELS` map. */
export function categoryLabel(t: TFunction, category: Category): string {
  return t(`category.${category}` as never);
}
