'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { GAMES, TEAM_METHODS } from '@weplay/shared';
import { Avatar, cn, Empty } from '@/components/ui';
import { Pager } from '@/components/pager';
import { api } from '@/lib/api';
import type { Leaderboard, TeamBoard } from '@/lib/games';
import { medal } from './fx';

const pagesOf = (total: number, size: number) => Math.max(1, Math.ceil(total / size));

/** 게임 선택 칩 (ALL = 종합) */
export function GameChips({ value, onChange, withAll = true }: { value: string; onChange: (v: string) => void; withAll?: boolean }) {
  const opts = [...(withAll ? [{ key: 'ALL', icon: '🏆', name: '종합' }] : []), ...GAMES];
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {opts.map((g) => (
        <button
          key={g.key}
          type="button"
          onClick={() => onChange(g.key)}
          className={cn(
            'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all duration-300',
            value === g.key ? 'scale-105 bg-slate-900 text-white shadow-md' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50',
          )}
        >
          {g.icon} {g.name}
        </button>
      ))}
    </div>
  );
}

/** 순위 방식 선택 칩 */
export function MethodChips({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {TEAM_METHODS.map((m) => (
        <button
          key={m.key}
          type="button"
          onClick={() => onChange(m.key)}
          className={cn('shrink-0 rounded-full px-3 py-1 text-xs font-bold transition-all', value === m.key ? 'bg-brand-600 text-white shadow' : 'bg-brand-50 text-brand-700 hover:bg-brand-100')}
        >
          {m.name}
        </button>
      ))}
    </div>
  );
}

