/**
 * Picks a font size from a string's length.
 *
 * React Native's own answer to "make this fit" is `adjustsFontSizeToFit`,
 * which is iOS-only — on Android it does nothing, so oversized values were
 * either clipped ("4.1 drin…") or force-broken mid-word ("standar/d drinks")
 * once wrapping was allowed. Measuring text properly needs onTextLayout and a
 * re-render; for short, predictable strings like a count or a currency amount,
 * stepping down by length gets the same result with no layout pass and no
 * flicker.
 *
 * Steps must be ordered from shortest to longest.
 */
export type SizeStep = { upTo: number; fontSize: number; lineHeight: number };

export function sizeForLength(
  text: string,
  steps: SizeStep[]
): { fontSize: number; lineHeight: number } {
  for (const step of steps) {
    if (text.length <= step.upTo) return { fontSize: step.fontSize, lineHeight: step.lineHeight };
  }
  const last = steps[steps.length - 1];
  return { fontSize: last.fontSize, lineHeight: last.lineHeight };
}
