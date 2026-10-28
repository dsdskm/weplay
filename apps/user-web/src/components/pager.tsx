'use client';

import { useState } from 'react';
import { Button } from './ui';

/** 목록 페이지네이션 (클라이언트 기준, 기본 10건) */
export function usePaging<T>(rows: T[], size = 10) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const current = Math.min(page, pages);
  return { items: rows.slice((current - 1) * size, current * size), page: current, pages, setPage, total: rows.length };
}

export function Pager({ page, pages, setPage, total }: { page: number; pages: number; setPage: (p: number) => void; total: number }) {
  if (total === 0) return null;
  return (
    <div className="flex items-center justify-between text-sm text-slate-600">
      <span>총 {total}건</span>
      {pages > 1 && (
        <div className="flex items-center gap-2">
          <Button variant="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            이전
          </Button>
          <span>
            {page} / {pages}
          </span>
          <Button variant="ghost" disabled={page >= pages} onClick={() => setPage(page + 1)}>
            다음
          </Button>
        </div>
      )}
    </div>
  );
}
