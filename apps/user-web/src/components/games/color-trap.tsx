'use client';

import { useEffect, useRef, useState } from 'react';

const COLORS = [
  { name: '빨강', css: '#ef4444' },
  { name: '파랑', css: '#3b82f6' },
  { name: '초록', css: '#22c55e' },
  { name: '노랑', css: '#eab308' },
  { name: '보라', css: '#a855f7' },
];
const LIMIT = 30_000;

const pick = () => {
  const word = Math.floor(Math.random() * COLORS.length);
  let ink = Math.floor(Math.random() * COLORS.length);
  if (Math.random() < 0.75) while (ink === word) ink = Math.floor(Math.random() * COLORS.length); // 대부분은 함정
  return { word, ink, id: Math.random() };
};

/** 색깔 함정: 글자 뜻이 아니라 글자 색을 고르기. 30초 동안 맞힌 개수 */
export function ColorTrap({ onFinish }: { onFinish: (count: number) => void }) {
  const [q, setQ] = useState(pick);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(LIMIT);
  const [flash, setFlash] = useState<'ok' | 'bad'>();
  const start = useRef(performance.now());
  const done = useRef(false);
  const scoreRef = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      const remain = LIMIT - (performance.now() - start.current);
      setLeft(Math.max(0, remain));
      if (remain <= 0 && !done.current) {
        done.current = true;
        clearInterval(id);
        setTimeout(() => onFinish(scoreRef.current), 600);
      }
    }, 50);
    return () => clearInterval(id);
  }, [onFinish]);

  const answer = (i: number) => {
    if (done.current) return;
    if (i === q.ink) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
      setFlash('ok');
    } else setFlash('bad');
    setTimeout(() => setFlash(undefined), 220);
    setQ(pick());
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-500">맞힌 개수</span>
        <span key={score} className="wp-zoom-out text-3xl font-black tabular-nums text-rose-500">{score}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-[width] duration-100 ${left < 8000 ? 'bg-rose-500' : 'bg-gradient-to-r from-rose-400 to-pink-500'}`}
          style={{ width: `${(left / LIMIT) * 100}%` }}
        />
      </div>
      <div
        className={`flex h-44 items-center justify-center rounded-3xl bg-white shadow-inner ring-1 transition-colors ${
          flash === 'ok' ? 'bg-emerald-50 ring-emerald-300' : flash === 'bad' ? 'wp-shake bg-rose-50 ring-rose-300' : 'ring-slate-200'
        }`}
      >
        <span key={q.id} className="wp-pop-in text-7xl font-black" style={{ color: COLORS[q.ink].css }}>
          {COLORS[q.word].name}
        </span>
      </div>
      <p className="text-center text-xs text-slate-400">글자의 <b>색깔</b>을 고르세요</p>
      <div className="grid grid-cols-5 gap-2">
        {COLORS.map((c, i) => (
          <button
            key={c.name}
            type="button"
            onPointerDown={() => answer(i)}
            className="flex aspect-square touch-none flex-col items-center justify-center rounded-2xl text-xs font-bold text-white shadow-md transition active:scale-90"
            style={{ background: c.css }}
          >
            {c.name}
          </button>
        ))}
      </div>
    </div>
  );
}
