'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { api, tokenStore } from '@/lib/api';
import { LAST_COMPANY_KEY } from '@/lib/hooks';
import type { MyCompany } from '@/lib/types';

/** 진입 분기 (PLAN §8.3) */
export default function EntryPage() {
  const router = useRouter();
  useEffect(() => {
    if (!tokenStore.get()) return router.replace('/login');
    api<MyCompany[]>('/me/companies')
      .then((list) => {
        const approved = list.filter((c) => c.joinStatus === 'APPROVED');
        if (approved.length > 0) {
          const last = localStorage.getItem(LAST_COMPANY_KEY);
          const target = approved.find((c) => c.company.id === last) ?? approved[0];
          return router.replace(`/c/${target.company.id}`);
        }
        if (list.some((c) => c.joinStatus === 'PENDING')) return router.replace('/onboarding/pending');
        router.replace('/onboarding');
      })
      .catch(() => router.replace('/login'));
  }, [router]);
  return <div className="flex min-h-screen items-center justify-center text-slate-400">불러오는 중…</div>;
}
