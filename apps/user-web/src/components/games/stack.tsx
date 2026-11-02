'use client';

import { useEffect, useRef, useState } from 'react';

interface Block {
  left: number;
  width: number;
}
const H = 26; // 블록 높이(px)

/** 블록 쌓기: 흔들리는 블록을 탭해서 떨어뜨림. 겹친 부분만 남고, 못 겹치면 끝. 쌓은 층 수 */
export function Stack({ onFinish }: { onFinish: (floors: number) => void }) {
  const [tower, setTower] = useState<Block[]>([{ left: 20, width: 60 }]);
  const [x, setX] = useState(0);
  const [cut, setCut] = useState<{ left: number; width: number; level: number; id: number }>();
  const [perfect, setPerfect] = useState(0);
  const [over, setOver] = useState(false);
  const t0 = useRef(performance.now());
  const done = useRef(false);

  const top = tower[tower.length - 1];
  const level = tower.length;
  const speed = 0.045 + Math.min(0.08, level * 0.004);

  useEffect(() => {
    let raf = 0;
    const tick = (now: number) => {
      if (!done.current) {
        const range = 100 - top.width;
        const t = (now - t0.current) * speed;
        setX(range - Math.abs((t % (range * 2 || 1)) - range));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [top.width, speed, level]);

  const drop = () => {
    if (done.current) return;
    const l = Math.max(x, top.left);
    const r = Math.min(x + top.width, top.left + top.width);
    const w = r - l;
    if (w <= 0.5) {
      done.current = true;
      setOver(true);
      setTimeout(() => onFinish(level - 1), 1200);
      return;
    }
    const isPerfect = Math.abs(x - top.left) < 1.2;
    const block = isPerfect ? { left: top.left, width: top.width } : { left: l, width: w };
    if (!isPerfect) setCut({ left: x < top.left ? x : r, width: top.width - w, level, id: Date.now() });
    if (isPerfect) setPerfect((p) => p + 1);
    setTower([...tower, block]);
    t0.current = performance.now();
  };

  const shift = Math.max(0, level - 9) * H; // 높아지면 화면을 위로
  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <span className="text-sm font-semibold text-slate-500">층수</span>
        <span key={level} className="wp-zoom-out text-4xl font-black tabular-nums">{level - 1}</span>
      </div>
      <button type="button" onPointerDown={drop} className="relative block h-80 w-full touch-none select-none overflow-hidden rounded-3xl bg-gradient-to-b from-indigo-950 via-indigo-800 to-fuchsia-700 shadow-inner">
        {[...Array(18)].map((_, i) => (
          <span key={i} className="absolute h-1 w-1 rounded-full bg-white/60" style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 60}%`, opacity: 0.3 + ((i * 7) % 7) / 10 }} />
        ))}
        <div className="absolute inset-x-0 bottom-0 transition-transform duration-300" style={{ transform: `translateY(${shift}px)` }}>
          {tower.map((b, i) => (
            <div
              key={i}
              className="absolute rounded-md shadow-md"
              style={{ left: `${b.left}%`, width: `${b.width}%`, bottom: i * H, height: H - 2, background: `hsl(${(i * 24) % 360} 85% 62%)` }}
            />
          ))}
          {!over && (
            <div className="absolute rounded-md shadow-lg ring-2 ring-white/60" style={{ left: `${x}%`, width: `${top.width}%`, bottom: level * H, height: H - 2, background: `hsl(${(level * 24) % 360} 90% 65%)` }} />
          )}
          {cut && (
            <div
              key={cut.id}
              className="absolute rounded-md opacity-80"
              style={{ left: `${cut.left}%`, width: `${cut.width}%`, bottom: cut.level * H, height: H - 2, background: `hsl(${(cut.level * 24) % 360} 60% 55%)`, animation: 'wp-fall 0.8s ease-in forwards' }}
            />
          )}
        </div>
        {perfect > 0 && !over && (
          <span key={perfect} className="wp-zoom-out absolute inset-x-0 top-6 text-center text-2xl font-black text-amber-300 drop-shadow">
            PERFECT ✨
          </span>
        )}
        {over && <span className="wp-zoom-out absolute inset-x-0 top-1/3 text-center text-4xl font-black text-white drop-shadow">와르르… 💥</span>}
      </button>
      <p className="text-center text-xs text-slate-400">화면을 눌러 블록을 떨어뜨려요 · 딱 맞추면 PERFECT</p>
    </div>
  );
}
