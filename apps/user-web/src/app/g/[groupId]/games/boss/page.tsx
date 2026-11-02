'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { gameByKey } from '@weplay/shared';
import { Avatar, Card, cn } from '@/components/ui';
import { Confetti, CountUp, medal } from '@/components/games/fx';
import { api } from '@/lib/api';
import type { BossState } from '@/lib/games';
import { timeAgo } from '@/lib/format';
import { useGroupId } from '@/lib/hooks';

/** 팀 보스 레이드: 팀원들의 개인전 기록이 그대로 피해가 됨 */
export default function BossPage() {
  const groupId = useGroupId();
  const { data } = useQuery({ queryKey: ['group', groupId, 'games', 'boss'], queryFn: () => api<BossState>(`/groups/${groupId}/games/boss`), refetchInterval: 30_000 });
  const [hit, setHit] = useState(0);
  // 들어오면 최근 공격이 차례로 들어가는 연출
  useEffect(() => {
    if (!data?.mine) return;
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      setHit(n);
      if (n >= Math.min(6, data.mine!.recent.length)) clearInterval(id);
    }, 450);
    return () => clearInterval(id);
  }, [data?.mine]);

  if (!data) return <p className="text-slate-400">불러오는 중…</p>;
  const m = data.mine;
  const hpLeft = m ? Math.max(0, 100 - m.percent) : 100;
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link href={`/g/${groupId}/games`} className="text-sm text-slate-500">
        ← 게임
      </Link>
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-950 via-purple-950 to-rose-900 p-6 text-white shadow-2xl">
        {m?.defeated && <Confetti count={90} />}
        {[...Array(24)].map((_, i) => (
          <span key={i} className="absolute h-1 w-1 rounded-full bg-white/50" style={{ left: `${(i * 41) % 100}%`, top: `${(i * 67) % 100}%`, opacity: 0.2 + ((i * 13) % 8) / 10 }} />
        ))}
        <p className="relative text-xs font-bold uppercase tracking-[0.3em] text-rose-300">Weekly Boss Raid</p>
        <h1 className="relative text-3xl font-black">{data.boss.name}</h1>
        <p className="relative text-sm italic text-white/60">“{data.boss.line}”</p>

        <div className="relative my-6 flex justify-center">
          <span className="absolute inset-0 m-auto h-48 w-48 rounded-full bg-rose-500/30 blur-3xl" />
          <span key={hit} className={cn('relative select-none text-[9rem] leading-none drop-shadow-2xl', m?.defeated ? 'rotate-12 opacity-40 grayscale' : hit > 0 ? 'wp-shake' : 'wp-float')}>
            {data.boss.icon}
          </span>
          {m && !m.defeated && hit > 0 && m.recent[hit - 1] && (
            <span key={`d${hit}`} className="wp-dmg absolute left-1/2 top-4 text-3xl font-black text-amber-300 drop-shadow">
              -{m.recent[hit - 1].damage}
            </span>
          )}
          {m?.defeated && <span className="wp-zoom-out absolute inset-x-0 top-1/3 text-center text-5xl font-black text-amber-300 drop-shadow-lg">처치 완료! 🏆</span>}
        </div>

        {m ? (
          <div className="relative space-y-2">
            <div className="flex justify-between text-sm font-bold">
              <span>{m.team.name} 팀 보스 HP</span>
              <span className="tabular-nums">
                <CountUp value={Math.max(0, m.hp - m.damage)} /> / {m.hp.toLocaleString()}
              </span>
            </div>
            <div className="h-5 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/20">
              <div className="h-full rounded-full bg-gradient-to-r from-rose-600 via-red-500 to-amber-400 transition-all duration-[1500ms] ease-out" style={{ width: `${hpLeft}%` }} />
            </div>
            <p className="text-xs text-white/70">
              팀원 1명당 체력이 정해져 있어서 팀 크기와 상관없이 공평해요. 사람·게임·날짜마다 최고 점수만큼 피해를 줘요. 처치하면 공격한 팀원 모두 +{data.reward}P
            </p>
          </div>
        ) : (
          <p className="relative text-sm text-white/70">팀에 들어가면 팀원과 함께 보스를 공격할 수 있어요.</p>
        )}
        <Link href={`/g/${groupId}/games`} className="relative mt-5 inline-block rounded-2xl bg-white px-5 py-3 text-sm font-black text-purple-900 shadow-lg transition hover:-translate-y-0.5">
          ⚔️ 개인전으로 공격하기
        </Link>
      </div>

      {m && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="space-y-3">
            <h2 className="font-bold">🗡️ 우리 팀 딜러</h2>
            {m.topAttackers.length === 0 && <p className="text-sm text-slate-400">아직 아무도 공격하지 않았어요.</p>}
            {m.topAttackers.map((a, i) => (
              <div key={a.user.id} className="flex items-center gap-2 text-sm">
                <span className="w-6 text-center">{medal(i + 1) ?? i + 1}</span>
                <Avatar name={a.user.name} url={a.user.avatarUrl} size={26} />
                <span className="flex-1 truncate font-semibold">{a.user.name}</span>
                <span className="font-black tabular-nums text-rose-600">{a.damage.toLocaleString()}</span>
              </div>
            ))}
          </Card>
          <Card className="space-y-2">
            <h2 className="font-bold">📜 최근 공격</h2>
            {m.recent.length === 0 && <p className="text-sm text-slate-400">공격 기록이 없어요.</p>}
            {m.recent.map((r, i) => (
              <p key={r.id} className={cn('flex items-center gap-2 text-xs transition', i < hit ? 'opacity-100' : 'opacity-40')}>
                <Avatar name={r.user?.name ?? '?'} url={r.user?.avatarUrl} size={18} />
                <b>{r.user?.name}</b> {gameByKey(r.game)?.icon} {gameByKey(r.game)?.name}
                <span className="ml-auto font-black text-rose-500">-{r.damage}</span>
                <span className="text-slate-300">{timeAgo(r.at)}</span>
              </p>
            ))}
          </Card>
        </div>
      )}

      <Card className="space-y-3">
        <h2 className="font-bold">⚔️ 팀별 레이드 진행률</h2>
        {data.teams.map((t, i) => (
          <div key={t.team.id} style={{ animationDelay: `${i * 60}ms` }} className={cn('wp-pop-in rounded-2xl p-3 ring-1', t.isMine ? 'bg-rose-50 ring-rose-200' : 'ring-slate-100')}>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-7 text-center font-black text-slate-300">{medal(t.rank) ?? t.rank}</span>
              <span className="flex-1 truncate font-bold">
                {t.team.name} <span className="text-xs font-normal text-slate-400">{t.size}명</span>
              </span>
              {t.defeated ? <span className="font-black text-emerald-600">처치! 🏆</span> : <span className="font-black tabular-nums">{t.percent.toFixed(1)}%</span>}
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="wp-bar h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-400" style={{ width: `${Math.min(100, t.percent)}%`, animationDelay: `${i * 60}ms` }} />
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
