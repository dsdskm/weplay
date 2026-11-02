'use client';

import { useEffect, useRef, useState } from 'react';

/** 감으로 10초: 3초까지만 시계가 보이고 그 뒤는 감으로. 멈춘 순간의 ms 를 넘김 */
export function TenSeconds({ onFinish }: { onFinish: (ms: number) => void }) {
  const start = useRef(performance.now());
  const [elapsed, setElapsed] = useState(0);
  const [stopped, setStopped] = useState<number>();

  useEffect(() => {
    if (stopped !== undefined) return;
    let raf = 0;
    const tick = () => {
      setElapsed(performance.now() - start.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stopped]);

  const stop = () => {
    if (stopped !== undefined) return;
    const ms = performance.now() - start.current;
    setStopped(ms);
    setTimeout(() => onFinish(ms), 1400);
  };

  const visible = elapsed < 3000 || stopped !== undefined;
  const shown = stopped ?? elapsed;
  const diff = stopped !== undefined ? stopped - 10000 : 0;

  return (
    <div className="flex flex-col items-center gap-8 py-6">
      <div className="relative flex h-56 w-56 items-center justify-center">
        {stopped === undefined && (
          <>
            <span className="wp-ring absolute inset-0 rounded-full bg-violet-400/40" />
            <span className="wp-ring absolute inset-0 rounded-full bg-fuchsia-400/30" style={{ animationDelay: '0.7s' }} />
          </>
        )}
        <div className="wp-gradient relative flex h-56 w-56 flex-col items-center justify-center rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 text-white shadow-2xl shadow-violet-300">
          {visible ? (
            <span key={stopped ? 'stop' : 'run'} className={`text-6xl font-black tabular-nums ${stopped ? 'wp-zoom-out' : ''}`}>
              {(shown / 1000).toFixed(2)}
            </span>
          ) : (
            <span className="wp-float text-6xl font-black">??</span>
          )}
          <span className="mt-1 text-sm font-semibold opacity-80">{stopped !== undefined ? `${diff >= 0 ? '+' : ''}${(diff / 1000).toFixed(2)}초` : visible ? '초' : '마음속으로 세는 중…'}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={stop}
        disabled={stopped !== undefined}
        className="w-64 rounded-3xl bg-slate-900 py-5 text-2xl font-black text-white shadow-lg transition active:scale-95 disabled:opacity-40"
      >
        {stopped !== undefined ? Math.abs(diff) < 100 ? '😱 완벽해요!' : '멈춤!' : '10초다! 멈춰!'}
      </button>
    </div>
  );
}
