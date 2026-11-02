'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { AI_COST_LABEL, AI_LEVEL_LABEL } from '@weplay/shared';
import { Badge, Button, Card, cn, ErrorText } from '@/components/ui';
import { api, assetUrl, errorMessage, uploadFile } from '@/lib/api';
import type { AiStatus } from '@/lib/games';
import { useGroupId } from '@/lib/hooks';

const STYLES = [
  { key: 'COMIC', name: '만화 일러스트', icon: '💥' },
  { key: 'WATERCOLOR', name: '수채화', icon: '🎨' },
  { key: 'SKETCH', name: '연필 스케치', icon: '✏️' },
] as const;

/** AI 사진 변환: 내 사진을 다른 화풍으로 바꾸고 전후 비교 */
export default function TransformPage() {
  const groupId = useGroupId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState<string>();
  const [style, setStyle] = useState<(typeof STYLES)[number]['key']>('COMIC');
  const [result, setResult] = useState<string>();
  const [split, setSplit] = useState(50);
  const [error, setError] = useState<string>();
  const { data: status } = useQuery({ queryKey: ['group', groupId, 'games', 'ai', 'status'], queryFn: () => api<AiStatus>(`/groups/${groupId}/games/ai/status`) });
  const upload = useMutation({
    mutationFn: (file: File) => uploadFile(groupId, file),
    onSuccess: (r) => {
      setSrc(r.url);
      setResult(undefined);
    },
    onError: (e) => setError(errorMessage(e)),
  });
  const convert = useMutation({
    mutationFn: () => api<{ url: string }>(`/groups/${groupId}/games/transform`, { body: { mediaUrl: src, style } }),
    onSuccess: (r) => {
      setResult(r.url);
      setSplit(50);
      setError(undefined);
    },
    onError: (e) => setError(errorMessage(e)),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href={`/g/${groupId}/games`} className="text-sm text-slate-500">
        ← 게임
      </Link>
      <div className="wp-gradient rounded-3xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 p-6 text-white shadow-xl">
        <div className="flex flex-wrap gap-2">
          <Badge tone="rose">{AI_LEVEL_LABEL.CORE}</Badge>
          <Badge tone="amber">{AI_COST_LABEL.HIGH}</Badge>
        </div>
        <h1 className="mt-2 text-3xl font-black">🪄 AI 사진 변환</h1>
        <p className="mt-1 text-sm opacity-90">내 사진을 다른 화풍으로 바꿔 보세요. {status ? (status.image ? `하루 ${status.imageDaily}회` : '관리자가 AI 그림 기능을 아직 설정하지 않았어요') : ''}</p>
      </div>
      <ErrorText>{error}</ErrorText>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" disabled={upload.isPending} onClick={() => fileRef.current?.click()}>
            {upload.isPending ? '올리는 중…' : src ? '다른 사진' : '사진 고르기'}
          </Button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload.mutate(e.target.files[0])} />
        </div>
        <div className="flex flex-wrap gap-2">
          {STYLES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setStyle(s.key)}
              className={cn('flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold ring-1 transition hover:-translate-y-0.5', style === s.key ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white ring-slate-200')}
            >
              <span>{s.icon}</span>
              {s.name}
            </button>
          ))}
        </div>
        {src && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-500">원본</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={assetUrl(src)} alt="원본" className="aspect-square w-full rounded-2xl object-cover" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-500">결과</p>
              {result ? (
                <div className="relative aspect-square overflow-hidden rounded-2xl shadow-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={assetUrl(result)} alt="변환 결과" className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0 overflow-hidden" style={{ width: `${split}%` }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={assetUrl(src)} alt="" className="h-full w-full object-cover" style={{ width: `${100 / (split / 100)}%`, maxWidth: 'none' }} />
                  </div>
                  <input type="range" min={0} max={100} value={split} onChange={(e) => setSplit(Number(e.target.value))} aria-label="전후 비교" className="absolute inset-x-3 bottom-3 accent-fuchsia-500" />
                </div>
              ) : (
                <div className="flex aspect-square items-center justify-center rounded-2xl bg-slate-100 text-sm text-slate-400">
                  {convert.isPending ? 'AI가 그리는 중… (수십 초 걸려요)' : '변환하면 여기에 나와요'}
                </div>
              )}
            </div>
          </div>
        )}
        {src && (
          <div className="flex justify-end">
            <Button disabled={convert.isPending || !status?.image} onClick={() => convert.mutate()}>
              {convert.isPending ? '변환 중…' : '변환하기'}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
