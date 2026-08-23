import { formatIntakeValue } from '@/domain/format';
import type { IntakeUnit } from '@/domain/types';
import type { TranslationKey } from './index';

type TFunction = (key: TranslationKey, vars?: Record<string, string | number>) => string;

/**
 * `formatIntake` bakes in an English unit word ("g" / "drink(s)"); this pairs
 * the same number with a translated unit word instead, for screens that
 * already have a `t()` in scope.
 */
export function formatIntakeLabel(t: TFunction, value: number, unit: IntakeUnit): string {
  const number = formatIntakeValue(value, unit);
  const word =
    unit === 'grams'
      ? t('common.unitGramsShort')
      : Math.abs(value) === 1
        ? t('common.drinkOne')
        : t('common.drinkOther');
  return `${number} ${word}`;
}
