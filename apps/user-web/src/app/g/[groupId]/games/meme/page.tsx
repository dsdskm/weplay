'use client';

import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AI_COST_LABEL, AI_LEVEL_LABEL } from '@weplay/shared';
import { Badge, Button, Card, ErrorText, Input } from '@/components/ui';
import { api, assetUrl, errorMessage, uploadFile } from '@/lib/api';
import { useGroupId } from '@/lib/hooks';

/** AI 밈 만들기: 사진을 올리면 AI 가 자막 후보를 제안하고, 캔버스에서 밈을 완성 */
export default function MemePage() {
  const groupId = useGroupId();
  const fileRef = useRef<HTMLInputElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [url, setUrl] = useState<string>();
  const [top, setTop] = useState('');
  const [bottom, setBottom] = useState('');
  const [captions, setCaptions] = useState<string[]>([]);
  const [source, setSource] = useState<'AI' | 'NONE'>('NONE');
  const [error, setError] = useState<string>();

  const upload = useMutation({
    mutationFn: (file: File) => uploadFile(groupId, file),
    onSuccess: (r) => {
      setUrl(r.url);
      setTop('');
      setBottom('');
      captionsOf.mutate(r.url);
    },
    onError: (e) => setError(errorMessage(e)),
  });
  const captionsOf = useMutation({
    mutationFn: (mediaUrl: string) => api<{ source: 'AI' | 'NONE'; captions: string[] }>(`/groups/${groupId}/games/meme/captions`, { body: { mediaUrl } }),
    onSuccess: (r) => {
      setCaptions(r.captions);
      setSource(r.source);
    },
  });

  // 캔버스: 사진을 정사각형에 맞추고, 위·아래 자막을 외곽선 있는 굵은 글씨로
  useEffect(() => {
    const c = canvas.current;
    if (!c || !url) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const s = Math.max(c.width / img.width, c.height / img.height);
      const w = img.width * s;
      const h = img.height * s;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, (c.width - w) / 2, (c.height - h) / 2, w, h);
      drawCaption(ctx, top, c.width, 'top');
      drawCaption(ctx, bottom, c.width, 'bottom');
    };
    img.onerror = () => setError('사진을 불러오지 못했어요 (CORS 설정을 확인해 주세요)');
    img.src = assetUrl(url);
  }, [url, top, bottom]);

  const save = () => {
    canvas.current?.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'meme.png';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }, 'image/png');
  };

  const put = (text: string) => {
    if (!top) setTop(text);
    else if (!bottom) setBottom(text);
    else setBottom(text);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href={`/g/${groupId}/games`} className="text-sm text-slate-500">
        ← 게임
      </Link>
      <div className="wp-gradient rounded-3xl bg-gradient-to-br from-yellow-300 via-orange-400 to-pink-500 p-6 text-white shadow-xl">
        <div className="flex flex-wrap gap-2">
          <Badge tone="brand">{AI_LEVEL_LABEL.OPTIONAL}</Badge>
          <Badge tone="slate">{AI_COST_LABEL.LOW}</Badge>
        </div>
        <h1 className="mt-2 text-3xl font-black">😂 AI 밈 만들기</h1>
        <p className="mt-1 text-sm opacity-90">사진을 올리고 자막을 골라 밈을 완성해 보세요. AI 자막이 없으면 직접 써도 돼요.</p>
      </div>
      <ErrorText>{error}</ErrorText>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button disabled={upload.isPending} onClick={() => fileRef.current?.click()}>
            {upload.isPending ? '올리는 중…' : url ? '다른 사진' : '사진 고르기'}
          </Button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload.mutate(e.target.files[0])} />
          {captionsOf.isPending && <span className="text-sm text-slate-500">AI가 자막을 고르는 중…</span>}
        </div>

        {url && (
          <div className="grid gap-4 md:grid-cols-2">
            <canvas ref={canvas} width={720} height={720} className="aspect-square w-full rounded-2xl bg-black shadow-xl" />
            <div className="space-y-3">
              <Input placeholder="위 자막" value={top} onChange={(e) => setTop(e.target.value.slice(0, 40))} />
              <Input placeholder="아래 자막" value={bottom} onChange={(e) => setBottom(e.target.value.slice(0, 40))} />
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500">{source === 'AI' ? 'AI 자막 후보 (누르면 자막에 들어가요)' : 'AI 자막이 없어요. 직접 써 주세요'}</p>
                <div className="flex flex-wrap gap-2">
                  {captions.map((c, i) => (
                    <button key={c} type="button" onClick={() => put(c)} className="wp-pop-in rounded-full bg-yellow-100 px-3 py-1.5 text-sm font-bold text-yellow-900 transition hover:-translate-y-0.5" style={{ animationDelay: `${i * 80}ms` }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => { setTop(''); setBottom(''); }}>
                  자막 지우기
                </Button>
                <Button onClick={save}>이미지로 저장</Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function drawCaption(ctx: CanvasRenderingContext2D, text: string, size: number, where: 'top' | 'bottom') {
  if (!text.trim()) return;
  ctx.font = `900 ${Math.round(size / 13)}px "Noto Sans KR", "Apple SD Gothic Neo", sans-serif`;
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.round(size / 40);
  ctx.strokeStyle = '#000';
  ctx.fillStyle = '#fff';
  const maxWidth = size * 0.9;
  const lines = wrap(ctx, text, maxWidth);
  const lineH = Math.round(size / 11);
  lines.forEach((line, i) => {
    const y = where === 'top' ? size * 0.03 + lineH * (i + 1) : size - size * 0.03 - lineH * (lines.length - i - 1);
    ctx.strokeText(line, size / 2, y);
    ctx.fillText(line, size / 2, y);
  });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const out: string[] = [];
  let line = '';
  for (const ch of text) {
    const next = line + ch;
    if (ctx.measureText(next).width > maxWidth && line) {
      out.push(line);
      line = ch;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}
