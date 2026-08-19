import Link from 'next/link';
import { en } from '@/i18n/dictionaries/en';

/**
 * A not-found page cannot read the route params, so it answers in the default
 * locale and links back to the default locale's directory.
 */
export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">{en.notFound.title}</h1>
      <p className="mx-auto mt-3 max-w-md leading-relaxed text-[var(--color-muted)]">
        {en.notFound.body}
      </p>
      <Link href="/en" className="btn-accent mt-7 inline-flex px-4 py-2.5">
        {en.notFound.cta}
      </Link>
    </div>
  );
}
