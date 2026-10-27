'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { Badge, Card, cn, Empty } from '@/components/ui';
import { api } from '@/lib/api';
import { useCompanyId } from '@/lib/hooks';
import type { GroupItem } from '@/lib/types';

export default function GroupsPage() {
  const companyId = useCompanyId();
  const [tab, setTab] = useState<'mine' | 'all'>('mine');
  const { data: groups } = useQuery({
    queryKey: ['company', companyId, 'groups'],
    queryFn: () => api<GroupItem[]>(`/companies/${companyId}/groups`),
  });
  const list = (groups ?? []).filter((g) => tab === 'all' || g.isMine);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="text-2xl font-bold">그룹</h1>
      <div className="flex gap-2">
        {(['mine', 'all'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn('rounded-full px-4 py-1.5 text-sm', tab === t ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200')}
          >
            {t === 'mine' ? '내 그룹' : '전체 그룹'}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <Empty>그룹이 없습니다.</Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((g) => (
            <Link key={g.id} href={`/c/${companyId}/groups/${g.id}`}>
              <Card className="h-full space-y-2 transition hover:ring-brand-200">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{g.name}</p>
                  {g.isMine && <Badge tone={g.myRole === 'ADMIN' ? 'brand' : 'green'}>{g.myRole === 'ADMIN' ? '담당' : '소속'}</Badge>}
                </div>
                <p className="line-clamp-2 text-sm text-slate-500">{g.description || '설명 없음'}</p>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>멤버 {g.memberCount}명</span>
                  <span>담당 {g.admin?.name ?? '-'}</span>
                </div>
                {g.joinCode && <p className="font-mono text-xs text-slate-500">코드 {g.joinCode}</p>}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
