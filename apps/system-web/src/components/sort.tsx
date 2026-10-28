'use client';

import { useState, type ReactNode } from 'react';
import { cn } from './ui';

export type SortDir = 'asc' | 'desc';
export type SortState = { key: string; dir: SortDir } | undefined;

/** 컬럼 헤더 클릭 정렬 상태: 같은 컬럼이면 방향 전환, 다른 컬럼이면 오름차순 */
export function useSort(initial?: { key: string; dir: SortDir }) {
  const [sort, setSort] = useState<SortState>(initial);
  const toggle = (key: string) =>
    setSort((prev) => (prev?.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  return { sort, toggle };
}

type Value = string | number | boolean | null | undefined;

/** 클라이언트 목록 정렬. 값이 없는 행은 방향과 관계없이 마지막 */
export function sortRows<T>(rows: T[], sort: SortState, accessors: Record<string, (row: T) => Value>): T[] {
  if (!sort || !accessors[sort.key]) return rows;
  const get = accessors[sort.key];
  return [...rows].sort((a, b) => {
    const x = get(a);
    const y = get(b);
    if (x == null && y == null) return 0;
    if (x == null) return 1;
    if (y == null) return -1;
    const r =
      typeof x === 'number' && typeof y === 'number'
        ? x - y
        : String(x).localeCompare(String(y), 'ko', { numeric: true, sensitivity: 'base' });
    return sort.dir === 'asc' ? r : -r;
  });
}

/** 정렬 가능한 헤더 셀 */
export function SortTh({
  k,
  sort,
  onSort,
  children,
  className,
}: {
  k: string;
  sort: SortState;
  onSort: (key: string) => void;
  children: ReactNode;
  className?: string;
}) {
  const active = sort?.key === k;
  return (
    <th
      onClick={() => onSort(k)}
      className={cn('cursor-pointer select-none px-4 py-3 hover:text-slate-800', className)}
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      {children}
      <span className={cn('ml-1 text-[10px]', active ? 'text-brand-600' : 'text-slate-300')}>
        {active ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}
      </span>
    </th>
  );
}
