'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { AccountsPanel } from '@/components/accounts-panel';
import { AuditPanel } from '@/components/audit-panel';
import { Pager, usePaging } from '@/components/pager';
import { SortTh, sortRows, useSort } from '@/components/sort';
import { Badge, Button, Card, Empty, ErrorText, Input } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import type { GroupRow } from '@/lib/types';

type Tab = 'groups' | 'accounts' | 'master' | 'logs';

export default function GroupsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('groups');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string>();
  const { data } = useQuery({ queryKey: ['groups'], queryFn: () => api<GroupRow[]>('/admin/groups') });
  const { sort, toggle } = useSort();
  const rows = sortRows(data ?? [], sort, {
    name: (c) => c.name,
    joinCode: (c) => c.joinCode,
    status: (c) => c.status,
    memberCount: (c) => c.memberCount,
    teamCount: (c) => c.teamCount,
    pendingCount: (c) => c.pendingCount,
    createdAt: (c) => c.createdAt,
  });
  const pg = usePaging(rows);
  const remove = useMutation({
    mutationFn: (id: string) => api(`/admin/groups/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      setError(undefined);
      qc.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: (e) => setError(errorMessage(e)),
  });
  const create = useMutation({
    mutationFn: () => api('/admin/groups', { body: { name, description: description || undefined } }),
    onSuccess: () => {
      setName('');
      setDescription('');
      setError(undefined);
      qc.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">그룹 관리</h1>
      <div className="flex gap-2">
        {(['groups', 'accounts', 'master', 'logs'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={tab === t ? 'rounded-full bg-brand-600 px-4 py-1.5 text-sm text-white' : 'rounded-full bg-white px-4 py-1.5 text-sm text-slate-600 ring-1 ring-slate-200'}
          >
            {t === 'groups' ? '그룹' : t === 'accounts' ? '계정' : t === 'master' ? 'MASTER' : '로그'}
          </button>
        ))}
      </div>
      {tab === 'logs' ? (
        <AuditPanel />
      ) : tab === 'accounts' || tab === 'master' ? (
        <AccountsPanel key={tab} role={tab === 'master' ? 'MASTER' : 'USER'} />
      ) : (
        <>
      <Card>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <Input className="max-w-xs" placeholder="그룹 이름 (예: LG전자)" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input className="flex-1" placeholder="소개 (선택)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Button type="submit" disabled={create.isPending}>
            그룹 생성
          </Button>
        </form>
        <ErrorText>{error}</ErrorText>
      </Card>
      {data?.length === 0 ? (
        <Empty>그룹이 없습니다. 먼저 생성하세요.</Empty>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <SortTh k="name" sort={sort} onSort={toggle}>그룹</SortTh>
                <SortTh k="joinCode" sort={sort} onSort={toggle}>그룹 코드</SortTh>
                <SortTh k="status" sort={sort} onSort={toggle}>상태</SortTh>
                <SortTh k="memberCount" sort={sort} onSort={toggle} className="text-right">구성원</SortTh>
                <SortTh k="teamCount" sort={sort} onSort={toggle} className="text-right">팀</SortTh>
                <SortTh k="pendingCount" sort={sort} onSort={toggle} className="text-right">대기</SortTh>
                <SortTh k="createdAt" sort={sort} onSort={toggle}>생성일</SortTh>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pg.items.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold">
                    <Link href={`/groups/${c.id}`} className="text-brand-700 hover:underline">
                      {c.name}
                    </Link>
                    {!c.primaryAdminId && <Badge tone="amber">대표 미지정</Badge>}
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {c.joinCode} {!c.joinCodeEnabled && <Badge tone="rose">비활성</Badge>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={c.status === 'ACTIVE' ? 'green' : 'rose'}>{c.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">{c.memberCount}</td>
                  <td className="px-4 py-3 text-right">{c.teamCount}</td>
                  <td className="px-4 py-3 text-right">{c.pendingCount > 0 ? <Badge tone="amber">{c.pendingCount}</Badge> : 0}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(c.createdAt).toLocaleDateString('ko-KR')}</td>
                  <td className="space-x-1 whitespace-nowrap px-4 py-3 text-right">
                    <Link href={`/groups/${c.id}`} className="inline-flex rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
                      수정
                    </Link>
                    <Button
                      variant="ghost"
                      className="text-rose-600"
                      onClick={() => confirm(`${c.name}을(를) 삭제할까요?`) && remove.mutate(c.id)}
                      disabled={remove.isPending}
                    >
                      삭제
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3">
            <Pager page={pg.page} pages={pg.pages} setPage={pg.setPage} total={pg.total} />
          </div>
        </Card>
      )}
        </>
      )}
    </div>
  );
}
