'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/components/ui';

const COLORS = ['#0f172a', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#ffffff'];
const SIZES = [3, 7, 14];

/** 손가락·마우스 그림판. 완성하면 PNG Blob 으로 넘김. base 가 있으면 그 위에 이어 그림 */
export function DrawPad({ onDone, busy, base }: { onDone: (blob: Blob) => void; busy?: boolean; base?: string | null }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[1]);
  const [history, setHistory] = useState<ImageData[]>([]);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const c = canvas.current!;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
    if (base) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => ctx.drawImage(img, 0, 0, c.width, c.height);
      img.src = base;
    }
  }, [base]);

  const point = (e: React.PointerEvent) => {
    const c = canvas.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  };
  const down = (e: React.PointerEvent) => {
    const c = canvas.current!;
    const ctx = c.getContext('2d')!;
    setHistory((h) => [...h.slice(-19), ctx.getImageData(0, 0, c.width, c.height)]);
    drawing.current = true;
    last.current = point(e);
    c.setPointerCapture(e.pointerId);
    move(e);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current || !last.current) return;
    const ctx = canvas.current!.getContext('2d')!;
    const p = point(e);
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };
  const up = () => {
    drawing.current = false;
    last.current = null;
  };
  const undo = () => {
    const prev = history[history.length - 1];
    if (!prev) return;
    canvas.current!.getContext('2d')!.putImageData(prev, 0, 0);
    setHistory((h) => h.slice(0, -1));
  };
  const clear = () => {
    const c = canvas.current!;
    const ctx = c.getContext('2d')!;
    setHistory((h) => [...h.slice(-19), ctx.getImageData(0, 0, c.width, c.height)]);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
  };
  const done = () => canvas.current!.toBlob((b) => b && onDone(b), 'image/png');

  return (
    <div className="space-y-3">
      <canvas
        ref={canvas}
        width={720}
        height={720}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        className="aspect-square w-full touch-none rounded-3xl bg-white shadow-inner ring-1 ring-slate-200"
      />
      <div className="flex flex-wrap items-center gap-2">
        {COLORS.map((c) => (
          <button key={c} type="button" aria-label={`색 ${c}`} onClick={() => setColor(c)} className={cn('h-8 w-8 rounded-full ring-2 transition', color === c ? 'scale-110 ring-brand-500' : 'ring-slate-200')} style={{ background: c }} />
        ))}
        <span className="mx-1 h-6 w-px bg-slate-200" />
        {SIZES.map((s) => (
          <button key={s} type="button" onClick={() => setSize(s)} className={cn('flex h-8 w-8 items-center justify-center rounded-full ring-1', size === s ? 'bg-slate-900 ring-slate-900' : 'ring-slate-200')}>
            <span className="rounded-full" style={{ width: s + 2, height: s + 2, background: size === s ? '#fff' : '#0f172a' }} />
          </button>
        ))}
        <button type="button" onClick={undo} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold">
          되돌리기
        </button>
        <button type="button" onClick={clear} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold">
          지우기
        </button>
        <button type="button" disabled={busy} onClick={done} className="ml-auto rounded-full bg-brand-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-50">
          {busy ? '올리는 중…' : '그림 완성!'}
        </button>
      </div>
    </div>
  );
}
