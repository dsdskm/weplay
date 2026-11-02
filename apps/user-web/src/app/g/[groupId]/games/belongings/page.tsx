'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { Avatar, Badge, Button, Card, cn, ErrorText, Input } from '@/components/ui';
import { useDialog } from '@/components/confirm-dialog';
import { Confetti } from '@/components/games/fx';
import { MediaView } from '@/components/media-view';
import { api, errorMessage, uploadFile } from '@/lib/api';
import type { BelongingRound, GUser } from '@/lib/games';
import { useGroupId } from '@/lib/hooks';

/** 이 물건의 주인은 누구? 내 물건 사진을 올리고, 동료 물건 사진을 보고 주인을 맞힘 */
export default function BelongingsPage() {
  const groupId = useGroupId();
  const qc = useQueryClient();
  const { confirm } = useDialog();
  const fileRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<{ user: string; correct: boolean; owner: GUser | null }>();
  const [hits, setHits] = useState(0);
  const { data, refetch, isFetching } = useQuery({
    queryKey: ['group', groupId, 'games', 'belongings'],
    queryFn: () => api<BelongingRound>(`/groups/${groupId}/games/belongings`),
    staleTime: 0,
    gcTime: 0,
  });

  const put = useMutation({
    mutationFn: (mediaUrl: string) => api(`/groups/${groupId}/games/belongings`, { body: { mediaUrl, caption: caption.trim() || undefined } }),
    onSuccess: () => {
      setCaption('');
      setError(undefined);
      refetch();
    },
    onError: (e) => setError(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: () => api(`/groups/${groupId}/games/belongings`, { method: 'DELETE' }),
    onSuccess: () => refetch(),
    onError: (e) => setError(errorMessage(e)),
  });
  const guess = useMutation({
    mutationFn: ({ photoId, userId }: { photoId: string; userId: string }) => api<{ correct: boolean; owner: GUser | null }>(`/groups/${groupId}/games/belongings/guess`, { body: { photoId, userId } }),
    onSuccess: (r, v) => {
      setPicked({ user: v.userId, correct: r.correct, owner: r.owner });
      if (r.correct) {
        setHits((h) => h + 1);
        qc.invalidateQueries({ queryKey: ['group', groupId, 'points'] });
      }
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const onFile = async (file: File) => {
    setUploading(true);
    try {
      const up = await uploadFile(groupId, file);
      put.mutate(up.url);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setUploading(false);
    }
  };

  if (!data) return <p className="text-slate-400">불러오는 중…</p>;
  if (!data.enabled) return <Card>이 기능은 아직 그룹에서 사용할 수 없어요.</Card>;
  const item = data.items[index];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {picked?.correct && <Confetti count={60} />}
      <Link href={`/g/${groupId}/games`} className="text-sm text-slate-500">
        ← 게임
      </Link>
      <div className="wp-gradient rounded-3xl bg-gradient-to-br from-purple-500 via-indigo-500 to-slate-800 p-6 text-white shadow-xl">
        <p className="text-xs font-bold uppercase tracking-widest opacity-80">사진 · 추리</p>
        <h1 className="text-3xl font-black">이 물건의 주인은 누구?</h1>
        <p className="mt-1 text-sm opacity-90">맞힐 때마다 +{data.reward}P · 이번에 맞힌 수 {hits}</p>
      </div>
      <ErrorText>{error}</ErrorText>

      {/* 내 물건 사진 */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">📷 내 물건 사진</h2>
          {data.mine && <Badge tone="green">올림</Badge>}
        </div>
        {data.mine ? (
          <div className="flex items-center gap-3">
            <MediaView url={data.mine.mediaUrl} type="IMAGE" className="h-24 w-24 rounded-2xl object-cover" />
            <div className="min-w-0 flex-1 text-sm text-slate-500">{data.mine.caption ?? '설명 없음'}</div>
            <Button
              variant="ghost"
              className="text-rose-600"
              onClick={async () => {
                if (await confirm({ message: '내 물건 사진을 지울까요?', danger: true })) remove.mutate();
              }}
            >
              지우기
            </Button>
          </div>
        ) : (
          <p className="text-sm text-slate-500">책상, 키보드, 텀블러처럼 나를 떠올리게 하는 물건을 찍어 주세요. 주인은 아무도 모르게 가려져요.</p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input placeholder="한 줄 힌트 (선택)" value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={100} />
          <Button disabled={uploading || put.isPending} onClick={() => fileRef.current?.click()}>
            {uploading || put.isPending ? '올리는 중…' : data.mine ? '사진 바꾸기' : '사진 올리기'}
          </Button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </div>
      </Card>

      {/* 추리 */}
      {!data.available || !item ? (
        <Card className="space-y-2 text-center">
          <p className="text-5xl">🕵️</p>
          <p className="font-bold">아직 문제를 만들 수 없어요</p>
          <p className="text-sm text-slate-500">동료 5명 이상이 물건 사진을 올리면 시작돼요.</p>
          <Button variant="secondary" disabled={isFetching} onClick={() => refetch()}>
            다시 확인
          </Button>
        </Card>
      ) : (
        <Card className="wp-pop-in space-y-4" key={item.id}>
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>
              문제 {index + 1}/{data.items.length}
            </span>
            {item.caption && <span className="rounded-full bg-slate-100 px-3 py-1">힌트: {item.caption}</span>}
          </div>
          <MediaView url={item.mediaUrl} type="IMAGE" className="max-h-80 w-full rounded-2xl object-contain" />
          <p className="text-center font-black">이 물건의 주인은?</p>
          <div className="grid grid-cols-2 gap-2">
            {item.choices.map((c) => {
              const isPicked = picked?.user === c.id;
              const isAnswer = picked && picked.owner?.id === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={!!picked || guess.isPending}
                  onClick={() => guess.mutate({ photoId: item.id, userId: c.id })}
                  className={cn(
                    'flex items-center gap-2 rounded-2xl px-3 py-3 text-left text-sm font-bold ring-1 transition active:scale-95',
                    !picked && 'bg-white ring-slate-200 hover:-translate-y-0.5 hover:shadow',
                    isAnswer && 'bg-emerald-500 text-white ring-emerald-500',
                    isPicked && !isAnswer && 'wp-shake bg-rose-500 text-white ring-rose-500',
                    picked && !isPicked && !isAnswer && 'opacity-50 ring-slate-200',
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
              <p className={cn('text-xl font-black', picked.correct ? 'text-emerald-600' : 'text-rose-500')}>
                {picked.correct ? `정답! +${data.reward}P 🎉` : `아쉬워요! 주인은 ${picked.owner?.name}님이에요`}
              </p>
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
