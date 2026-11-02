'use client';

import { useEffect, useRef, useState } from 'react';

const ROUNDS = 3;
type Phase = 'wait' | 'go' | 'early' | 'hit';

/** 반응속도: 3번의 평균 ms. 초록이 되기 전에 누르면 그 판 다시 */
export function Reaction({ onFinish }: { onFinish: (ms: number) => void }) {
  const [phase, setPhase] = useState<Phase>('wait');
  const [times, setTimes] = useState<number[]>([]);
  const [last, setLast] = useState<number>();
  const goAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const arm = () => {
    setPhase('wait');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      goAt.current = performance.now();
      setPhase('go');
    }, 1300 + Math.random() * 2700);
  };

  useEffect(() => {
    arm();
    return () => clearTimeout(timer.current);
  }, []);

  const tap = () => {
    if (phase === 'wait') {
      clearTimeout(timer.current);
      setPhase('early');
      setTimeout(arm, 1100);
      return;
    }
    if (phase !== 'go') return;
    const ms = performance.now() - goAt.current;
    const next = [...times, ms];
    setTimes(next);
    setLast(ms);
    setPhase('hit');
    if (next.length >= ROUNDS) setTimeout(() => onFinish(next.reduce((a, b) => a + b, 0) / next.length), 900);
    else setTimeout(arm, 900);
  };

  const style = {
    wait: 'from-rose-500 to-orange-500',
    go: 'from-emerald-400 to-teal-500',
    early: 'from-slate-600 to-slate-800',
    hit: 'from-sky-500 to-indigo-500',
  }[phase];

  return (
    <div className="space-y-4 py-2">
      <div className="flex justify-center gap-2">
        {Array.from({ length: ROUNDS }, (_, i) => (
          <span key={i} className={`h-2.5 w-10 rounded-full transition-all duration-500 ${i < times.length ? 'bg-emerald-500' : 'bg-slate-200'}`} />
        ))}
      </div>
      <button
        type="button"
        onPointerDown={tap}
        className={`relative flex h-80 w-full touch-none select-none flex-col items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br text-white shadow-xl transition-colors duration-150 ${style} ${phase === 'early' ? 'wp-shake' : ''}`}
      >
        {phase === 'go' && (
          <>
            <span className="wp-ring absolute h-40 w-40 rounded-full bg-white/40" />
            <span className="wp-ring absolute h-40 w-40 rounded-full bg-white/30" style={{ animationDelay: '0.35s' }} />
          </>
        )}
        <span key={phase} className="wp-zoom-out relative text-5xl font-black">
          {phase === 'wait' && '기다려…'}
          {phase === 'go' && '지금!'}
          {phase === 'early' && '앗, 너무 빨라요!'}
          {phase === 'hit' && `${Math.round(last ?? 0)}ms`}
        </span>
        <span className="relative mt-3 text-sm font-semibold opacity-80">
          {phase === 'wait' && '초록색이 되는 순간 터치'}
          {phase === 'early' && '이번 판은 다시 할게요'}
          {phase === 'hit' && (last ?? 999) < 220 ? '번개 같아요 ⚡' : phase === 'hit' ? '좋아요!' : ''}
        </span>
      </button>
    </div>
  );
}
