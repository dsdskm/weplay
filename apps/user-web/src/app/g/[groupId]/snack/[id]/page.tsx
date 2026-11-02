'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Badge, Button, Card, ErrorText } from '@/components/ui';
import { useDialog } from '@/components/confirm-dialog';
import { api, errorMessage } from '@/lib/api';
import { useGroupId } from '@/lib/hooks';

type Result = 'WIN' | 'LOSE' | null;
interface Detail {
  id: string;
  title: string;
  status: 'RECRUITING' | 'DRAWING' | 'DONE' | 'CANCELED';
  theme: 'CARD' | 'CAPSULE' | string;
  winnerCount: number;
  canStart: boolean;
  canCancel: boolean;
  joined: boolean;
  canDraw: boolean;
  myResult: Result;
  participants: { user: { id: string; name: string }; drawn: boolean; result: Result }[];
  slots: { position: number; drawn: boolean; by: { id: string; name: string } | null; result: Result }[];
}

/** 간식 쏘기 게임: 모집 → 칸 뽑기(당첨/다음 기회) */
export default function SnackGamePage() {
  const groupId = useGroupId();
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { confirm } = useDialog();
  const [error, setError] = useState<string>();
  const [flash, setFlash] = useState<Result>(null);

  const { data: g } = useQuery({
    queryKey: ['group', groupId, 'snack', 'detail', id],
    queryFn: () => api<Detail>(`/groups/${groupId}/snack-draws/${id}`),
    refetchInterval: (q) => (q.state.data?.status === 'DRAWING' || q.state.data?.status === 'RECRUITING' ? 4000 : false),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['group', groupId, 'snack'] });
  const onError = (e: unknown) => setError(errorMessage(e));
  const post = (path: string, body: unknown = {}) => api<{ result?: Result }>(`/groups/${groupId}/snack-draws/${id}/${path}`, { body });

  const join = useMutation({ mutationFn: () => post('join'), onSuccess: refresh, onError });
  const leave = useMutation({ mutationFn: () => api(`/groups/${groupId}/snack-draws/${id}/join`, { method: 'DELETE' }), onSuccess: refresh, onError });
  const start = useMutation({ mutationFn: () => post('start'), onSuccess: refresh, onError });
  const cancel = useMutation({ mutationFn: () => post('cancel'), onSuccess: refresh, onError });
  const draw = useMutation({
    mutationFn: (position: number) => post('draw', { position }),
    onSuccess: (r) => {
      setError(undefined);
      setFlash(r.result ?? null);
      refresh();
    },
    onError: (e) => {
      onError(e);
      refresh();
    },
  });

  if (!g) return <p className="text-slate-400">불러오는 중…</p>;
  const capsule = g.theme === 'CAPSULE';
  const drawn = g.slots.filter((s) => s.drawn).length;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href={`/g/${groupId}/snack`} className="text-sm text-slate-500">
        ← 간식 쏘기
      </Link>
      <ErrorText>{error}</ErrorText>
      <Card className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-black">🍩 {g.title}</h1>
          <Badge tone={g.status === 'DRAWING' ? 'amber' : g.status === 'RECRUITING' ? 'green' : 'slate'}>
            {{ RECRUITING: '모집 중', DRAWING: '뽑는 중', DONE: '종료', CANCELED: '취소됨' }[g.status]}
          </Badge>
        </div>
        <p className="text-xs text-slate-500">
          참가 {g.participants.length}명 · 당첨 {g.winnerCount}명{g.status === 'DRAWING' && ` · 뽑힘 ${drawn}/${g.slots.length}`}
        </p>
      </Card>

      {flash && (
        <Card className={`text-center ${flash === 'WIN' ? 'bg-amber-50' : 'bg-slate-50'}`}>
          <p className="text-3xl font-black">{flash === 'WIN' ? '🎉 당첨!! 간식 쏘세요!' : '😅 다음 기회에…'}</p>
          <Button variant="ghost" onClick={() => setFlash(null)}>
            닫기
          </Button>
        </Card>
      )}

      {g.status === 'RECRUITING' && (
        <Card className="flex flex-wrap items-center gap-2">
          {g.joined ? (
            <Button variant="secondary" onClick={() => leave.mutate()}>
              참가 취소
            </Button>
          ) : (
            <Button onClick={() => join.mutate()}>참가하기</Button>
          )}
          {g.canStart && (
            <Button
              onClick={async () => {
                if (await confirm({ message: `참가자 ${g.participants.length}명으로 뽑기를 시작할까요? 시작 후에는 참가자를 바꿀 수 없어요.` })) start.mutate();
              }}
              disabled={g.participants.length < 2}
            >
              뽑기 시작
            </Button>
          )}
        </Card>
      )}

      {(g.status === 'DRAWING' || g.status === 'DONE') && (
        <Card className="space-y-3">
          {g.status === 'DRAWING' && <p className="text-sm text-slate-600">{g.canDraw ? '마음에 드는 칸을 골라 뽑아 보세요!' : g.joined ? '이미 뽑았어요. 다른 사람을 기다려요.' : '구경 중이에요.'}</p>}
          {g.myResult && <p className="text-sm font-semibold">내 결과: {g.myResult === 'WIN' ? '🎉 당첨' : '다음 기회에'}</p>}
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
            {g.slots.map((s) => {
              const closed = s.drawn;
              const face = closed ? (s.result === 'WIN' ? '🎁' : '💨') : capsule ? '🟣' : '🂠';
              return (
                <button
                  key={s.position}
                  type="button"
                  disabled={closed || !g.canDraw || draw.isPending}
                  onClick={() => draw.mutate(s.position)}
                  className={`flex aspect-square flex-col items-center justify-center rounded-2xl text-3xl ring-1 transition ${
                    closed ? (s.result === 'WIN' ? 'bg-amber-100 ring-amber-300' : 'bg-slate-100 ring-slate-200') : g.canDraw ? 'bg-white ring-slate-200 hover:-translate-y-1 hover:shadow-md' : 'bg-white opacity-70 ring-slate-200'
                  }`}
                >
                  {face}
                  <span className="mt-0.5 max-w-full truncate text-[10px] text-slate-500">{closed ? (s.by?.name ?? '') : s.position}</span>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      <Card className="space-y-2">
        <h2 className="font-bold">참가자</h2>
        <div className="flex flex-wrap gap-2 text-sm">
          {g.participants.map((p) => (
            <span key={p.user.id} className="rounded-full bg-slate-100 px-3 py-1">
              {p.user.name} {p.result === 'WIN' ? '🎁' : p.result === 'LOSE' ? '💨' : p.drawn ? '✅' : ''}
            </span>
          ))}
        </div>
      </Card>

      {g.canCancel && (
        <div className="text-right">
          <Button
            variant="danger"
            onClick={async () => {
              if (await confirm({ message: '이 게임을 취소할까요?', danger: true })) cancel.mutate();
            }}
          >
            게임 취소
          </Button>
        </div>
      )}
    </div>
  );
}
