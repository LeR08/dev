/**
 * A local-only mock of a paid tier, per the "test interface, no real payment"
 * decision — nothing here talks to a payment processor. See
 * {@link Subscription} in `types.ts` for what's actually persisted.
 */

// Excludes visually ambiguous characters (0/O, 1/I/L) so a code is easy to
// read aloud or copy by hand.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

/** A fresh, shareable affiliate code for this device. Injectable RNG for tests. */
export function generateAffiliateCode(random: () => number = Math.random): string {
  let suffix = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    suffix += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  }
  return `TALLY-${suffix}`;
}

/** Loose format check for a code someone typed in — not a real lookup, since there's no server. */
export function isPlausibleAffiliateCode(code: string): boolean {
  return /^TALLY-[A-Z0-9]{6}$/.test(code.trim().toUpperCase());
}
