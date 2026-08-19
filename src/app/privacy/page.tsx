import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Privacy',
  description: `What ${SITE_NAME} stores, and what it deliberately does not.`,
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Privacy</h1>

      <section className="mt-6 space-y-3 text-[var(--color-muted)]">
        <h2 className="text-lg font-medium text-[var(--color-text)]">Your location</h2>
        <p>
          When you tap &ldquo;find venues near me&rdquo;, your browser asks for permission and hands
          your coordinates to the page. Distances are calculated on your device. Your coordinates
          are never transmitted to us, never logged and never stored. Refusing the prompt costs you
          nothing but distance sorting — every other feature works.
        </p>

        <h2 className="text-lg font-medium text-[var(--color-text)]">What is stored in your browser</h2>
        <p>
          Two values, both local to this browser: your confirmation that you are 18 or over, and
          your light/dark preference. Clearing site data removes them.
        </p>

        <h2 className="text-lg font-medium text-[var(--color-text)]">Analytics</h2>
        <p>
          No third-party analytics and no advertising or tracking cookies. If usage counting is ever
          added it will be cookie-free and self-hosted.
        </p>

        <h2 className="text-lg font-medium text-[var(--color-text)]">Reviews and reports</h2>
        <p>
          Reviews are not open yet. When they are, an account will store a user id, a display name
          and timestamps — nothing more. You will be able to export and delete your data, and the
          lawful basis will be the consent you give at signup. Raw IP addresses are not retained;
          rate limiting uses a short-lived hashed key that cannot be reversed into an address.
        </p>

        <h2 className="text-lg font-medium text-[var(--color-text)]">Contact</h2>
        <p>
          For a data request or a correction, use the report link on any venue page. This notice
          will be reviewed by a Dutch lawyer before reviews open to the public.
        </p>
      </section>
    </div>
  );
}
