import { describe, expect, it } from 'vitest';
import { computeLevel, xpRequiredForLevel } from '@/lib/utils/gamification';

describe('computeLevel', () => {
  it('démarre au niveau 1 sans XP', () => {
    const result = computeLevel(0);
    expect(result.level).toBe(1);
    expect(result.xpInLevel).toBe(0);
    expect(result.xpForNextLevel).toBe(100);
  });

  it('passe au niveau 2 à 100 XP', () => {
    expect(computeLevel(99).level).toBe(1);
    expect(computeLevel(100).level).toBe(2);
  });

  it('respecte la progression quadratique annoncée', () => {
    // Seuils : niveau n atteint à 100 × n(n−1)/2 XP
    expect(computeLevel(300).level).toBe(3);
    expect(computeLevel(600).level).toBe(4);
    expect(computeLevel(1000).level).toBe(5);
  });

  it('expose les seuils cohérents avec computeLevel', () => {
    expect(xpRequiredForLevel(1)).toBe(0);
    expect(xpRequiredForLevel(2)).toBe(100);
    expect(xpRequiredForLevel(3)).toBe(300);
    expect(xpRequiredForLevel(4)).toBe(600);
  });

  it('encaisse les valeurs aberrantes sans casser', () => {
    expect(computeLevel(-100).level).toBe(1);
    expect(computeLevel(Number.NaN).level).toBe(1);
  });

  it('ne renvoie jamais de progression hors bornes', () => {
    for (const xp of [0, 1, 99, 100, 250, 999, 5000, 50000]) {
      const result = computeLevel(xp);
      expect(result.xpInLevel).toBeGreaterThanOrEqual(0);
      expect(result.xpInLevel).toBeLessThan(result.xpForNextLevel);
      expect(result.level).toBeGreaterThanOrEqual(1);
    }
  });
});
