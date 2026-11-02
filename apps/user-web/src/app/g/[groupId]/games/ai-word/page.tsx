'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { AI_COST_LABEL, AI_LEVEL_LABEL } from '@weplay/shared';
import { Badge, Button, Card, cn, ErrorText } from '@/components/ui';
import { Confetti, CountUp } from '@/components/games/fx';
import { api, assetUrl, errorMessage } from '@/lib/api';
import type { AiStatus } from '@/lib/games';
import { useGroupId } from '@/lib/hooks';

interface Round {
  enabled: boolean;
  available: boolean;
  reason?: string;
  roundId?: string;
  imageUrl?: string;
  choices?: string[];
}

/** AI 제시어 맞히기: AI 가 그린 그림을 보고 단어를 고름 (그림 생성은 비용이 큼) */
export default function AiWordPage() {
  const groupId = useGroupId();
  const [answer, setAnswer] = useState<{ choice: string; correct: boolean; word: string }>();
  const [score, setScore] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const { data: round, refetch, isFetching, error } = useQuery({
    queryKey: ['group', groupId, 'games', 'ai-word'],
    queryFn: () => api<Round>(`/groups/${groupId}/games/ai-word/round`),
    staleTime: 0,
    gcTime: 0,
  });
  const { data: status } = useQuery({ queryKey: ['group', groupId, 'games', 'ai', 'status'], queryFn: () => api<AiStatus>(`/groups/${groupId}/games/ai/status`) });
  const check = useMutation({
    mutationFn: (choice: string) => api<{ correct: boolean; answer: string }>(`/groups/${groupId}/games/ai-word/check`, { body: { roundId: round!.roundId, choice } }),
    onSuccess: (r, choice) => {
      setAnswer({ choice, correct: r.correct, word: r.answer });
      if (r.correct) setScore((s) => s + 1);
    },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {answer?.correct && <Confetti count={60} />}
      <Link href={`/g/${groupId}/games`} className="text-sm text-slate-500">
        ← 게임
      </Link>
      <div className="wp-gradient rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-6 text-white shadow-xl">
        <div className="flex flex-wrap gap-2">
          <Badge tone="rose">{AI_LEVEL_LABEL.CORE}</Badge>
          <Badge tone="amber">{AI_COST_LABEL.HIGH}</Badge>
        </div>
        <h1 className="mt-2 text-3xl font-black">🎨 AI 제시어 맞히기</h1>
        <p className="mt-1 text-sm opacity-90">AI가 그린 그림의 제시어를 맞혀요. 맞히면 보상! 맞힌 수 <CountUp value={score} /></p>
        {status && <p className="mt-2 text-xs opacity-80">{status.image ? `그림 생성 사용 가능 · 하루 ${status.imageDaily}회` : '관리자가 AI 그림 기능을 아직 설정하지 않았어요'}</p>}
      </div>
      <ErrorText>{error ? errorMessage(error) : undefined}</ErrorText>

      {!round ? (
        <p className="py-10 text-center text-slate-400">그림을 그리는 중…</p>
      ) : !round.available ? (
        <Card className="space-y-2 text-center">
          <p className="text-5xl">🖌️</p>
          <p className="font-bold">{round.reason ?? '지금은 그림을 만들 수 없어요'}</p>
          <Button variant="secondary" disabled={isFetching} onClick={() => refetch()}>
            다시 받기
          </Button>
        </Card>
      ) : (
        <Card className="space-y-4" key={round.roundId}>
          <div className="relative aspect-square overflow-hidden rounded-3xl bg-slate-100 shadow-inner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={assetUrl(round.imageUrl ?? '')}
              alt="AI 그림"
              onLoad={() => setRevealed(true)}
              className={cn('h-full w-full object-cover transition-all duration-1000', revealed ? 'blur-0 scale-100' : 'scale-110 blur-xl')}
            />
            {!answer && <span className="absolute right-3 top-3 rounded-full bg-black/50 px-3 py-1 text-xs font-bold text-white">이건 뭘까요?</span>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {round.choices?.map((c) => {
              const isAnswer = answer && answer.word === c;
              const isPicked = answer?.choice === c;
              return (
                <button
                  key={c}
                  type="button"
                  disabled={!!answer || check.isPending}
                  onClick={() => check.mutate(c)}
                  className={cn(
                    'rounded-2xl px-4 py-4 text-lg font-black ring-1 transition active:scale-95',
                    !answer && 'bg-white ring-slate-200 hover:-translate-y-0.5 hover:shadow',
                    isAnswer && 'bg-emerald-500 text-white ring-emerald-500',
                    isPicked && !isAnswer && 'wp-shake bg-rose-500 text-white ring-rose-500',
                    answer && !isAnswer && !isPicked && 'opacity-50',
                  )}
                >
                  {c}
                </button>
              );
            })}
          </div>
          {answer && (
            <div className="flex items-center justify-between">
              <p className={cn('font-black', answer.correct ? 'text-emerald-600' : 'text-rose-500')}>{answer.correct ? '정답! 🎉' : `정답은 “${answer.word}”`}</p>
              <Button onClick={() => {
                setAnswer(undefined);
                setRevealed(false);
                refetch();
              }}>
                다음 그림
              </Button>
            </div>
          )}
          {check.isError && <p className="text-sm text-rose-600">{errorMessage(check.error)}</p>}
        </Card>
      )}
    </div>
  );
}
