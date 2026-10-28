'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Badge, Card, Empty, Input } from '@/components/ui';
import { api } from '@/lib/api';
import type { GroupRow, Paged } from '@/lib/types';
import { Pager } from './pager';

interface AuditRow {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  actorName: string | null;
  createdAt: string;
}

const PAGE_SIZE = 20;

/** 감사 로그: 그룹/행위 필터, 서버 페이지네이션 */
export function AuditPanel() {
  const [groupId, setGroupId] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE), ...(groupId ? { groupId } : {}), ...(action ? { action } : {}) });
  const { data } = useQuery({ queryKey: ['audit-logs', params.toString()], queryFn: () => api<Paged<AuditRow>>(`/admin/audit-logs?${params}`), refetchInterval: 30_000 });
  const { data: groups } = useQuery({ queryKey: ['groups'], queryFn: () => api<GroupRow[]>('/admin/groups') });
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <select
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          value={groupId}
          onChange={(e) => {
            setGroupId(e.target.value);
            setPage(1);
          }}
        >
          <option value="">전체 그룹</option>
          {groups?.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <Input
          className="max-w-xs"
          placeholder="행위 검색 (예: team, membership)"
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
        />
      </div>
      {data?.total === 0 ? (
        <Empty>기록이 없습니다.</Empty>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3">시각</th>
                <th className="px-4 py-3">행위자</th>
                <th className="px-4 py-3">행위</th>
                <th className="px-4 py-3">대상</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.items.map((l) => (
                <tr key={l.id}>
                  <td className="whitespace-nowrap px-4 py-2 text-xs text-slate-500">{new Date(l.createdAt).toLocaleString('ko-KR')}</td>
                  <td className="px-4 py-2">{l.actorName ?? <Badge>시스템</Badge>}</td>
                  <td className="px-4 py-2 font-mono text-xs">{l.action}</td>
                  <td className="px-4 py-2 text-xs text-slate-500">
                    {l.targetType} · {l.targetId.slice(0, 8)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <Pager page={data?.page ?? 1} pages={pages} setPage={setPage} total={data?.total ?? 0} />
    </div>
  );
}
