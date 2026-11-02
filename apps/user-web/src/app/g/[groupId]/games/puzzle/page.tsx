'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Avatar, Card, cn } from '@/components/ui';
import { Confetti, CountUp } from '@/components/games/fx';
import { api } from '@/lib/api';
import type { PuzzleState } from '@/lib/games';
import { useGroupId } from '@/lib/hooks';

/** 팀 퍼즐: 팀원이 게임을 한 판씩 할 때마다 조각이 열리고, 16조각을 모두 열면 팀 보상 */
export default function PuzzlePage() {
  const groupId = useGroupId();
  const { data } = useQuery({ queryKey: ['group', groupId, 'games', 'puzzle'], queryFn: () => api<PuzzleState>(`/groups/${groupId}/games/puzzle`), refetchInterval: 30_000 });

  if (!data) return <p className="text-slate-400">불러오는 중…</p>;
  if (!data.enabled) return <Card>이 기능은 아직 그룹에서 사용할 수 없어요.</Card>;
  if (!data.team) return <Card>팀에 들어가면 팀 퍼즐이 생겨요.</Card>;
  const pct = Math.round((data.pieces / data.total) * 100);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {data.completed && <Confetti count={100} />}
      <Link href={`/g/${groupId}/games`} className="text-sm text-slate-500">
        ← 게임
      </Link>
      <div className="wp-gradient relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-500 via-indigo-500 to-violet-600 p-6 text-white shadow-xl">
        <span className="wp-float pointer-events-none absolute -right-2 -top-2 text-8xl opacity-25">🧩</span>
        <p className="text-xs font-bold uppercase tracking-widest opacity-80">팀 협동 · 이번 주</p>
        <h1 className="text-3xl font-black">{data.theme?.name} 퍼즐</h1>
        <p className="mt-1 text-sm opacity-90">
          {data.team.name} 팀 · 게임 한 판 = 조각 한 장. 모두 열면 팀원 모두 +{data.reward}P
        </p>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/20">
            <div className="wp-bar h-full rounded-full bg-gradient-to-r from-amber-300 to-pink-300 transition-all duration-1000" style={{ width: `${pct}%` }} />
          </div>
          <span className="w-20 text-right font-black tabular-nums">
            <CountUp value={data.pieces} /> / {data.total}
          </span>
        </div>
      </div>

      <Card className="space-y-4">
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {data.tiles.map((t, i) => (
            <div
              key={t.index}
              style={{ animationDelay: `${i * 25}ms` }}
              className={cn(
                'wp-pop-in relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl text-4xl shadow-sm transition-all duration-500 sm:text-5xl',
                t.unlocked ? 'bg-gradient-to-br from-white to-slate-50 ring-1 ring-slate-200' : 'bg-slate-200 ring-1 ring-slate-300',
              )}
            >
              {t.unlocked ? (
                <span className="wp-zoom-out">{t.emoji}</span>
              ) : (
                <>
                  <span className="text-2xl font-black text-slate-400">?</span>
                  <span className="wp-shine absolute inset-0 opacity-40" />
                </>
              )}
            </div>
          ))}
        </div>
        {data.completed ? (
          <p className="wp-pop-in text-center text-lg font-black text-emerald-600">🎉 퍼즐 완성! 팀원 모두 보상을 받았어요</p>
        ) : (
          <p className="text-center text-sm text-slate-500">
            남은 조각 {data.total - data.pieces}장 · 다음 주에는 새 그림이 나와요
          </p>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="font-bold">누가 조각을 열었을까?</h2>
        {data.contributions.map((c, i) => {
          const max = Math.max(1, ...data.contributions.map((x) => x.plays));
          return (
            <div key={c.user?.id ?? i} className="flex items-center gap-3 text-sm">
              <Avatar name={c.user?.name ?? '?'} url={c.user?.avatarUrl} size={28} />
              <span className="w-24 shrink-0 truncate font-semibold">{c.user?.name}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className="wp-bar h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-500" style={{ width: `${(c.plays / max) * 100}%`, animationDelay: `${i * 60}ms` }} />
              </div>
              <span className="w-8 text-right font-black tabular-nums">{c.plays}</span>
            </div>
          );
        })}
        {data.contributions.length === 0 && <p className="text-sm text-slate-400">아직 아무도 게임을 하지 않았어요.</p>}
      </Card>
    </div>
  );
}
