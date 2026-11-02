'use client';

import { useEffect, useRef, useState } from 'react';

const ROUNDS = 5;

/** Perfect Stop: 좌우로 움직이는 막대를 정중앙에서 멈추기. 5번 평균 빗나간 정도(%) */
export function PerfectStop({ onFinish }: { onFinish: (dev: number) => void }) {
  const [pos, setPos] = useState(0);
  const [round, setRound] = useState(0);
  const [devs, setDevs] = useState<number[]>([]);
  const [hit, setHit] = useState<number>();
  const start = useRef(performance.now());
  const stopped = useRef(false);

  useEffect(() => {
    let raf = 0;
    const speed = 0.06 + round * 0.025; // 라운드마다 빨라짐 (%/ms)
    const tick = (now: number) => {
      if (!stopped.current) {
        const t = (now - start.current) * speed;
        setPos(100 - Math.abs((t % 200) - 100)); // 0→100→0 삼각파
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [round]);

  const stop = () => {
    if (stopped.current) return;
    stopped.current = true;
    const dev = Math.abs(pos - 50);
    const next = [...devs, dev];
    setDevs(next);
    setHit(dev);
    setTimeout(() => {
      if (next.length >= ROUNDS) onFinish(next.reduce((a, b) => a + b, 0) / next.length);
      else {
        setHit(undefined);
        stopped.current = false;
        start.current = performance.now() + Math.random() * 400;
        setRound(next.length);
      }
    }, 1000);
  };

  const label = hit === undefined ? null : hit < 1 ? 'PERFECT!!' : hit < 4 ? 'GREAT!' : hit < 10 ? 'GOOD' : 'OOPS';
  return (
    <div className="space-y-6 py-4">
      <div className="flex justify-center gap-2">
        {Array.from({ length: ROUNDS }, (_, i) => (
          <span key={i} className={`h-2.5 w-8 rounded-full transition-all duration-500 ${i < devs.length ? (devs[i] < 4 ? 'bg-emerald-500' : 'bg-amber-400') : 'bg-slate-200'}`} />
        ))}
      </div>
      <div className="relative mx-auto h-24 max-w-md select-none">
        <div className="absolute inset-x-0 top-1/2 h-6 -translate-y-1/2 overflow-hidden rounded-full bg-gradient-to-r from-rose-200 via-emerald-200 to-rose-200 shadow-inner">
          <div className="absolute inset-y-0 left-1/2 w-[8%] -translate-x-1/2 bg-emerald-400/70" />
          <div className="absolute inset-y-0 left-1/2 w-[2%] -translate-x-1/2 bg-emerald-600" />
        </div>
        <div className="absolute top-0 h-24 w-1.5 -translate-x-1/2 rounded-full bg-slate-900 shadow-lg" style={{ left: `${pos}%` }}>
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xl">🎯</span>
        </div>
        {label && (
          <span key={devs.length} className={`wp-zoom-out absolute inset-x-0 -bottom-10 text-center text-3xl font-black ${hit! < 4 ? 'text-emerald-500' : 'text-amber-500'}`}>
            {label} <span className="text-base text-slate-400">{hit!.toFixed(2)}%</span>
          </span>
        )}
      </div>
      <div className="pt-8 text-center">
        <button type="button" onPointerDown={stop} className="w-64 touch-none rounded-3xl bg-gradient-to-r from-cyan-500 to-blue-600 py-5 text-2xl font-black text-white shadow-xl transition active:scale-95">
          STOP!
        </button>
        <p className="mt-2 text-xs text-slate-400">라운드 {Math.min(round + 1, ROUNDS)}/{ROUNDS} · 갈수록 빨라져요</p>
      </div>
    </div>
  );
}
