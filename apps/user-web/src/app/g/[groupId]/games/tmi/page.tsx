'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { Avatar, Button, Card, cn, ErrorText, Input } from '@/components/ui';
import { useDialog } from '@/components/confirm-dialog';
import { Confetti } from '@/components/games/fx';
import { api, errorMessage } from '@/lib/api';
import type { GUser, TmiRound } from '@/lib/games';
import { useGroupId } from '@/lib/hooks';

/** TMI 퀴즈: 내 TMI를 남기고, 동료들의 TMI가 누구 것인지 맞힘 */
export default function TmiPage() {
  const groupId = useGroupId();
  const qc = useQueryClient();
  const { confirm } = useDialog();
  const [text, setText] = useState('');
  const [error, setError] = useState<string>();
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<{ user: string; correct: boolean; owner: GUser | null }>();
  const [hits, setHits] = useState(0);
  const { data, refetch } = useQuery({ queryKey: ['group', groupId, 'games', 'tmi'], queryFn: () => api<TmiRound>(`/groups/${groupId}/games/tmi`), staleTime: 0, gcTime: 0 });

  const add = useMutation({
    mutationFn: () => api(`/groups/${groupId}/games/tmi`, { body: { text: text.trim() } }),
    onSuccess: () => {
      setText('');
      setError(undefined);
      refetch();
    },
    onError: (e) => setError(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/groups/${groupId}/games/tmi/${id}`, { method: 'DELETE' }),
    onSuccess: () => refetch(),
    onError: (e) => setError(errorMessage(e)),
  });
  const guess = useMutation({
    mutationFn: ({ factId, userId }: { factId: string; userId: string }) => api<{ correct: boolean; owner: GUser | null }>(`/groups/${groupId}/games/tmi/guess`, { body: { factId, userId } }),
    onSuccess: (r, v) => {
      setPicked({ user: v.userId, correct: r.correct, owner: r.owner });
      if (r.correct) {
        setHits((h) => h + 1);
        qc.invalidateQueries({ queryKey: ['group', groupId, 'points'] });
      }
    },
    onError: (e) => setError(errorMessage(e)),
  });

  if (!data) return <p className="text-slate-400">불러오는 중…</p>;
  const item = data.items[index];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {picked?.correct && <Confetti count={50} />}
      <Link href={`/g/${groupId}/games`} className="text-sm text-slate-500">
        ← 게임
      </Link>
      <div className="wp-gradient rounded-3xl bg-gradient-to-br from-pink-500 via-rose-500 to-orange-400 p-6 text-white shadow-xl">
        <p className="text-xs font-bold uppercase tracking-widest opacity-80">TMI 퀴즈</p>
        <h1 className="text-3xl font-black">이건 누구의 TMI?</h1>
        <p className="mt-1 text-sm opacity-90">맞힐 때마다 +{data.reward}P · 이번에 맞힌 수 {hits}</p>
      </div>
      <ErrorText>{error}</ErrorText>

      <Card className="space-y-3">
        <h2 className="font-bold">✍️ 내 TMI (최대 5개)</h2>
        <p className="text-sm text-slate-500">나만 아는 사실을 한 줄로. 누가 썼는지는 가려져요.</p>
        <div className="flex gap-2">
          <Input placeholder="예: 커피는 하루 두 잔만 마셔요" value={text} onChange={(e) => setText(e.target.value)} maxLength={120} />
          <Button disabled={text.trim().length < 2 || add.isPending} onClick={() => add.mutate()}>
            추가
          </Button>
        </div>
        <ul className="space-y-2">
          {data.mine.map((f) => (
            <li key={f.id} className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate">{f.text}</span>
              <button
                type="button"
                className="text-xs text-rose-600"
                onClick={async () => {
                  if (await confirm({ message: '이 TMI를 지울까요?', danger: true })) remove.mutate(f.id);
                }}
              >
                지우기
              </button>
            </li>
          ))}
          {data.mine.length === 0 && <li className="text-sm text-slate-400">아직 없어요</li>}
        </ul>
      </Card>

      {!data.available || !item ? (
        <Card className="space-y-2 text-center">
          <p className="text-5xl">🫣</p>
          <p className="font-bold">아직 문제가 부족해요</p>
          <p className="text-sm text-slate-500">동료 5명 이상이 TMI를 남기면 시작돼요.</p>
        </Card>
      ) : (
        <Card className="wp-pop-in space-y-4" key={item.id}>
          <div className="flex justify-between text-sm text-slate-500">
            <span>
              문제 {index + 1}/{data.items.length}
            </span>
          </div>
          <p className="rounded-3xl bg-gradient-to-br from-pink-50 to-orange-50 px-5 py-6 text-center text-lg font-black leading-snug">“{item.text}”</p>
          <div className="grid grid-cols-2 gap-2">
            {item.choices.map((c) => {
              const isAnswer = picked && picked.owner?.id === c.id;
              const isPicked = picked?.user === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={!!picked || guess.isPending}
                  onClick={() => guess.mutate({ factId: item.id, userId: c.id })}
                  className={cn(
                    'flex items-center gap-2 rounded-2xl px-3 py-3 text-left text-sm font-bold ring-1 transition active:scale-95',
                    !picked && 'bg-white ring-slate-200 hover:-translate-y-0.5 hover:shadow',
                    isAnswer && 'bg-emerald-500 text-white ring-emerald-500',
                    isPicked && !isAnswer && 'wp-shake bg-rose-500 text-white ring-rose-500',
                    picked && !isPicked && !isAnswer && 'opacity-50',
                  )}
                >
                  <Avatar name={c.name} url={c.avatarUrl} size={28} />
                  <span className="truncate">{c.name}</span>
                </button>
              );
            })}
          </div>
          {picked && (
            <div className="space-y-3 text-center">
              <p className={cn('text-xl font-black', picked.correct ? 'text-emerald-600' : 'text-rose-500')}>{picked.correct ? `정답! +${data.reward}P 🎉` : `땡! 주인은 ${picked.owner?.name}님`}</p>
              <Button
                onClick={() => {
                  setPicked(undefined);
                  if (index + 1 < data.items.length) setIndex(index + 1);
                  else {
                    setIndex(0);
                    refetch();
                  }
                }}
              >
                {index + 1 < data.items.length ? '다음 문제' : '새 문제 받기'}
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
