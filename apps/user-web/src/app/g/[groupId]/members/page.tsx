'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Avatar, Badge, Card, Empty, Input } from '@/components/ui';
import { Pager } from '@/components/pager';
import { api } from '@/lib/api';
import { useGroupId } from '@/lib/hooks';
import type { Member, Paged } from '@/lib/types';

export default function MembersPage() {
  const groupId = useGroupId();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const { data: paged } = useQuery({
    queryKey: ['group', groupId, 'members', q, page],
    queryFn: () => api<Paged<Member>>(`/groups/${groupId}/members?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page), pageSize: '10' })}`),
  });
  const members = paged?.items ?? [];
  const pages = Math.max(1, Math.ceil((paged?.total ?? 0) / 10));
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">구성원</h1>
      <Input placeholder="이름 또는 이메일 검색" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
      {paged?.total === 0 ? (
        <Empty>구성원이 없습니다.</Empty>
      ) : (
        <Card className="divide-y divide-slate-100 p-0">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-5 py-3">
              <Avatar name={m.name} url={m.avatarUrl} />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{m.name}</p>
                <p className="truncate text-xs text-slate-400">{m.email}</p>
                {m.teams.length > 0 && <p className="mt-1 truncate text-xs text-slate-500">{m.teams.map((g) => g.name).join(' · ')}</p>}
              </div>
              {m.isPrimaryAdmin ? <Badge tone="brand">대표 ADMIN</Badge> : m.role === 'ADMIN' ? <Badge tone="amber">ADMIN</Badge> : null}
            </div>
          ))}
            <div className="px-5 py-3"><Pager page={page} pages={pages} setPage={setPage} total={paged?.total ?? 0} /></div>
        </Card>
      )}
    </div>
  );
}
