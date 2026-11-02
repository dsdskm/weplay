'use client';

import { cn } from './ui';

/** 알약 모양 탭. 모바일에서는 가로로 스크롤 */
export function Tabs<T extends string>({ value, onChange, items, className }: { value: T; onChange: (v: T) => void; items: readonly (readonly [T, string])[] | { key: T; label: string; count?: number }[]; className?: string }) {
  const list = (items as unknown[]).map((it) => (Array.isArray(it) ? { key: it[0] as T, label: it[1] as string, count: undefined as number | undefined } : (it as { key: T; label: string; count?: number })));
  return (
    <div className={cn('-mx-1 flex gap-2 overflow-x-auto px-1 pb-1', className)}>
      {list.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={cn(
            'shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-all',
            value === t.key ? 'bg-slate-900 text-white shadow' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50',
          )}
        >
          {t.label}
          {t.count != null && <span className="ml-1 opacity-60">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}
