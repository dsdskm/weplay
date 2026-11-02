'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Avatar } from '@/components/ui';
import { api, assetUrl } from '@/lib/api';

interface Round {
  available: boolean;
  items: { mediaUrl: string; answerId: string; choices: { id: string; name: string; avatarUrl: string | null }[]; focus: { x: number; y: number } }[];
}
const REVEAL = 7000;

/** 사진 확대 퀴즈 (사진 한 조각): 동료 사진의 일부를 크게 보여 주고 점점 넓게 보여 줌. 누가 올렸는지 맞히기 */
export function PhotoWho({ onFinish }: { onFinish: (n: number) => void }) {
  const { groupId } = useParams<{ groupId: string }>();
  // 판마다 새 사진 묶음 (키를 고정해야 다시 그릴 때 또 불러오지 않음)
  const [seed] = useState(() => Math.random());
  const { data } = useQuery({ queryKey: ['group', groupId, 'games', 'photo-round', seed], queryFn: () => api<Round>(`/groups/${groupId}/games/photo-round`), staleTime: Infinity, gcTime: 0 });
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string>();
  const [zoom, setZoom] = useState(5);
  const t0 = useRef(performance.now());
  const scoreRef = useRef(0);

  useEffect(() => {
    if (!data?.available || picked !== undefined) return;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0.current) / REVEAL);
      setZoom(5 - 4 * p); // 5배 → 1배
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [data, i, picked]);

  if (!data) return <p className="py-16 text-center text-slate-400">사진 고르는 중…</p>;
  if (!data.available)
    return (
      <div className="space-y-3 py-12 text-center">
        <p className="text-5xl">📷</p>
        <p className="font-bold">아직 동료 사진이 부족해요</p>
        <p className="text-sm text-slate-500">사진 미션이나 사진 빙고에 사진이 5장 이상 쌓이면 열려요.</p>
        <button type="button" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white" onClick={() => onFinish(0)}>
          0점으로 끝내기
        </button>
      </div>
    );

  const it = data.items[i];
  const pick = (id: string) => {
    if (picked !== undefined) return;
    setPicked(id);
    setZoom(1);
    if (id === it.answerId) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
    }
    setTimeout(() => {
      if (i + 1 >= data.items.length) onFinish(scoreRef.current);
      else {
        setI(i + 1);
        setPicked(undefined);
        setZoom(5);
        t0.current = performance.now();
      }
    }, 1500);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between text-sm font-semibold text-slate-500">
        <span>
          {i + 1}/{data.items.length}
        </span>
        <span>
          정답 <b className="text-purple-600">{score}</b>
        </span>
      </div>
      <div className="relative aspect-square overflow-hidden rounded-3xl bg-slate-900 shadow-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={i}
          src={assetUrl(it.mediaUrl)}
          alt="누구 사진일까요"
          className="h-full w-full object-cover transition-transform duration-500"
          style={{ transform: `scale(${zoom})`, transformOrigin: `${it.focus.x}% ${it.focus.y}%` }}
        />
        <span className="absolute left-3 top-3 rounded-full bg-black/50 px-3 py-1 text-xs font-bold text-white">🔍 {zoom.toFixed(1)}배</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {it.choices.map((c) => {
          const state = picked === undefined ? 'bg-white ring-slate-200' : c.id === it.answerId ? 'bg-emerald-500 text-white ring-emerald-500' : c.id === picked ? 'wp-shake bg-rose-500 text-white ring-rose-500' : 'bg-white opacity-50 ring-slate-200';
          return (
            <button key={c.id} type="button" onClick={() => pick(c.id)} className={`flex items-center gap-2 rounded-2xl px-3 py-3 text-left text-sm font-bold ring-1 transition active:scale-95 ${state}`}>
              <Avatar name={c.name} url={c.avatarUrl} size={28} />
              <span className="truncate">{c.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
