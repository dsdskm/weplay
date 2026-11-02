'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { gameByKey } from '@weplay/shared';
import { Button, Card, cn, ErrorText } from '@/components/ui';
import { GAME_COMPONENTS } from '@/components/games';
import { LeaderboardView } from '@/components/games/boards';
import { Confetti, Countdown, medal, ScoreRing } from '@/components/games/fx';
import { api, errorMessage } from '@/lib/api';
import type { GamesOverview, PlayResult } from '@/lib/games';
import { useGroupId } from '@/lib/hooks';

type Phase = 'intro' | 'countdown' | 'play' | 'saving' | 'result';

/** 미니게임 한 판: 소개 → 카운트다운 → 플레이 → 결과(점수 게이지·순위·공유) */
export default function GamePlayPage() {
  const groupId = useGroupId();
  const { game } = useParams<{ game: string }>();
  const def = gameByKey(game);
  const Game = GAME_COMPONENTS[game];
  const qc = useQueryClient();
  const [phase, setPhase] = useState<Phase>('intro');
  const [round, setRound] = useState(0);
  const [result, setResult] = useState<PlayResult>();
  const [error, setError] = useState<string>();
  const [copied, setCopied] = useState(false);
  const [scope, setScope] = useState<'team' | 'group'>('team');

  const { data: overview } = useQuery({ queryKey: ['group', groupId, 'games', 'overview'], queryFn: () => api<GamesOverview>(`/groups/${groupId}/games`) });
  const mine = overview?.games.find((g) => g.key === game);
  const left = overview ? overview.dailyLimit - (mine?.playsToday ?? 0) : 0;

  const save = useMutation({
    mutationFn: (value: number) => api<PlayResult>(`/groups/${groupId}/games/${game}/plays`, { body: { value } }),
    onSuccess: (r) => {
      setResult(r);
      setPhase('result');
      qc.invalidateQueries({ queryKey: ['group', groupId, 'games'] });
      qc.invalidateQueries({ queryKey: ['group', groupId, 'points'] });
    },
    onError: (e) => {
      setError(errorMessage(e));
      setPhase('intro');
    },
  });

  const finish = useCallback(
    (value: number) => {
      setPhase('saving');
      save.mutate(Math.round(value * 100) / 100);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const startCountdown = useCallback(() => setPhase('play'), []);

  if (!def || !Game) return <Card>없는 게임이에요.</Card>;

  const share = async () => {
    if (!result) return;
    const parts = [`${def.icon} ${def.name} ${def.format(result.value)} (${result.score.toFixed(1)}점)`];
    if (result.team?.rank) parts.push(`${result.team.name} ${result.team.rank}위`);
    if (result.group.rank) parts.push(`그룹 ${result.group.rank}위`);
    const text = `${parts.join(' · ')}\n이길 수 있으면 와보세요 🔥 ${location.origin}/g/${groupId}/games/${game}`;
    await navigator.clipboard?.writeText(text).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const celebrate = result && (result.isPersonalBest || result.team?.rank === 1);

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <Link href={`/g/${groupId}/games`} className="text-sm text-slate-500">
        ← 미니게임
      </Link>
      <ErrorText>{error}</ErrorText>

      <div className={`wp-gradient flex items-center gap-4 rounded-3xl bg-gradient-to-br ${def.gradient} p-5 text-white shadow-lg`}>
        <span className="wp-float text-5xl">{def.icon}</span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-black">{def.name}</h1>
          <p className="text-sm opacity-90">{def.tagline}</p>
        </div>
        {mine?.personalBest != null && (
          <div className="text-right text-xs">
            <p className="opacity-80">최고</p>
            <p className="text-xl font-black tabular-nums">{mine.personalBest.toFixed(1)}</p>
          </div>
        )}
      </div>

      <Card className="min-h-80 overflow-hidden">
        {phase === 'intro' && (
          <div className="wp-pop-in flex flex-col items-center gap-5 py-10 text-center">
            <span className="wp-float text-7xl">{def.icon}</span>
            <p className="max-w-xs text-slate-600">{def.tagline}</p>
            <Button className="wp-glow px-10 py-4 text-lg" disabled={!overview || left <= 0} onClick={() => setPhase('countdown')}>
              {left > 0 ? '게임 시작' : '오늘은 끝! 내일 또 만나요'}
            </Button>
            {overview && (
              <p className="text-xs text-slate-400">
                오늘 남은 판 {Math.max(0, left)} / {overview.dailyLimit} · 참가비 {overview.economy.playFee}P (잔액 {overview.balance}P, 0이어도 할 수 있어요)
              </p>
            )}
          </div>
        )}
        {phase === 'countdown' && <Countdown onDone={startCountdown} />}
        {phase === 'play' && <Game key={round} onFinish={finish} />}
        {phase === 'saving' && (
          <div className="flex h-72 flex-col items-center justify-center gap-3">
            <span className="h-12 w-12 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
            <p className="text-sm text-slate-500">기록 계산 중…</p>
          </div>
        )}
        {phase === 'result' && result && (
          <div className="wp-pop-in flex flex-col items-center gap-4 py-4 text-center">
            {celebrate && <Confetti />}
            {result.isPersonalBest && <span className="wp-zoom-out rounded-full bg-amber-100 px-4 py-1 text-sm font-black text-amber-700">🎉 개인 최고 기록!</span>}
            <ScoreRing score={result.score} />
            <p className="text-lg font-bold">{def.format(result.value)}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {result.team?.rank && (
                <span className="wp-pop-in rounded-2xl bg-brand-50 px-4 py-2 text-sm font-bold text-brand-700" style={{ animationDelay: '300ms' }}>
                  {medal(result.team.rank)} 우리 팀 {result.team.rank}위 <span className="font-normal">/ {result.team.total}명</span>
                </span>
              )}
              {result.group.rank && (
                <span className="wp-pop-in rounded-2xl bg-slate-100 px-4 py-2 text-sm font-bold" style={{ animationDelay: '450ms' }}>
                  그룹 {result.group.rank}위 <span className="font-normal">/ {result.group.total}명</span>
                </span>
              )}
            </div>
            {result.points && (
              <div className="flex flex-wrap items-center justify-center gap-2 text-sm font-bold">
                <span className="wp-pop-in rounded-full bg-rose-50 px-3 py-1 text-rose-600" style={{ animationDelay: '600ms' }}>
                  참가비 -{result.points.fee}P
                </span>
                <span className="wp-pop-in rounded-full bg-emerald-50 px-3 py-1 text-emerald-600" style={{ animationDelay: '750ms' }}>
                  보상 +{result.points.reward}P
                </span>
                <span className={cn('wp-pop-in rounded-full px-3 py-1', result.points.balance < 0 ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white')} style={{ animationDelay: '900ms' }}>
                  💰 잔액 {result.points.balance}P
                </span>
              </div>
            )}
            <p className="text-xs text-slate-400">
              이번 주 최고 {result.weekBest.toFixed(2)}점 · 오늘 남은 판 {result.remainingToday}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                disabled={result.remainingToday <= 0}
                onClick={() => {
                  setRound((r) => r + 1);
                  setResult(undefined);
                  setPhase('countdown');
                }}
              >
                한 판 더
              </Button>
              <Button variant="secondary" onClick={share}>
                {copied ? '복사했어요 ✓' : '동료에게 자랑하기'}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">이번 주 랭킹</h2>
          <div className="flex gap-1 rounded-full bg-slate-100 p-1 text-xs font-semibold">
            {([
              ['team', '우리 팀'],
              ['group', '그룹 전체'],
            ] as const).map(([k, label]) => (
              <button key={k} type="button" onClick={() => setScope(k)} className={cn('rounded-full px-3 py-1 transition-all', scope === k ? 'bg-white shadow' : 'text-slate-500')}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <LeaderboardView key={`${scope}-${result?.score ?? 0}-${round}`} groupId={groupId} game={game} scope={scope} />
      </Card>
    </div>
  );
}
