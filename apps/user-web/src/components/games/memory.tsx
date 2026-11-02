'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const PADS = [
  'from-rose-400 to-red-500',
  'from-amber-300 to-orange-500',
  'from-lime-300 to-green-500',
  'from-sky-300 to-blue-500',
  'from-violet-400 to-purple-600',
  'from-pink-300 to-fuchsia-500',
  'from-teal-300 to-emerald-500',
  'from-indigo-300 to-indigo-600',
  'from-yellow-200 to-amber-400',
];

/** 기억력 시퀀스: 반짝인 순서를 따라 누르기. 성공한 단계 수(최소 1)를 넘김 */
export function Memory({ onFinish }: { onFinish: (level: number) => void }) {
  const [seq, setSeq] = useState<number[]>([]);
  const [lit, setLit] = useState<number>();
  const [input, setInput] = useState(0);
  const [mode, setMode] = useState<'show' | 'input' | 'fail' | 'clear'>('show');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const play = useCallback((s: number[]) => {
    setMode('show');
    setInput(0);
    const speed = Math.max(260, 620 - s.length * 30);
    s.forEach((p, i) => {
      timers.current.push(setTimeout(() => setLit(p), 600 + i * speed));
      timers.current.push(setTimeout(() => setLit(undefined), 600 + i * speed + speed * 0.6));
    });
    timers.current.push(setTimeout(() => setMode('input'), 600 + s.length * speed));
  }, []);

  useEffect(() => {
    const first = [Math.floor(Math.random() * 9)];
    setSeq(first);
    play(first);
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, [play]);

  const tap = (p: number) => {
    if (mode !== 'input') return;
    setLit(p);
    setTimeout(() => setLit(undefined), 160);
    if (seq[input] !== p) {
      setMode('fail');
      setTimeout(() => onFinish(Math.max(1, seq.length - 1)), 1100);
      return;
    }
    if (input + 1 === seq.length) {
      setMode('clear');
      const next = [...seq, Math.floor(Math.random() * 9)];
      setTimeout(() => {
        setSeq(next);
        play(next);
      }, 700);
      return;
    }
    setInput(input + 1);
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-sm font-semibold text-slate-500">단계</p>
        <p key={seq.length} className="wp-zoom-out text-5xl font-black tabular-nums">{seq.length}</p>
        <p className={`mt-1 h-5 text-sm font-semibold ${mode === 'fail' ? 'text-rose-500' : mode === 'clear' ? 'text-emerald-500' : 'text-slate-400'}`}>
          {mode === 'show' && '잘 보세요 👀'}
          {mode === 'input' && `따라 눌러요 (${input}/${seq.length})`}
          {mode === 'clear' && '정답! 한 단계 더 ✨'}
          {mode === 'fail' && '아쉬워요!'}
        </p>
      </div>
      <div className={`mx-auto grid max-w-sm grid-cols-3 gap-3 ${mode === 'fail' ? 'wp-shake' : ''}`}>
        {PADS.map((g, i) => (
          <button
            key={i}
            type="button"
            onPointerDown={() => tap(i)}
            className={`aspect-square touch-none rounded-3xl bg-gradient-to-br shadow-md transition-all duration-150 ${g} ${
              lit === i ? 'scale-105 brightness-125 saturate-150 shadow-xl ring-4 ring-white' : mode === 'input' ? 'opacity-90 active:scale-95' : 'opacity-45'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
