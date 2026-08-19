import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-[var(--color-muted)]">
        If you were looking for a venue that used to be listed here, try searching for it by name —
        closed venues stay on the site.
      </p>
      <Link href="/" className="mt-6 inline-block rounded-md bg-[var(--color-accent)] px-4 py-2 font-medium text-[var(--color-on-accent)]">
        Back to the directory
      </Link>
    </div>
  );
}
