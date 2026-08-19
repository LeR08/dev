'use client';

import { useState } from 'react';

export function CopyAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className="rounded-md border border-[var(--color-line)] px-3 py-2 text-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(address);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
    >
      <span aria-live="polite">{copied ? 'Address copied' : 'Copy address'}</span>
    </button>
  );
}
