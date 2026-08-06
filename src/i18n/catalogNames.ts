import type { LanguageCode } from '@/domain/types';

/**
 * Translated display names for the ~18 catalog entries whose name mixes an
 * English serving-size word into an otherwise plain drink name — "Lager
 * (small)", "Red wine (glass)" — which reads as an untranslated leftover
 * next to a fully localized UI (flagged directly: "il reste des ambiguïtés
 * sur les traductions"). The other ~97 catalog entries are international
 * drink/spirit names (Absinthe, Baijiu, Prosecco, Mezcal, ...) that are
 * already the correct word in most of these languages and are left as-is
 * rather than invented.
 *
 * Keyed by the catalog's own stable `id`, not by name, so this survives a
 * future rename. Looked up once, at the moment a drink is logged or shown
 * in a picker — logged entries snapshot the name at that point, same as
 * every other drink field, so a language switch never rewrites history.
 */
const CATALOG_NAME_OVERRIDES: Partial<Record<string, Record<LanguageCode, string>>> = {
  'beer-lager-half': {
    en: 'Lager (small)', fr: 'Lager (petit)', es: 'Lager (pequeña)', de: 'Lager (klein)',
    it: 'Lager (piccola)', pt: 'Lager (pequena)', zh: '拉格啤酒（小杯）', ar: 'لايغر (صغير)',
  },
  'beer-lager-pint': {
    en: 'Lager (pint)', fr: 'Lager (pinte)', es: 'Lager (pinta)', de: 'Lager (Pint)',
    it: 'Lager (pinta)', pt: 'Lager (pint)', zh: '拉格啤酒（品脱）', ar: 'لايغر (بايِنت)',
  },
  'beer-lager-bottle': {
    en: 'Lager (bottle)', fr: 'Lager (bouteille)', es: 'Lager (botella)', de: 'Lager (Flasche)',
    it: 'Lager (bottiglia)', pt: 'Lager (garrafa)', zh: '拉格啤酒（瓶装）', ar: 'لايغر (زجاجة)',
  },
  'beer-double-ipa': {
    en: 'Double IPA', fr: 'IPA double', es: 'IPA doble', de: 'Doppel-IPA',
    it: 'IPA doppia', pt: 'IPA dupla', zh: '双倍IPA', ar: 'آي بي إيه مضاعف',
  },
  'beer-alcohol-free': {
    en: 'Alcohol-free beer', fr: 'Bière sans alcool', es: 'Cerveza sin alcohol', de: 'Alkoholfreies Bier',
    it: 'Birra analcolica', pt: 'Cerveja sem álcool', zh: '无酒精啤酒', ar: 'بيرة خالية من الكحول',
  },
  'wine-red-glass': {
    en: 'Red wine (glass)', fr: 'Vin rouge (verre)', es: 'Vino tinto (copa)', de: 'Rotwein (Glas)',
    it: 'Vino rosso (bicchiere)', pt: 'Vinho tinto (copo)', zh: '红葡萄酒（一杯）', ar: 'نبيذ أحمر (كأس)',
  },
  'wine-red-large': {
    en: 'Red wine (large glass)', fr: 'Vin rouge (grand verre)', es: 'Vino tinto (copa grande)', de: 'Rotwein (großes Glas)',
    it: 'Vino rosso (bicchiere grande)', pt: 'Vinho tinto (copo grande)', zh: '红葡萄酒（大杯）', ar: 'نبيذ أحمر (كأس كبير)',
  },
  'wine-white-glass': {
    en: 'White wine (glass)', fr: 'Vin blanc (verre)', es: 'Vino blanco (copa)', de: 'Weißwein (Glas)',
    it: 'Vino bianco (bicchiere)', pt: 'Vinho branco (copo)', zh: '白葡萄酒（一杯）', ar: 'نبيذ أبيض (كأس)',
  },
  'wine-white-large': {
    en: 'White wine (large glass)', fr: 'Vin blanc (grand verre)', es: 'Vino blanco (copa grande)', de: 'Weißwein (großes Glas)',
    it: 'Vino bianco (bicchiere grande)', pt: 'Vinho branco (copo grande)', zh: '白葡萄酒（大杯）', ar: 'نبيذ أبيض (كأس كبير)',
  },
  'wine-rose-glass': {
    en: 'Rosé (glass)', fr: 'Rosé (verre)', es: 'Rosado (copa)', de: 'Rosé (Glas)',
    it: 'Rosé (bicchiere)', pt: 'Rosé (copo)', zh: '桃红葡萄酒（一杯）', ar: 'نبيذ وردي (كأس)',
  },
  'wine-red-bottle': {
    en: 'Red wine (bottle)', fr: 'Vin rouge (bouteille)', es: 'Vino tinto (botella)', de: 'Rotwein (Flasche)',
    it: 'Vino rosso (bottiglia)', pt: 'Vinho tinto (garrafa)', zh: '红葡萄酒（整瓶）', ar: 'نبيذ أحمر (زجاجة)',
  },
  'wine-white-bottle': {
    en: 'White wine (bottle)', fr: 'Vin blanc (bouteille)', es: 'Vino blanco (botella)', de: 'Weißwein (Flasche)',
    it: 'Vino bianco (bottiglia)', pt: 'Vinho branco (garrafa)', zh: '白葡萄酒（整瓶）', ar: 'نبيذ أبيض (زجاجة)',
  },
  'wine-rose-bottle': {
    en: 'Rosé (bottle)', fr: 'Rosé (bouteille)', es: 'Rosado (botella)', de: 'Rosé (Flasche)',
    it: 'Rosé (bottiglia)', pt: 'Rosé (garrafa)', zh: '桃红葡萄酒（整瓶）', ar: 'نبيذ وردي (زجاجة)',
  },
  'wine-natural': {
    en: 'Natural wine (glass)', fr: 'Vin nature (verre)', es: 'Vino natural (copa)', de: 'Naturwein (Glas)',
    it: 'Vino naturale (bicchiere)', pt: 'Vinho natural (copo)', zh: '自然酒（一杯）', ar: 'نبيذ طبيعي (كأس)',
  },
  'wine-alcohol-free': {
    en: 'Alcohol-free wine', fr: 'Vin sans alcool', es: 'Vino sin alcohol', de: 'Alkoholfreier Wein',
    it: 'Vino analcolico', pt: 'Vinho sem álcool', zh: '无酒精葡萄酒', ar: 'نبيذ خالٍ من الكحول',
  },
  'cider-pint': {
    en: 'Cider (pint)', fr: 'Cidre (pinte)', es: 'Sidra (pinta)', de: 'Cidre (Pint)',
    it: 'Sidro (pinta)', pt: 'Cidra (pint)', zh: '苹果酒（品脱）', ar: 'سايدر (بايِنت)',
  },
  'other-premix': {
    en: 'Premixed can', fr: 'Prémix en canette', es: 'Premezclado en lata', de: 'Fertigmix in der Dose',
    it: 'Premiscelato in lattina', pt: 'Pré-misturado em lata', zh: '罐装预调酒', ar: 'مشروب جاهز معلّب',
  },
  'other-shot': {
    en: 'Shot (generic)', fr: 'Shot (générique)', es: 'Chupito (genérico)', de: 'Shot (allgemein)',
    it: 'Shot (generico)', pt: 'Shot (genérico)', zh: '烈酒小杯（通用）', ar: 'جرعة (عامة)',
  },
};

/** Number of catalog entries with a translated display name — for the admin overview. */
export const CATALOG_NAME_OVERRIDE_COUNT = Object.keys(CATALOG_NAME_OVERRIDES).length;

/**
 * Translated name for a catalog drink, or the drink's own name unchanged —
 * for custom drinks (the user's own presets) and the ~97 catalog entries
 * with no override.
 */
export function catalogDrinkName(
  language: LanguageCode,
  drink: { id: string; isCustom: boolean; name: string }
): string {
  if (drink.isCustom) return drink.name;
  return CATALOG_NAME_OVERRIDES[drink.id]?.[language] ?? drink.name;
}
