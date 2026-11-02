'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const LEVEL = {
  INFO: 'from-sky-500 to-indigo-500',
  UPDATE: 'from-violet-500 to-fuchsia-500',
  MAINTENANCE: 'from-amber-500 to-orange-500',
  URGENT: 'from-rose-500 to-red-600',
} as Record<string, string>;
const ICON = { INFO: '📢', UPDATE: '✨', MAINTENANCE: '🛠️', URGENT: '🚨' } as Record<string, string>;
const KEY = 'wp_banner_closed';

/** MASTER가 배너로 지정한 시스템 공지. 닫으면 같은 공지는 다시 안 보임 */
export function SystemBanner() {
  const [closed, setClosed] = useState<string | null>(null);
  useEffect(() => setClosed(localStorage.getItem(KEY)), []);
  const { data } = useQuery({ queryKey: ['system-notices', 'banner'], queryFn: () => api<{ id: string; title: string; level: string } | null>('/system-notices/banner'), staleTime: 300_000 });
  if (!data || closed === data.id) return null;
  return (
    <div className={`wp-gradient flex items-center gap-3 bg-gradient-to-r px-4 py-2 text-sm text-white ${LEVEL[data.level] ?? LEVEL.INFO}`}>
      <span>{ICON[data.level] ?? '📢'}</span>
      <Link href={`/system-notices/${data.id}`} className="min-w-0 flex-1 truncate font-semibold hover:underline">
        {data.title}
      </Link>
      <button
        type="button"
        aria-label="배너 닫기"
        onClick={() => {
          localStorage.setItem(KEY, data.id);
          setClosed(data.id);
        }}
        className="rounded-full px-2 opacity-80 hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
}
