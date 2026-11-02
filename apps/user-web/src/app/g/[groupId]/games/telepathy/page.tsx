'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { Button, Card, cn, ErrorText } from '@/components/ui';
import { Confetti, CountUp } from '@/components/games/fx';
import { api, errorMessage } from '@/lib/api';
import type { DailyState } from '@/lib/games';
import { useGroupId } from '@/lib/hooks';

/** 팀 텔레파시(같은 답 찾기)와 밸런스 게임(A vs B). 하루 한 번, 답하면 결과가 보임 */
export default function TelepathyPage() {
  const groupId = useGroupId();
  const qc = useQueryClient();
  const [error, setError] = useState<string>();
  const [bonus, setBonus] = useState(false);
  const { data } = useQuery({ queryKey: ['group', groupId, 'games', 'daily'], queryFn: () => api<DailyState>(`/groups/${groupId}/games/daily`), refetchInterval: 30_000 });
  const answer = useMutation({
    mutationFn: ({ kind, value }: { kind: 'TELEPATHY' | 'BALANCE'; value: string }) => api<{ bonus: boolean }>(`/groups/${groupId}/games/daily/${kind}`, { body: { answer: value } }),
    onSuccess: (r) => {
      setError(undefined);
      if (r.bonus) setBonus(true);
      qc.invalidateQueries({ queryKey: ['group', groupId, 'games'] });
      qc.invalidateQueries({ queryKey: ['group', groupId, 'points'] });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  if (!data) return <p className="text-slate-400">불러오는 중…</p>;
  if (!data.enabled) return <Card>이 기능은 아직 그룹에서 사용할 수 없어요.</Card>;
  const t = data.telepathy;
  const b = data.balance;
  const teamCounts = t.team?.counts ?? [];
  const teamMax = Math.max(1, ...teamCounts);
  const minority = b.total ? (b.countA <= b.countB ? 'A' : 'B') : null;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {bonus && <Confetti count={80} />}
      <Link href={`/g/${groupId}/games`} className="text-sm text-slate-500">
        ← 게임
      </Link>
      <div className="wp-gradient relative overflow-hidden rounded-3xl bg-gradient-to-br from-fuchsia-500 via-violet-600 to-indigo-700 p-6 text-white shadow-xl">
        <span className="wp-float pointer-events-none absolute -right-3 -top-3 text-8xl opacity-25">🔮</span>
        <p className="text-xs font-bold uppercase tracking-widest opacity-80">{data.date} · 매일 한 번</p>
        <h1 className="text-3xl font-black">팀 텔레파시 · 밸런스</h1>
        <p className="mt-1 text-sm opacity-90">
          답하면 +{data.reward}P. 팀에서 가장 많이 고른 답과 같으면 +{data.bonus}P 보너스!
        </p>
      </div>
      <ErrorText>{error}</ErrorText>

      {/* 팀 텔레파시 */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-black">🔮 {t.question}</h2>
          {t.team && (
            <span className="shrink-0 rounded-full bg-fuchsia-100 px-3 py-1 text-xs font-bold text-fuchsia-700">
              싱크로율 <CountUp value={t.team.sync} />%
            </span>
          )}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {t.options.map((o, i) => {
            const mine = t.my === String(i);
            const count = teamCounts[i] ?? 0;
            const top = t.team && t.team.topIndex === i;
            return (
              <button
                key={o}
                type="button"
                disabled={t.my !== null || answer.isPending}
                onClick={() => answer.mutate({ kind: 'TELEPATHY', value: String(i) })}
                className={cn(
                  'relative overflow-hidden rounded-2xl px-4 py-3 text-left font-bold ring-1 transition-all duration-300',
                  mine ? 'bg-fuchsia-600 text-white ring-fuchsia-600 shadow-lg' : 'bg-white ring-slate-200',
                  t.my === null && 'hover:-translate-y-0.5 hover:shadow-md active:scale-95',
                  top && t.my !== null && !mine && 'ring-2 ring-amber-300',
                )}
              >
                {t.my !== null && t.team && (
                  <span className="absolute inset-y-0 left-0 bg-fuchsia-100/70 transition-all duration-700" style={{ width: `${(count / teamMax) * 100}%` }} />
                )}
                <span className="relative flex items-center justify-between">
                  {o}
                  {t.my !== null && t.team && (
                    <span className="text-xs font-black tabular-nums">
                      {count}명 {top && '👑'}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-center text-xs text-slate-400">
          {t.team
            ? `${t.team.name} 팀 ${t.team.answered}/${t.team.size}명 답함${t.my === null ? ' · 답하면 팀 결과가 보여요' : ''}`
            : '팀에 들어가면 팀원과 싱크로율을 겨룰 수 있어요'}
        </p>
      </Card>

      {/* 밸런스 게임 */}
      <Card className="space-y-4">
        <h2 className="font-black">⚖️ {b.question}</h2>
        <div className="grid grid-cols-2 gap-3">
          {(['A', 'B'] as const).map((side) => {
            const label = side === 'A' ? b.a : b.b;
            const mine = b.my === side;
            return (
              <button
                key={side}
                type="button"
                disabled={b.my !== null || answer.isPending}
                onClick={() => answer.mutate({ kind: 'BALANCE', value: side })}
                className={cn(
                  'flex min-h-28 flex-col items-center justify-center gap-1 rounded-3xl p-4 text-center font-black shadow-md transition-all',
                  side === 'A' ? 'bg-gradient-to-br from-sky-400 to-blue-600 text-white' : 'bg-gradient-to-br from-rose-400 to-orange-500 text-white',
                  mine && 'ring-4 ring-white scale-[1.03]',
                  b.my === null && 'hover:-translate-y-0.5 active:scale-95',
                  b.my !== null && !mine && 'opacity-70',
                )}
              >
                <span className="text-xs font-bold opacity-80">{side}</span>
                <span className="text-base">{label}</span>
              </button>
            );
          })}
        </div>
        {b.my !== null && (
          <div className="space-y-2">
            <div className="flex h-10 overflow-hidden rounded-2xl text-sm font-black">
              <div className="wp-bar flex items-center justify-center bg-sky-500 text-white transition-all duration-1000" style={{ width: `${b.total ? (b.countA / b.total) * 100 : 50}%` }}>
                {b.total ? Math.round((b.countA / b.total) * 100) : 0}%
              </div>
              <div className="wp-bar flex flex-1 items-center justify-center bg-rose-500 text-white" style={{ animationDelay: '200ms' }}>
                {b.total ? Math.round((b.countB / b.total) * 100) : 0}%
              </div>
            </div>
            <p className="text-center text-xs text-slate-500">
              {b.total}명이 참여 · {minority === b.my ? '나는 소수파예요 🦄' : '나는 다수파예요'}
            </p>
          </div>
        )}
      </Card>

      {bonus && (
        <Card className="wp-pop-in bg-gradient-to-r from-amber-100 to-pink-100 text-center">
          <p className="text-xl font-black">🎉 팀과 같은 답! 보너스 +{data.bonus}P</p>
          <Button variant="ghost" onClick={() => setBonus(false)}>
            닫기
          </Button>
        </Card>
      )}
    </div>
  );
}
