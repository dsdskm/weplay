'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { AI_COST_LABEL, AI_LEVEL_LABEL, GAME_KINDS, gameByKey, GAMES, SOCIAL_GAMES } from '@weplay/shared';
import { Avatar, Card, cn } from '@/components/ui';
import { GameChips, LeaderboardView, MethodChips, TeamBoardView } from '@/components/games/boards';
import { CountUp, medal } from '@/components/games/fx';
import { TurnGameList } from '@/components/games/turn-list';
import { Tabs } from '@/components/tabs';
import { api } from '@/lib/api';
import type { GamesOverview } from '@/lib/games';
import { useGroupId } from '@/lib/hooks';

const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
type Tab = 'solo' | 'coop' | 'teams' | 'turn' | 'rank';

/** 게임 홈: 개인전 · 협동전 · 팀 대결 · 턴제 · 랭킹 */
export default function GamesPage() {
  const groupId = useGroupId();
  const [tab, setTab] = useState<Tab>('solo');
  const [game, setGame] = useState('ALL');
  const [method, setMethod] = useState<string>();
  const [week, setWeek] = useState<'this' | 'last' | 'month'>('this');
  const [scope, setScope] = useState<'team' | 'group'>('team');

  const { data } = useQuery({ queryKey: ['group', groupId, 'games', 'overview'], queryFn: () => api<GamesOverview>(`/groups/${groupId}/games`) });

  if (!data) return <p className="text-slate-400">불러오는 중…</p>;
  if (!data.enabled) return <Card>이 기능은 아직 그룹에서 사용할 수 없어요.</Card>;
  const daily = data.dailyGame ? gameByKey(data.dailyGame) : undefined;
  const weekly = data.weeklyGame ? gameByKey(data.weeklyGame) : undefined;
  const team = data.teamToday;
  const mineOf = (key: string) => data.games.find((g) => g.key === key);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* 히어로 */}
      <div className="wp-gradient relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-amber-400 p-6 text-white shadow-xl">
        <span className="wp-spin-slow pointer-events-none absolute -right-10 -top-10 text-[9rem] opacity-20">🎮</span>
        <span className="wp-float pointer-events-none absolute bottom-2 right-24 text-5xl opacity-30">🏆</span>
        <p className="text-sm font-semibold opacity-80">
          이번 주 {md(data.week.from)} ~ {md(data.week.to)}
        </p>
        <div className="mt-1 flex flex-wrap items-end gap-x-4 gap-y-1">
          <h1 className="text-3xl font-black">게임</h1>
          <span className={cn('rounded-2xl bg-white/20 px-3 py-1 text-sm font-black backdrop-blur', data.balance < 0 && 'bg-rose-600/60')}>
            💰 <CountUp value={data.balance} /> P
          </span>
        </div>
        <p className="mt-1 text-xs opacity-80">
          한 판 참가비 {data.economy.playFee}P · 점수에 따라 최대 {data.economy.maxPlayReward}P · 챌린지 보너스 +{data.economy.challengeReward}P
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm font-bold">
          <span className={cn('rounded-full bg-white/20 px-3 py-1 backdrop-blur', data.streak > 0 && 'wp-glow')}>
            🔥 {data.streak}일 연속 {data.playedToday ? '' : '(오늘 아직!)'}
          </span>
          {data.myTeam && <span className="rounded-full bg-white/20 px-3 py-1 backdrop-blur">👥 {data.myTeam.name}</span>}
          {data.lastWeek.champion && <span className="rounded-full bg-white/20 px-3 py-1 backdrop-blur">👑 지난주 챔피언 {data.lastWeek.champion.user.name}</span>}
          {data.lastWeek.team && <span className="rounded-full bg-white/20 px-3 py-1 backdrop-blur">🏆 지난주 1위 팀 {data.lastWeek.team.team.name}</span>}
        </div>
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          ['solo', '🎯 개인전'],
          ['coop', '🤝 협동전'],
          ['teams', '⚔️ 팀 대결'],
          ['turn', '🔁 턴제'],
          ['rank', '🏅 랭킹'],
        ]}
      />

      {tab === 'solo' && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { def: daily, label: '오늘의 챌린지', mine: daily && mineOf(daily.key) },
              { def: weekly, label: '주간 챌린지', mine: weekly && mineOf(weekly.key) },
            ]
              .filter((c) => c.def)
              .map((c, i) => (
                <Link key={c.label} href={`/g/${groupId}/games/${c.def!.key}`} className="wp-pop-in block" style={{ animationDelay: `${i * 80}ms` }}>
                  <div className={`wp-shine wp-gradient h-full rounded-3xl bg-gradient-to-br ${c.def!.gradient} p-5 text-white shadow-lg transition hover:-translate-y-1 hover:shadow-xl`}>
                    <p className="text-xs font-bold uppercase tracking-widest opacity-80">
                      {c.label} · +{data.economy.challengeReward}P
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      <span className="wp-float text-5xl">{c.def!.icon}</span>
                      <div>
                        <p className="text-xl font-black">{c.def!.name}</p>
                        <p className="text-sm opacity-90">{c.def!.tagline}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm font-semibold">{c.mine?.weekBest != null ? `이번 주 최고 ${c.mine.weekBest.toFixed(1)}점 · 기록 갱신 도전 →` : '아직 안 했어요 · 지금 한 판 →'}</p>
                  </div>
                </Link>
              ))}
          </div>

          {team && (
            <Card className="wp-pop-in space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-bold">오늘 우리 팀 참여</p>
                <span className="text-2xl font-black tabular-nums">
                  {team.played}
                  <span className="text-base text-slate-400">/{team.total}</span>
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div className="wp-bar h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500" style={{ width: `${team.total ? (team.played / team.total) * 100 : 0}%` }} />
              </div>
              {team.notYet.length > 0 ? (
                <div>
                  <p className="mb-1.5 text-xs text-slate-500">오늘 아직 안 한 사람 👀</p>
                  <div className="flex flex-wrap gap-1.5">
                    {team.notYet.map((u, i) => (
                      <span key={u.id} style={{ animationDelay: `${i * 40}ms` }} className="wp-pop-in flex items-center gap-1 rounded-full bg-slate-50 py-0.5 pl-0.5 pr-2 text-xs ring-1 ring-slate-100">
                        <Avatar name={u.name} url={u.avatarUrl} size={20} /> {u.name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm font-semibold text-emerald-600">🎉 오늘 모두 참여했어요!</p>
              )}
            </Card>
          )}

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-500">👀 동료 게임 · 점수 없이 함께</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {SOCIAL_GAMES.map((g, i) => (
                <Link key={g.key} href={`/g/${groupId}/games/${g.path}`} style={{ animationDelay: `${i * 50}ms` }} className="wp-pop-in group block">
                  <div className={`relative h-full overflow-hidden rounded-3xl bg-gradient-to-br ${g.gradient} p-4 text-white shadow-md transition duration-300 group-hover:-translate-y-1.5 group-hover:shadow-xl`}>
                    <span className="block text-4xl transition duration-300 group-hover:scale-125">{g.icon}</span>
                    <p className="mt-2 font-black leading-tight">{g.name}</p>
                    <p className="mt-1 line-clamp-2 text-[11px] opacity-80">{g.tagline}</p>
                    <span className="mt-2 inline-block rounded-full bg-black/25 px-2 py-0.5 text-[10px] font-bold">
                      {AI_LEVEL_LABEL[g.ai]}
                      {g.cost !== 'NONE' && ` · ${AI_COST_LABEL[g.cost]}`}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {GAME_KINDS.map((k) => {
            const list = GAMES.filter((g) => g.kind === k.key);
            return (
              <section key={k.key} className="space-y-2">
                <h2 className="text-sm font-bold text-slate-500">
                  {k.icon} {k.name}
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {list.map((g, i) => {
                    const mine = mineOf(g.key);
                    const left = data.dailyLimit - (mine?.playsToday ?? 0);
                    return (
                      <Link key={g.key} href={`/g/${groupId}/games/${g.key}`} style={{ animationDelay: `${i * 60}ms` }} className="wp-pop-in group block">
                        <div className={`relative h-full overflow-hidden rounded-3xl bg-gradient-to-br ${g.gradient} p-4 text-white shadow-md transition duration-300 group-hover:-translate-y-1.5 group-hover:rotate-[-1deg] group-hover:shadow-xl`}>
                          <span className="block text-4xl transition duration-300 group-hover:rotate-12 group-hover:scale-125">{g.icon}</span>
                          <p className="mt-2 font-black leading-tight">{g.name}</p>
                          <p className="text-[11px] opacity-80">{g.duration}</p>
                          <div className="mt-3 space-y-0.5 text-xs">
                            <p>
                              이번 주 <b className="tabular-nums">{mine?.weekBest != null ? mine.weekBest.toFixed(1) : '-'}</b>
                            </p>
                            {mine?.team?.rank && (
                              <p>
                                팀 {medal(mine.team.rank) ?? `${mine.team.rank}위`} / {mine.team.total}명
                              </p>
                            )}
                          </div>
                          <span className={cn('absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-bold', left > 0 ? 'bg-white/25' : 'bg-black/25')}>{left > 0 ? `${left}판` : '내일 또!'}</span>
                          {(g.key === data.dailyGame || g.key === data.weeklyGame) && <span className="absolute bottom-3 right-3 rounded-full bg-amber-300 px-2 py-0.5 text-[10px] font-black text-amber-900">챌린지</span>}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {tab === 'coop' && (
        <div className="grid gap-4 md:grid-cols-2">
          <Link href={`/g/${groupId}/games/boss`} className="wp-pop-in group block">
            <div className="relative h-full overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-purple-900 to-rose-800 p-6 text-white shadow-xl transition group-hover:-translate-y-1">
              <span className="wp-float absolute -right-2 top-2 text-8xl drop-shadow-2xl">{data.boss?.icon ?? '🐉'}</span>
              <p className="text-xs font-bold uppercase tracking-widest text-rose-300">팀 보스 레이드</p>
              <p className="mt-1 text-2xl font-black">{data.boss?.name ?? '이번 주 보스'}</p>
              <p className="text-sm italic opacity-70">“{data.boss?.line ?? '도전자를 기다린다…'}”</p>
              {data.boss && (
                <div className="mt-5 max-w-[70%]">
                  <div className="mb-1 flex justify-between text-xs font-bold">
                    <span>HP</span>
                    <span>{Math.max(0, 100 - data.boss.percent).toFixed(1)}%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-white/15">
                    <div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-400 transition-all duration-1000" style={{ width: `${Math.max(0, 100 - data.boss.percent)}%` }} />
                  </div>
                </div>
              )}
              <p className="mt-4 text-sm font-semibold">개인전을 할수록 보스에게 피해가 들어가요 →</p>
            </div>
          </Link>
          <Link href={`/g/${groupId}/games/bingo`} className="wp-pop-in group block" style={{ animationDelay: '80ms' }}>
            <div className="relative h-full overflow-hidden rounded-3xl bg-gradient-to-br from-pink-400 via-rose-400 to-orange-300 p-6 text-white shadow-xl transition group-hover:-translate-y-1">
              <div className="absolute right-4 top-4 grid grid-cols-3 gap-1 opacity-60">
                {[...Array(9)].map((_, i) => (
                  <span key={i} className={cn('h-6 w-6 rounded-md', i % 2 === 0 ? 'bg-white' : 'bg-white/40')} />
                ))}
              </div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-80">팀 협동</p>
              <p className="mt-1 text-2xl font-black">📸 사진 빙고</p>
              <p className="mt-1 max-w-[65%] text-sm opacity-90">빨간 물건, 둥근 물건… 팀원이 한 칸씩 사진으로 채워 빙고를 만들어요.</p>
              <p className="mt-4 text-sm font-semibold">이번 주 빙고판 보기 →</p>
            </div>
          </Link>
          <Link href={`/g/${groupId}/games/puzzle`} className="wp-pop-in group block" style={{ animationDelay: '160ms' }}>
            <div className="relative h-full overflow-hidden rounded-3xl bg-gradient-to-br from-sky-500 to-indigo-700 p-6 text-white shadow-xl transition group-hover:-translate-y-1">
              <span className="wp-float absolute right-4 top-4 text-6xl">🧩</span>
              <p className="text-xs font-bold uppercase tracking-widest opacity-80">팀 협동</p>
              <p className="mt-1 text-2xl font-black">팀 퍼즐</p>
              <p className="mt-1 max-w-[70%] text-sm opacity-90">팀원이 하루에 한 번 게임을 할 때마다 퍼즐 조각이 열려요. 이번 주 그림을 완성해 봐요.</p>
            </div>
          </Link>
          <Link href={`/g/${groupId}/games/telepathy`} className="wp-pop-in group block" style={{ animationDelay: '240ms' }}>
            <div className="relative h-full overflow-hidden rounded-3xl bg-gradient-to-br from-fuchsia-500 to-violet-700 p-6 text-white shadow-xl transition group-hover:-translate-y-1">
              <span className="wp-float absolute right-4 top-4 text-6xl">🔮</span>
              <p className="text-xs font-bold uppercase tracking-widest opacity-80">팀 협동 · 매일</p>
              <p className="mt-1 text-2xl font-black">팀 텔레파시 · 밸런스 게임</p>
              <p className="mt-1 max-w-[70%] text-sm opacity-90">같은 답을 고른 팀원이 많을수록 팀 싱크로율이 올라가요.</p>
            </div>
          </Link>
        </div>
      )}

      {tab === 'teams' && (
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Tabs
              value={week}
              onChange={setWeek}
              items={[
                ['this', '이번 주'],
                ['last', '지난주'],
                ['month', '이번 달 시즌'],
              ]}
            />
          </div>
          <MethodChips value={method ?? ''} onChange={setMethod} />
          <GameChips value={game} onChange={setGame} />
          <TeamBoardView key={`${game}-${method}-${week}`} groupId={groupId} game={game} week={week} method={method} />
        </Card>
      )}

      {tab === 'turn' && <TurnGameList groupId={groupId} />}

      {tab === 'rank' && (
        <Card className="space-y-4">
          <Tabs
            value={week}
            onChange={setWeek}
            items={[
              ['this', '이번 주'],
              ['last', '지난주'],
              ['month', '이번 달 시즌'],
            ]}
          />
          <GameChips value={game} onChange={setGame} />
          <div className="flex gap-1 rounded-full bg-slate-100 p-1 text-sm font-semibold">
            {([
              ['team', '우리 팀'],
              ['group', '그룹 전체'],
            ] as const).map(([k, label]) => (
              <button key={k} type="button" onClick={() => setScope(k)} className={cn('flex-1 rounded-full py-1.5 transition-all', scope === k ? 'bg-white shadow' : 'text-slate-500')}>
                {label}
              </button>
            ))}
          </div>
          <LeaderboardView key={`${game}-${scope}-${week}`} groupId={groupId} game={game} scope={scope} week={week} />
        </Card>
      )}
    </div>
  );
}
