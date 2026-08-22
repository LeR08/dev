'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Pagination } from '@/components/shared/pagination';

export function CatalogPagination({
  page,
  pageCount,
  total,
}: {
  page: number;
  pageCount: number;
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <Pagination
      page={page}
      pageCount={pageCount}
      total={total}
      onPageChange={(next) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', String(next));
        router.push(`${pathname}?${params.toString()}`);
      }}
    />
  );
}
