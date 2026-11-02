'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { Badge, Button, Card, Empty, ErrorText, Input } from '@/components/ui';
import { Pager } from '@/components/pager';
import { api, errorMessage } from '@/lib/api';
import { useGroupId } from '@/lib/hooks';
import type { Paginated } from '@/lib/types';

interface Game {
  id: string;
  title: string;
  status: 'RECRUITING' | 'DRAWING' | 'DONE' | 'CANCELED';
  teamName: string | null;
  winnerCount: number;
  participantCount: number;
  joined: boolean;
}
const STATUS = {
  RECRUITING: { label: '모집 중', tone: 'green' },
  DRAWING: { label: '뽑는 중', tone: 'amber' },
  DONE: { label: '종료', tone: 'slate' },
  CANCELED: { label: '취소', tone: 'slate' },
} as const;

/** 간식 쏘기 랜덤 뽑기 목록 */
export default function SnackPage() {
  const groupId = useGroupId();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [teamId, setTeamId] = useState('');
  const [winnerCount, setWinnerCount] = useState<number | ''>('');
  const [error, setError] = useState<string>();

  const { data } = useQuery({
    queryKey: ['group', groupId, 'snack', page],
    queryFn: () => api<Paginated<Game> & { enabled: boolean; canCreate: boolean; defaultWinnerCount: number; teams: { id: string; name: string }[] }>(`/groups/${groupId}/snack-draws?page=${page}&pageSize=10`),
  });

  const create = useMutation({
    mutationFn: () => api(`/groups/${groupId}/snack-draws`, { body: { title: title.trim(), teamId: teamId || null, ...(winnerCount ? { winnerCount } : {}) } }),
    onSuccess: () => {
      setError(undefined);
      setCreating(false);
      setTitle('');
      setWinnerCount('');
      qc.invalidateQueries({ queryKey: ['group', groupId, 'snack'] });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  if (!data) return <p className="text-slate-400">불러오는 중…</p>;
  if (!data.enabled) return <Card>이 기능은 아직 그룹에서 사용할 수 없어요.</Card>;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">간식 쏘기 🍩</h1>
        {data.canCreate && <Button onClick={() => setCreating((v) => !v)}>{creating ? '닫기' : '게임 만들기'}</Button>}
      </div>
      <ErrorText>{error}</ErrorText>
      {creating && (
        <Card className="space-y-3">
          <Input placeholder="제목 (예: 금요일 커피 쏘기)" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} />
          <div className="grid gap-2 sm:grid-cols-2">
            <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              <option value="">그룹 전체</option>
              {data.teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} 팀
                </option>
              ))}
            </select>
            <Input type="number" min={1} max={10} placeholder={`당첨 인원 (기본 ${data.defaultWinnerCount}명)`} value={winnerCount} onChange={(e) => setWinnerCount(e.target.value ? Number(e.target.value) : '')} />
          </div>
          <Button onClick={() => create.mutate()} disabled={!title.trim() || create.isPending}>
            만들기
          </Button>
        </Card>
      )}
      {data.items.length === 0 ? (
        <Empty>진행 중인 게임이 없어요.</Empty>
      ) : (
        data.items.map((g) => (
          <Link key={g.id} href={`/g/${groupId}/snack/${g.id}`}>
            <Card className="mb-2 flex items-center gap-3 transition hover:shadow-md">
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{g.title}</p>
                <p className="text-xs text-slate-500">
                  {g.teamName ? `${g.teamName} 팀` : '그룹 전체'} · 참가 {g.participantCount}명 · 당첨 {g.winnerCount}명
                </p>
              </div>
              {g.joined && <Badge tone="green">참가</Badge>}
              <Badge tone={STATUS[g.status].tone}>{STATUS[g.status].label}</Badge>
            </Card>
          </Link>
        ))
      )}
      <Pager page={page} pages={Math.max(1, Math.ceil(data.total / data.pageSize))} setPage={setPage} total={data.total} />
    </div>
  );
}
