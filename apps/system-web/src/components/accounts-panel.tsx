'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AccountDialog } from '@/components/account-dialog';
import { SortTh, useSort } from '@/components/sort';
import { Badge, Button, Card, cn, Empty, ErrorText, Input } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import type { AdminTeam, AdminUser, AdminUserDetail, GroupRow, Paged } from '@/lib/types';

const PAGE_SIZES = [10, 20, 50, 100];
const PAGE_SIZE_KEY = 'accounts.pageSize';

type Status = 'ACTIVE' | 'DEACTIVATED';
type Filter = { q: string; status: '' | Status; adminScope: '' | 'GROUP' | 'TEAM'; groupId: string; teamId: string };
type BulkAction =
  | { type: 'status'; status: Status }
  | { type: 'group'; groupId: string; role: 'ADMIN' | 'USER' }
  | { type: 'team'; teamId: string }
  | { type: 'delete' };

export function AccountsPanel({ role }: { role: 'USER' | 'MASTER' }) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>({ q: '', status: '', adminScope: '', groupId: '', teamId: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { sort, toggle: toggleSort } = useSort({ key: 'createdAt', dir: 'desc' });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string>();
  const [error, setError] = useState<string>();
  const [dialog, setDialog] = useState<{ mode: 'create' | 'edit' }>();
  const [bulkGroup, setBulkGroup] = useState({ groupId: '', role: 'ADMIN' as 'ADMIN' | 'USER' });
  const [bulkTeamId, setBulkTeamId] = useState('');
  const [bulkStatus, setBulkStatus] = useState<Status>('ACTIVE');
  const [teamAdminTarget, setTeamAdminTarget] = useState('');

  useEffect(() => {
    const saved = Number(localStorage.getItem(PAGE_SIZE_KEY));
    if (PAGE_SIZES.includes(saved)) setPageSize(saved);
  }, []);
  const changePageSize = (n: number) => {
    setPageSize(n);
    localStorage.setItem(PAGE_SIZE_KEY, String(n));
    setPage(1);
  };

  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    ...(filter.q ? { q: filter.q } : {}),
    role,
    ...(sort ? { sort: sort.key, dir: sort.dir } : {}),
    ...(filter.status ? { status: filter.status } : {}),
    ...(filter.adminScope ? { adminScope: filter.adminScope } : {}),
    ...(filter.groupId ? { groupId: filter.groupId } : {}),
    ...(filter.teamId ? { teamId: filter.teamId } : {}),
  });
  const { data } = useQuery({ queryKey: ['users', params.toString()], queryFn: () => api<Paged<AdminUser>>(`/admin/users?${params}`) });
  const { data: detail } = useQuery({
    queryKey: ['user', detailId],
    queryFn: () => api<AdminUserDetail>(`/admin/users/${detailId}`),
    enabled: !!detailId,
  });
  const { data: groups } = useQuery({ queryKey: ['groups'], queryFn: () => api<GroupRow[]>('/admin/groups') });
  const { data: teams } = useQuery({ queryKey: ['teams'], queryFn: () => api<AdminTeam[]>('/admin/teams') });

  const invalidate = () => {
    setError(undefined);
    qc.invalidateQueries({ queryKey: ['users'] });
    qc.invalidateQueries({ queryKey: ['user'] });
  };
  const onError = (e: unknown) => setError(errorMessage(e));

  const run = useMutation({
    mutationFn: ({ path, method, body }: { path: string; method?: string; body?: unknown }) => api(path, { method, body: body ?? {} }),
    onSuccess: invalidate,
    onError,
  });
  const bulk = useMutation({
    mutationFn: (action: BulkAction) => api<{ updated: number }>('/admin/users/bulk', { body: { userIds: [...selected], action } }),
    onSuccess: () => {
      setSelected(new Set());
      invalidate();
    },
    onError,
  });

  const updateFilter = (patch: Partial<Filter>) => {
    setFilter({ ...filter, ...patch });
    setPage(1);
  };
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const pageIds = data?.items.map((u) => u.id) ?? [];
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));

  const applyStatus = (status: Status) => {
    if (status !== 'ACTIVE' && !confirm(`${selected.size}명의 상태를 ${status}로 변경할까요?`)) return;
    bulk.mutate({ type: 'status', status });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setDialog({ mode: 'create' })}>계정 추가</Button>
      </div>

      {dialog && (dialog.mode === 'create' || detail?.id === detailId) && (
        <AccountDialog
          user={dialog.mode === 'edit' ? detail : undefined}
          defaultPlatformRole={role}
          onClose={() => {
            setDialog(undefined);
            setDetailId(undefined);
          }}
        />
      )}

      <ErrorText>{error}</ErrorText>


      <div className="flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="이름 / 이메일 / 아이디 검색" value={filter.q} onChange={(e) => updateFilter({ q: e.target.value })} />
        <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={filter.groupId} onChange={(e) => updateFilter({ groupId: e.target.value, teamId: '' })}>
          <option value="">전체 그룹</option>
          {groups?.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={filter.teamId} onChange={(e) => updateFilter({ teamId: e.target.value })}>
          <option value="">전체 팀</option>
          {teams?.filter((t) => !filter.groupId || t.group.id === filter.groupId).map((t) => (
            <option key={t.id} value={t.id}>
              {t.group.name} / {t.name}
            </option>
          ))}
        </select>
        <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={filter.adminScope} onChange={(e) => updateFilter({ adminScope: e.target.value as Filter['adminScope'] })}>
          <option value="">전체 관리자</option>
          <option value="GROUP">그룹 ADMIN</option>
          <option value="TEAM">팀 ADMIN</option>
        </select>
        <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={filter.status} onChange={(e) => updateFilter({ status: e.target.value as Filter['status'] })}>
          <option value="">전체 상태</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="DEACTIVATED">DEACTIVATED</option>
        </select>
      </div>

      {selected.size > 0 && (
        <Card className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">{selected.size}명 선택</span>
          <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={bulkGroup.groupId} onChange={(e) => setBulkGroup({ ...bulkGroup, groupId: e.target.value })}>
            <option value="">그룹 선택</option>
            {groups?.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={bulkGroup.role} onChange={(e) => setBulkGroup({ ...bulkGroup, role: e.target.value as 'ADMIN' | 'USER' })}>
            <option value="ADMIN">그룹 ADMIN</option>
            <option value="USER">USER</option>
          </select>
          <Button disabled={!bulkGroup.groupId || bulk.isPending} onClick={() => bulk.mutate({ type: 'group', ...bulkGroup })}>
            그룹 적용
          </Button>
          <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={bulkTeamId} onChange={(e) => setBulkTeamId(e.target.value)}>
            <option value="">팀 선택</option>
            {teams?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.group.name} / {t.name}
              </option>
            ))}
          </select>
          <Button disabled={!bulkTeamId || bulk.isPending} onClick={() => bulk.mutate({ type: 'team', teamId: bulkTeamId })}>
            팀 적용
          </Button>
          <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value as Status)}>
            <option value="ACTIVE">ACTIVE</option>
            <option value="DEACTIVATED">DEACTIVATED</option>
          </select>
          <Button variant="danger" disabled={bulk.isPending} onClick={() => applyStatus(bulkStatus)}>
            상태 적용
          </Button>
          <Button
            variant="danger"
            disabled={bulk.isPending}
            onClick={() => confirm(`${selected.size}명을 삭제할까요? 되돌릴 수 없습니다.`) && bulk.mutate({ type: 'delete' })}
          >
            삭제
          </Button>
          <Button variant="ghost" onClick={() => setSelected(new Set())}>
            선택 해제
          </Button>
        </Card>
      )}

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3">
                <input type="checkbox" checked={allOnPage} onChange={() => setSelected(allOnPage ? new Set() : new Set(pageIds))} />
              </th>
              <SortTh k="name" sort={sort} onSort={(k) => { toggleSort(k); setPage(1); }}>이름</SortTh>
              <SortTh k="email" sort={sort} onSort={(k) => { toggleSort(k); setPage(1); }}>이메일 / 아이디</SortTh>
              <th className="px-4 py-3">계정 유형</th>
              <SortTh k="status" sort={sort} onSort={(k) => { toggleSort(k); setPage(1); }}>상태</SortTh>
              <th className="px-4 py-3">그룹</th>
              <th className="px-4 py-3">팀</th>
              <SortTh k="lastLoginAt" sort={sort} onSort={(k) => { toggleSort(k); setPage(1); }}>최근 로그인</SortTh>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data?.items.map((u) => (
              <tr key={u.id} onClick={() => {
                  setDetailId(u.id);
                  setDialog({ mode: 'edit' });
                }} className={cn('cursor-pointer hover:bg-slate-50', detailId === u.id && 'bg-brand-50')}>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggle(u.id)} />
                </td>
                <td className="px-4 py-3 font-semibold">{u.name}</td>
                <td className="px-4 py-3 text-slate-500">{u.email ?? u.username}</td>
                <td className="px-4 py-3">
                  <Badge tone={TYPE_TONE[accountType(u)]}>{accountType(u)}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={u.status === 'ACTIVE' ? 'green' : 'rose'}>{u.status}</Badge>
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">
                  {u.groupMemberships.map((m) => `${m.group.name}${m.role === 'ADMIN' ? ' (그룹 ADMIN)' : ''}`).join(', ') || '-'}
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">
                  {u.teamMembers.map((m) => `${m.team.name}${m.role === 'ADMIN' ? ' (팀 ADMIN)' : ''}`).join(', ') || '-'}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('ko-KR') : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <span className="flex items-center gap-2">
          총 {data?.total ?? 0}명
          <select className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm" value={pageSize} onChange={(e) => changePageSize(Number(e.target.value))}>
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}개씩
              </option>
            ))}
          </select>
        </span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            이전
          </Button>
          <span>
            {page} / {totalPages}
          </span>
          <Button variant="ghost" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            다음
          </Button>
        </div>
      </div>
    </div>
  );
}

/** 계정 유형: MASTER > ADMIN(그룹/팀 ADMIN 보유) > USER */
export function accountType(u: { platformRole: string; groupMemberships: { role: string }[]; teamMembers: { role: string }[] }) {
  if (u.platformRole === 'MASTER') return 'MASTER';
  return [...u.groupMemberships, ...u.teamMembers].some((m) => m.role === 'ADMIN') ? 'ADMIN' : 'USER';
}

const TYPE_TONE = { MASTER: 'brand', ADMIN: 'amber', USER: 'slate' } as const;

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="font-medium">{value || '-'}</dd>
    </div>
  );
}
