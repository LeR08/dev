/**
 * Calcul de niveau — logique pure, testable sans base de données.
 *
 * Progression quadratique douce : le niveau n s'atteint à 100 × n(n−1)/2 XP.
 *   niveau 1 → 0 XP      niveau 4 → 600 XP
 *   niveau 2 → 100 XP    niveau 5 → 1 000 XP
 *   niveau 3 → 300 XP    niveau 6 → 1 500 XP
 *
 * Chaque palier demande 100 XP de plus que le précédent : la progression reste
 * perceptible au début sans devenir hors d'atteinte ensuite.
 */
export interface LevelInfo {
  level: number;
  xpInLevel: number;
  xpForNextLevel: number;
}

export function xpRequiredForLevel(level: number): number {
  return (100 * level * (level - 1)) / 2;
}

export function computeLevel(xp: number): LevelInfo {
  const safeXp = Math.max(0, Math.floor(xp || 0));
  const level = Math.floor((1 + Math.sqrt(1 + (8 * safeXp) / 100)) / 2);
  const current = xpRequiredForLevel(level);
  const next = xpRequiredForLevel(level + 1);

  return {
    level,
    xpInLevel: safeXp - current,
    xpForNextLevel: next - current,
  };
}
