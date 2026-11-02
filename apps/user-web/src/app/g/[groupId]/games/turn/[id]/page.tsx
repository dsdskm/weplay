'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { turnGameDef } from '@weplay/shared';
import { Avatar, Button, Card, cn, ErrorText } from '@/components/ui';
import { useDialog } from '@/components/confirm-dialog';
import { BombView, ChainView, DetectiveView, NominateView, QuizView, TurnDetail, TwentyQView } from '@/components/games/turn-views';
import { api, errorMessage } from '@/lib/api';
import { timeLeft } from '@/lib/format';
import { useGroupId } from '@/lib/hooks';

const CHAIN = ['TELEPHONE', 'STORY', 'DRAW_RELAY', 'VIDEO_RELAY', 'AI_TELEPHONE'];

/** 턴제 게임 한 판: 참가 → 시작 → 차례대로 → 결과 공개. 게임 종류마다 화면이 다름 */
export default function TurnGamePage() {
  const groupId = useGroupId();
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { confirm } = useDialog();
  const [error, setError] = useState<string>();
  const { data: g } = useQuery({ queryKey: ['group', groupId, 'turn-games', 'detail', id], queryFn: () => api<TurnDetail>(`/groups/${groupId}/turn-games/${id}`), refetchInterval: 8000 });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['group', groupId, 'turn-games'] });
    qc.invalidateQueries({ queryKey: ['group', groupId, 'points'] });
  };
  const call = useMutation({
    mutationFn: ({ path, body }: { path: string; body?: unknown }) => api<any>(`/groups/${groupId}/turn-games/${id}/${path}`, { body: body ?? {} }),
    onSuccess: () => {
      setError(undefined);
      refresh();
    },
    onError: (e) => setError(errorMessage(e)),
  });
  const act = async (body: Record<string, unknown>) => {
    try {
      const r = await call.mutateAsync({ path: 'act', body });
      setError(undefined);
      refresh();
      return r;
    } catch (e) {
      setError(errorMessage(e));
      throw e;
    }
  };

  if (!g) return <p className="text-slate-400">불러오는 중…</p>;
  const def = turnGameDef(g.type);
  const props = { g, groupId, act, busy: call.isPending };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href={`/g/${groupId}/games`} className="text-sm text-slate-500">
        ← 게임
      </Link>
      <div className="wp-gradient relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-6 text-white shadow-xl">
        <span className="wp-float pointer-events-none absolute -right-2 -top-2 text-8xl opacity-30">{def?.icon}</span>
        <p className="text-xs font-bold uppercase tracking-widest opacity-80">{def?.name}</p>
        <h1 className="text-2xl font-black">{g.title}</h1>
        <p className="mt-1 max-w-[80%] text-sm opacity-90">{def?.tagline}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
          <span className="rounded-full bg-white/20 px-3 py-1">{{ RECRUITING: '참가자 모집 중', PLAYING: '진행 중', DONE: '끝! 결과 공개', CANCELED: '취소됨' }[g.status]}</span>
          <span className="rounded-full bg-white/20 px-3 py-1">참가비 {g.economy.entryFee}P</span>
          {g.totalTurns && g.status === 'PLAYING' && (
            <span className="rounded-full bg-white/20 px-3 py-1">
              턴 {g.turnIndex + 1}/{g.totalTurns}
            </span>
          )}
        </div>
      </div>
      <ErrorText>{error}</ErrorText>

      {/* 참가자 · 차례 */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">참가자 {g.participants.length}명</h2>
          {g.status === 'PLAYING' && g.currentUser && (
            <span className="text-xs text-slate-500">
              {g.isMyTurn ? '👉 내 차례!' : `${g.currentUser.name}님 차례`} {g.turnDeadline && `· ${timeLeft(g.turnDeadline)}`}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {g.participants.map((p, i) =>
            p.user ? (
              <span
                key={p.user.id}
                style={{ animationDelay: `${i * 40}ms` }}
                className={cn(
                  'wp-pop-in flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-sm ring-1 transition',
                  g.currentUser?.id === p.user.id ? 'wp-glow bg-amber-50 font-bold ring-amber-400' : p.done ? 'bg-emerald-50 ring-emerald-200' : 'bg-white ring-slate-200',
                )}
              >
                <Avatar name={p.user.name} url={p.user.avatarUrl} size={24} />
                {p.user.name}
                {g.currentUser?.id === p.user.id && (g.type === 'BOMB' ? ' 💣' : ' ✍️')}
                {p.done && g.type !== 'BOMB' && ' ✓'}
              </span>
            ) : null,
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {g.canJoin && <Button onClick={() => call.mutate({ path: 'join' })}>참가하기 (-{g.economy.entryFee}P)</Button>}
          {g.status === 'RECRUITING' && g.joined && !g.canManage && (
            <Button variant="secondary" onClick={() => call.mutate({ path: 'leave' })}>
              참가 취소
            </Button>
          )}
          {g.status === 'RECRUITING' && g.canManage && (
            <Button
              disabled={g.participants.length < (g.minPlayers ?? 2)}
              onClick={async () => {
                if (await confirm({ message: `${g.participants.length}명으로 시작할까요? 순서는 무작위로 정해져요.` })) call.mutate({ path: 'start' });
              }}
            >
              시작하기 {g.participants.length < (g.minPlayers ?? 2) && `(${g.minPlayers}명부터)`}
            </Button>
          )}
          {(g.status === 'RECRUITING' || g.status === 'PLAYING') && g.canManage && (
            <Button
              variant="ghost"
              onClick={async () => {
                if (await confirm({ message: '게임을 취소할까요? 참가비는 모두 돌려줘요.', danger: true })) call.mutate({ path: 'cancel' });
              }}
            >
              게임 취소
            </Button>
          )}
        </div>
      </Card>

      {CHAIN.includes(g.type) && <ChainView {...props} />}
      {g.type === 'CHAIN_QUIZ' && <QuizView {...props} />}
      {g.type === 'DETECTIVE' && <DetectiveView {...props} />}
      {g.type === 'BOMB' && <BombView {...props} />}
      {g.type === 'TWENTY_Q' && <TwentyQView {...props} />}
      {g.type === 'NOMINATE' && <NominateView {...props} />}
      {g.status === 'DONE' && (
        <p className="text-center text-xs text-slate-400">
          끝까지 함께한 사람에게 완주 보상 +{g.economy.completeReward}P 가 지급됐어요.
          {g.type === 'DETECTIVE' && ` 범인을 맞히면 참가자 모두 +${g.economy.detectiveReward}P`}
        </p>
      )}
    </div>
  );
}
