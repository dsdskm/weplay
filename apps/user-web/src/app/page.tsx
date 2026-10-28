'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { api, tokenStore } from '@/lib/api';
import { LAST_GROUP_KEY } from '@/lib/hooks';
import type { MyGroup } from '@/lib/types';

/** 진입 분기 (PLAN §8.3) */
export default function EntryPage() {
  const router = useRouter();
  useEffect(() => {
    if (!tokenStore.get()) return router.replace('/login');
    api<MyGroup[]>('/me/groups')
      .then((list) => {
        const approved = list.filter((c) => c.joinStatus === 'APPROVED');
        if (approved.length > 0) {
          const last = localStorage.getItem(LAST_GROUP_KEY);
          const target = approved.find((c) => c.group.id === last) ?? approved[0];
          return router.replace(`/g/${target.group.id}`);
        }
        if (list.some((c) => c.joinStatus === 'PENDING')) return router.replace('/onboarding/pending');
        router.replace('/onboarding');
      })
      .catch(() => router.replace('/login'));
  }, [router]);
  return <div className="flex min-h-screen items-center justify-center text-slate-400">불러오는 중…</div>;
}
