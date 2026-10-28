'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card, Empty, ErrorText, Input } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { Pager, usePaging } from '@/components/pager';
import { api } from '@/lib/api';
import { useGroup, useGroupId } from '@/lib/hooks';
import type { TeamItem } from '@/lib/types';

/** 팀 관리: 그룹 ADMIN은 전체 팀, 팀 ADMIN은 담당 팀만 */
export default function AdminTeamsPage() {
  const groupId = useGroupId();
  const { data: group } = useGroup();
  const { data: teams } = useQuery({
    queryKey: ['group', groupId, 'teams'],
    queryFn: () => api<TeamItem[]>(`/groups/${groupId}/teams`),
    enabled: !!group,
  });
  const isGroupAdmin = group?.me.role === 'ADMIN';
  const list = (teams ?? []).filter((t) => isGroupAdmin || t.myRole === 'ADMIN');
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', description: '', visibility: 'PUBLIC' as 'PUBLIC' | 'PRIVATE', requireApproval: true });
  const [error, setError] = useState<string>();
  const create = useMutation({
    mutationFn: () => api(`/groups/${groupId}/teams`, { body: { ...form, name: form.name.trim(), description: form.description.trim() || undefined } }),
    onSuccess: () => {
      setError(undefined);
      setForm({ name: '', description: '', visibility: 'PUBLIC', requireApproval: true });
      qc.invalidateQueries({ queryKey: ['group', groupId] });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const pg = usePaging(list);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">팀 관리</h1>
      <p className="text-sm text-slate-500">팀을 눌러 공개 여부, 가입 방식, 코드와 팀 ADMIN을 관리하세요.</p>
      {isGroupAdmin && (
        <Card className="space-y-3">
          <h2 className="font-bold">팀 만들기</h2>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <Input className="sm:col-span-2" placeholder="팀 이름" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input className="sm:col-span-2" placeholder="팀 소개 (선택)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value as 'PUBLIC' | 'PRIVATE' })}>
              <option value="PUBLIC">공개 (팀 목록 노출)</option>
              <option value="PRIVATE">비공개 (코드로만 가입)</option>
            </select>
            <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={form.requireApproval ? 'APPROVAL' : 'AUTO'} onChange={(e) => setForm({ ...form, requireApproval: e.target.value === 'APPROVAL' })}>
              <option value="APPROVAL">승인 후 가입</option>
              <option value="AUTO">자동 승인</option>
            </select>
            <div className="sm:col-span-2 flex items-center gap-3">
              <Button type="submit" disabled={create.isPending || !form.name.trim()}>
                팀 만들기
              </Button>
              <ErrorText>{error}</ErrorText>
            </div>
          </form>
        </Card>
      )}
      {list.length === 0 ? (
        <Empty>관리할 팀이 없습니다.</Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {pg.items.map((t) => (
            <Link key={t.id} href={`/g/${groupId}/teams/${t.id}`}>
              <Card className="h-full space-y-2 transition hover:ring-brand-200">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{t.name}</p>
                  {t.myRole === 'ADMIN' && <Badge tone="brand">담당</Badge>}
                </div>
                <p className="text-xs text-slate-400">멤버 {t.memberCount}명 · 담당 {t.admins.map((a) => a.name).join(', ') || '-'}</p>
              </Card>
            </Link>
          ))}
            <div className="col-span-full"><Pager page={pg.page} pages={pg.pages} setPage={pg.setPage} total={pg.total} /></div>
        </div>
      )}
    </div>
  );
}
