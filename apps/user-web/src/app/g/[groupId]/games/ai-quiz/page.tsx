'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { AI_COST_LABEL, AI_LEVEL_LABEL } from '@weplay/shared';
import { Badge, Button, Card, cn } from '@/components/ui';
import { Confetti, CountUp } from '@/components/games/fx';
import { api, errorMessage } from '@/lib/api';
import type { AiStatus } from '@/lib/games';
import { useGroupId } from '@/lib/hooks';
import { useMutation } from '@tanstack/react-query';

interface Round {
  enabled: boolean;
  available: boolean;
  reason?: string;
  source?: 'AI' | 'BANK';
  roundId?: string;
  items?: { question: string; choices: string[] }[];
}

/** AI 퀴즈: AI 가 만든 사내 상식 5문제. AI 가 없으면 기본 문제 */
export default function AiQuizPage() {
  const groupId = useGroupId();
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<{ choice: number; correct: boolean; answer: number }>();
  const { data: round, refetch, isFetching } = useQuery({ queryKey: ['group', groupId, 'games', 'ai-quiz'], queryFn: () => api<Round>(`/groups/${groupId}/games/ai-quiz/round`), staleTime: 0, gcTime: 0 });
  const { data: status } = useQuery({ queryKey: ['group', groupId, 'games', 'ai', 'status'], queryFn: () => api<AiStatus>(`/groups/${groupId}/games/ai/status`) });
  const check = useMutation({
    mutationFn: (choice: number) => api<{ correct: boolean; answer: number }>(`/groups/${groupId}/games/ai-quiz/check`, { body: { roundId: round!.roundId, index: i, choice } }),
    onSuccess: (r, choice) => {
      setPicked({ choice, correct: r.correct, answer: r.answer });
      if (r.correct) setScore((s) => s + 1);
    },
  });
  const [error, setError] = useState<string>();

  const next = () => {
    setPicked(undefined);
    if (round?.items && i + 1 < round.items.length) setI(i + 1);
    else {
      setI(0);
      setScore(0);
      refetch();
    }
  };
  const item = round?.items?.[i];

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {round?.items && picked?.correct && i + 1 === round.items.length && <Confetti count={40} />}
      <Link href={`/g/${groupId}/games`} className="text-sm text-slate-500">
        ← 게임
      </Link>
      <div className="wp-gradient rounded-3xl bg-gradient-to-br from-teal-500 via-emerald-500 to-green-700 p-6 text-white shadow-xl">
        <div className="flex flex-wrap gap-2">
          <Badge tone="brand">{AI_LEVEL_LABEL.OPTIONAL}</Badge>
          <Badge tone="slate">{AI_COST_LABEL.LOW}</Badge>
        </div>
        <h1 className="mt-2 text-3xl font-black">🤖 AI 퀴즈</h1>
        <p className="mt-1 text-sm opacity-90">
          {round?.source === 'AI' ? 'AI가 오늘 만든 사내 상식 문제예요' : '기본 사내 상식 문제예요 (AI 키가 없으면 기본 문제가 나와요)'}
        </p>
        <p className="mt-3 text-sm font-bold">
          맞힌 수 <CountUp value={score} /> / {round?.items?.length ?? 5}
        </p>
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}

      {!round ? (
        <p className="text-slate-400">문제를 만드는 중…</p>
      ) : !round.available || !item ? (
        <Card className="space-y-2 text-center">
          <p className="text-5xl">🙈</p>
          <p className="font-bold">{round.reason ?? '지금은 문제를 만들 수 없어요'}</p>
          <Button variant="secondary" disabled={isFetching} onClick={() => refetch()}>
            다시 받기
          </Button>
        </Card>
      ) : (
        <Card className="wp-pop-in space-y-4" key={`${round.roundId}-${i}`}>
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>
              문제 {i + 1}/{round.items?.length}
            </span>
            {status && <span>AI 그림 하루 {status.imageDaily}회 (그림 기능과 공유)</span>}
          </div>
          <p className="text-lg font-black leading-snug">{item.question}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {item.choices.map((c, k) => {
              const isAnswer = picked && picked.answer === k;
              const isPicked = picked?.choice === k;
              return (
                <button
                  key={c}
                  type="button"
                  disabled={!!picked || check.isPending}
                  onClick={() => check.mutate(k)}
                  onPointerDown={() => setError(undefined)}
                  className={cn(
                    'rounded-2xl px-4 py-4 text-left font-bold ring-1 transition active:scale-95',
                    !picked && 'bg-white ring-slate-200 hover:-translate-y-0.5 hover:shadow',
                    isAnswer && 'bg-emerald-500 text-white ring-emerald-500',
                    isPicked && !isAnswer && 'wp-shake bg-rose-500 text-white ring-rose-500',
                    picked && !isAnswer && !isPicked && 'opacity-50',
                  )}
                >
                  <span className="mr-2 text-xs opacity-70">{k + 1}</span>
                  {c}
                </button>
              );
            })}
          </div>
          {picked && (
            <div className="flex items-center justify-between">
              <p className={cn('font-black', picked.correct ? 'text-emerald-600' : 'text-rose-500')}>{picked.correct ? '정답! 🎉' : '아쉬워요'}</p>
              <Button onClick={next}>{round.items && i + 1 < round.items.length ? '다음 문제' : '처음부터 다시'}</Button>
            </div>
          )}
          {check.isError && <p className="text-sm text-rose-600">{errorMessage(check.error)}</p>}
        </Card>
      )}
    </div>
  );
}
