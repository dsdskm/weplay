'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { Badge, Card, cn, Empty } from '@/components/ui';
import { Pager } from '@/components/pager';
import { CancelRequestButton } from '@/components/cancel-request-button';
import { api } from '@/lib/api';
import { useGroupId } from '@/lib/hooks';
import type { Paged, TeamItem } from '@/lib/types';

export default function TeamsPage() {
  const groupId = useGroupId();
  const [tab, setTab] = useState<'mine' | 'all'>('mine');
  const [page, setPage] = useState(1);
  const { data: paged } = useQuery({
    queryKey: ['group', groupId, 'teams-page', tab, page],
    queryFn: () =>
      api<Paged<TeamItem>>(`/groups/${groupId}/teams?${new URLSearchParams({ page: String(page), pageSize: '10', scope: tab })}`),
  });
  const list = paged?.items ?? [];
  const pg = { items: list, page, pages: Math.max(1, Math.ceil((paged?.total ?? 0) / 10)), setPage, total: paged?.total ?? 0 };
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="text-2xl font-bold">팀</h1>
      <div className="flex gap-2">
        {(['mine', 'all'] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setPage(1);
            }}
            className={cn('rounded-full px-4 py-1.5 text-sm', tab === t ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200')}
          >
            {t === 'mine' ? '내 팀' : '전체 팀'}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <Empty>팀이 없습니다.</Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {pg.items.map((g) => (
            <Link key={g.id} href={`/g/${groupId}/teams/${g.id}`}>
              <Card className="h-full space-y-2 transition hover:ring-brand-200">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{g.name}</p>
                  {g.isMine && <Badge tone={g.myRole === 'ADMIN' ? 'brand' : 'green'}>{g.myRole === 'ADMIN' ? '담당' : '소속'}</Badge>}
                  {g.joinStatus === 'PENDING' && <Badge tone="amber">승인 대기 중</Badge>}
                  {g.joinStatus === 'PENDING' && g.pendingRequestId && <CancelRequestButton requestId={g.pendingRequestId} />}
                </div>
                <p className="line-clamp-2 text-sm text-slate-500">{g.description || '설명 없음'}</p>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>멤버 {g.memberCount}명</span>
                  <span>담당 {g.admins.map((a) => a.name).join(', ') || '-'}</span>
                </div>
                {g.joinCode && <p className="font-mono text-xs text-slate-500">코드 {g.joinCode}</p>}
              </Card>
            </Link>
          ))}
            <div className="col-span-full"><Pager page={pg.page} pages={pg.pages} setPage={pg.setPage} total={pg.total} /></div>
        </div>
      )}
    </div>
  );
}
