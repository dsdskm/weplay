'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const N = 16;
const HUES = ['bg-sky-400', 'bg-indigo-400', 'bg-violet-400', 'bg-fuchsia-400'];

/** 숫자 순서 터치: 1~16 을 순서대로. 끝까지 걸린 ms */
export function NumberTouch({ onFinish }: { onFinish: (ms: number) => void }) {
  const cells = useMemo(() => [...Array(N)].map((_, i) => i + 1).sort(() => Math.random() - 0.5), []);
  const start = useRef(performance.now());
  const [next, setNext] = useState(1);
  const [wrong, setWrong] = useState<number>();
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) return;
    const id = setInterval(() => setElapsed(performance.now() - start.current), 47);
    return () => clearInterval(id);
  }, [done]);

  const tap = (n: number) => {
    if (done) return;
    if (n !== next) {
      setWrong(n);
      setTimeout(() => setWrong(undefined), 350);
      return;
    }
    if (n === N) {
      const ms = performance.now() - start.current;
      setElapsed(ms);
      setDone(true);
      setTimeout(() => onFinish(ms), 900);
    }
    setNext(n + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <span className="text-sm font-semibold text-slate-500">
          다음 숫자 <span className="ml-1 inline-block min-w-8 rounded-lg bg-slate-900 px-2 py-0.5 text-center text-lg text-white">{Math.min(next, N)}</span>
        </span>
        <span className="text-3xl font-black tabular-nums">{(elapsed / 1000).toFixed(2)}초</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-500 transition-all duration-300" style={{ width: `${((next - 1) / N) * 100}%` }} />
      </div>
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {cells.map((n, i) => {
          const cleared = n < next;
          return (
            <button
              key={n}
              type="button"
              onPointerDown={() => tap(n)}
              style={{ animationDelay: `${i * 25}ms` }}
              className={`wp-pop-in flex aspect-square touch-none select-none items-center justify-center rounded-2xl text-2xl font-black shadow-sm transition-all duration-300 sm:text-3xl ${
                cleared ? `${HUES[n % HUES.length]} scale-90 text-white/80 opacity-60` : 'bg-white text-slate-800 ring-1 ring-slate-200 active:scale-90'
              } ${wrong === n ? 'wp-shake bg-rose-100 ring-rose-300' : ''}`}
            >
              {cleared ? '✓' : n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