/** 팀 대결: 방식별 팀 점수와 실력·참여 막대 */
export function TeamBoardView({ groupId, game, week = 'this', method }: { groupId: string; game: string; week?: 'this' | 'last' | 'month'; method?: string }) {
  const [page, setPage] = useState(1);
  const { data } = useQuery({
    queryKey: ['group', groupId, 'games', 'teams', game, week, method ?? '', page],
    queryFn: () => api<TeamBoard>(`/groups/${groupId}/games/teams?game=${game}&week=${week}&page=${page}&pageSize=10${method ? `&method=${method}` : ''}`),
  });
  if (!data) return <p className="py-8 text-center text-slate-400">불러오는 중…</p>;
  if (data.total === 0) return <Empty>아직 팀이 없어요.</Empty>;
  const def = TEAM_METHODS.find((m) => m.key === data.method);
  const perfW = 100 - data.rule.participationWeight;
  const explain =
    data.method === 'HYBRID'
      ? `팀 점수 = 상위 기록 평균 ${perfW}% + 참여율 ${data.rule.participationWeight}%. 상위 기록은 팀 인원 절반(최대 ${data.rule.topN}명)의 최고점 평균이고, 기록이 모자란 자리는 0점이에요.`
      : data.method === 'GOAL'
        ? `한 사람당 주 ${data.rule.goalDaysPerWeek}일 플레이가 목표예요. 팀 인원 × 목표 일수 중 몇 %를 채웠는지로 겨뤄요.`
        : data.method === 'BOSS'
          ? `팀원 1명당 체력 ${data.rule.bossHpPerMember.toLocaleString()}의 보스에게 준 피해 비율. 사람·게임·날짜마다 최고 점수만큼 피해를 줘요.`
          : def?.description;
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-brand-50 px-4 py-3 text-xs leading-relaxed text-brand-800">
        <p>
          <b>{def?.name}</b> · {explain}
        </p>
        <p className="mt-1 text-brand-600/80">⚠️ 허점: {def?.weakness}</p>
      </div>
      {data.items.map((t, i) => (
        <div
          key={t.team.id}
          style={{ animationDelay: `${i * 70}ms` }}
          className={cn('wp-pop-in rounded-2xl bg-white p-4 shadow-sm ring-1', t.isMine ? 'wp-glow ring-2 ring-brand-500' : 'ring-slate-100')}
        >
          <div className="flex items-center gap-3">
            <span className="w-9 text-center text-2xl font-black text-slate-300">{medal(t.rank) ?? t.rank}</span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 font-bold">
                <span className="truncate">{t.team.name}</span>
                {t.isMine && <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[10px] text-white">우리 팀</span>}
              </p>
              <p className="text-xs text-slate-500">
                {t.size}명 · 참여 {t.participants}명{t.detail && ` · ${t.detail}`}
              </p>
            </div>
            <span className="text-2xl font-black tabular-nums">{t.score.toFixed(1)}</span>
          </div>
          <div className="mt-3 space-y-1.5">
            <Bar label="실력" value={t.performance} className="from-violet-500 to-fuchsia-500" delay={i * 70} />
            <Bar label="참여" value={t.participation} className="from-emerald-400 to-teal-500" delay={i * 70 + 120} />
          </div>
          {t.top.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {t.top.map((m, k) => (
                <span key={m.user.id} className="flex items-center gap-1 rounded-full bg-slate-50 py-0.5 pl-0.5 pr-2 text-xs">
                  <Avatar name={m.user.name} url={m.user.avatarUrl} size={20} />
                  {medal(k + 1)} {m.user.name} <b className="tabular-nums">{m.score.toFixed(1)}</b>
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
      <Pager page={page} pages={pagesOf(data.total, data.pageSize)} setPage={setPage} total={data.total} />
    </div>
  );
}

function Bar({ label, value, className, delay }: { label: string; value: number; className: string; delay: number }) {
  return (
    <div className="flex items-center gap-2 text-[11px] text-slate-500">
      <span className="w-7 shrink-0">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className={`wp-bar h-full rounded-full bg-gradient-to-r ${className}`} style={{ width: `${Math.max(2, value)}%`, animationDelay: `${delay}ms` }} />
      </div>
      <span className="w-10 shrink-0 text-right tabular-nums">{value.toFixed(0)}%</span>
    </div>
  );
}

/** 주간 개인 랭킹 (우리 팀 / 그룹 전체). 1~3위는 단상 */
export function LeaderboardView({ groupId, game, scope, week = 'this' }: { groupId: string; game: string; scope: 'team' | 'group'; week?: 'this' | 'last' | 'month' }) {
  const [page, setPage] = useState(1);
  const { data } = useQuery({
    queryKey: ['group', groupId, 'games', 'board', game, scope, week, page],
    queryFn: () => api<Leaderboard>(`/groups/${groupId}/games/${game}/leaderboard?scope=${scope}&week=${week}&page=${page}&pageSize=10`),
  });
  if (!data) return <p className="py-8 text-center text-slate-400">불러오는 중…</p>;
  if (data.total === 0) return <Empty>아직 기록이 없어요. 첫 기록의 주인공이 되어 보세요!</Empty>;
  const podium = page === 1 ? data.items.slice(0, 3) : [];
  const rest = page === 1 ? data.items.slice(3) : data.items;
  const order = [podium[1], podium[0], podium[2]];
  return (
    <div className="space-y-4">
      {data.me && (
        <div className="wp-pop-in flex items-center justify-between rounded-2xl bg-slate-900 px-4 py-3 text-white">
          <span className="text-sm">
            내 순위 <b className="text-lg">{data.me.rank}위</b> / {data.me.total}명
          </span>
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">상위 {data.me.topPercent}%</span>
        </div>
      )}
      {podium.length > 0 && (
        <div className="grid grid-cols-3 items-end gap-2 pt-4">
          {order.map((r, i) =>
            r ? (
              <div key={r.user.id} className="wp-pop-in flex flex-col items-center gap-1" style={{ animationDelay: `${[150, 0, 300][i]}ms` }}>
                <span className={cn('text-3xl', r.rank === 1 && 'wp-float')}>{medal(r.rank)}</span>
                <Avatar name={r.user.name} url={r.user.avatarUrl} size={r.rank === 1 ? 56 : 44} />
                <p className={cn('max-w-full truncate text-sm font-bold', r.isMe && 'text-brand-600')}>{r.user.name}</p>
                <p className="text-xs tabular-nums text-slate-500">{r.score.toFixed(2)}</p>
                <div
                  className={cn(
                    'wp-gradient w-full rounded-t-2xl bg-gradient-to-b',
                    r.rank === 1 ? 'h-24 from-amber-300 to-amber-500' : r.rank === 2 ? 'h-16 from-slate-200 to-slate-400' : 'h-12 from-orange-200 to-orange-400',
                  )}
                />
              </div>
            ) : (
              <div key={i} />
            ),
          )}
        </div>
      )}
      {rest.length > 0 && (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-100">
          {rest.map((r, i) => (
            <div key={r.user.id} style={{ animationDelay: `${i * 40}ms` }} className={cn('wp-fade flex items-center gap-3 px-4 py-2.5 text-sm', r.isMe && 'bg-brand-50')}>
              <span className="w-7 text-center font-bold text-slate-400">{r.rank}</span>
              <Avatar name={r.user.name} url={r.user.avatarUrl} size={28} />
              <span className="min-w-0 flex-1 truncate font-medium">
                {r.user.name}
                {r.teamName && <span className="ml-1.5 text-xs text-slate-400">{r.teamName}</span>}
              </span>
              <span className="font-bold tabular-nums">{r.score.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
      <Pager page={page} pages={pagesOf(data.total, data.pageSize)} setPage={setPage} total={data.total} />
    </div>
  );
}
