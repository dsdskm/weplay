'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const COLORS = ['#8b5cf6', '#f472b6', '#fbbf24', '#34d399', '#60a5fa', '#fb7185'];

/** 화면 위에서 쏟아지는 색종이 (pointer-events 없음) */
export function Confetti({ count = 70 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 1.8 + Math.random() * 1.6,
        dx: `${(Math.random() - 0.5) * 240}px`,
        rot: `${360 + Math.random() * 720}deg`,
        color: COLORS[i % COLORS.length],
        w: 6 + Math.random() * 6,
        round: Math.random() < 0.3,
      })),
    [count],
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute top-0 block"
          style={
            {
              left: `${p.left}%`,
              width: p.w,
              height: p.round ? p.w : p.w * 1.6,
              background: p.color,
              borderRadius: p.round ? '9999px' : '2px',
              animation: `wp-confetti ${p.duration}s cubic-bezier(0.2, 0.6, 0.4, 1) ${p.delay}s both`,
              '--wp-dx': p.dx,
              '--wp-rot': p.rot,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

/** 0 → value 로 부드럽게 올라가는 숫자 */
export function CountUp({ value, decimals = 0, duration = 1100, className }: { value: number; decimals?: number; duration?: number; className?: string }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const base = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(base + (value - base) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <span className={className}>{shown.toFixed(decimals)}</span>;
}

/** 점수(0~100) 원형 게이지. 마운트 시 차오르는 애니메이션 */
export function ScoreRing({ score, size = 180, color = '#8b5cf6' }: { score: number; size?: number; color?: string }) {
  const [p, setP] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setP(score), 60);
    return () => clearTimeout(t);
  }, [score]);
  const r = size / 2 - 12;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#ede9fe" strokeWidth={12} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={12}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p / 100)}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <CountUp value={score} decimals={2} className="text-4xl font-black tabular-nums" />
        <span className="text-xs font-semibold text-slate-400">점</span>
      </div>
    </div>
  );
}

/** 3, 2, 1, 시작! 카운트다운 후 onDone */
export function Countdown({ onDone }: { onDone: () => void }) {
  const [n, setN] = useState(3);
  useEffect(() => {
    if (n === 0) {
      const t = setTimeout(onDone, 450);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setN(n - 1), 700);
    return () => clearTimeout(t);
  }, [n, onDone]);
  return (
    <div className="flex h-72 items-center justify-center">
      <span key={n} className="wp-zoom-out bg-gradient-to-br from-brand-500 to-pink-500 bg-clip-text text-8xl font-black text-transparent">
        {n === 0 ? 'GO!' : n}
      </span>
    </div>
  );
}

export const medal = (rank: number | null) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null);
