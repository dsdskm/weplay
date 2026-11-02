'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { shuffle } from '@/lib/game-content';

const LIMIT = 30_000;

function makeProblem(level: number) {
  const ops = level < 4 ? ['+', '-'] : ['+', '-', '×'];
  const op = ops[Math.floor(Math.random() * ops.length)];
  const max = 10 + level * 4;
  let a = 1 + Math.floor(Math.random() * max);
  let b = 1 + Math.floor(Math.random() * max);
  if (op === '×') {
    a = 2 + Math.floor(Math.random() * 9);
    b = 2 + Math.floor(Math.random() * 9);
  }
  if (op === '-' && b > a) [a, b] = [b, a];
  const answer = op === '+' ? a + b : op === '-' ? a - b : a * b;
  const wrong = new Set<number>();
  while (wrong.size < 3) {
    const d = (Math.floor(Math.random() * 5) + 1) * (Math.random() < 0.5 ? -1 : 1);
    if (answer + d >= 0) wrong.add(answer + d);
  }
  return { text: `${a} ${op} ${b}`, answer, choices: shuffle([answer, ...wrong]), id: Math.random() };
}

/** 번개 계산: 30초 동안 맞힌 개수. 연속 정답 콤보 */
export function QuickMath({ onFinish }: { onFinish: (n: number) => void }) {
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [q, setQ] = useState(() => makeProblem(0));
  const [left, setLeft] = useState(LIMIT);
  const [flash, setFlash] = useState<'ok' | 'bad'>();
  const start = useRef(performance.now());
  const scoreRef = useRef(0);
  const ended = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      const remain = LIMIT - (performance.now() - start.current);
      setLeft(Math.max(0, remain));
      if (remain <= 0 && !ended.current) {
        ended.current = true;
        clearInterval(id);
        setTimeout(() => onFinish(scoreRef.current), 500);
      }
    }, 50);
    return () => clearInterval(id);
  }, [onFinish]);

  const answer = (v: number) => {
    if (ended.current) return;
    if (v === q.answer) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
      setCombo((c) => c + 1);
      setFlash('ok');
    } else {
      setCombo(0);
      setFlash('bad');
    }
    setTimeout(() => setFlash(undefined), 200);
    setQ(makeProblem(scoreRef.current));
  };
  const comboText = useMemo(() => (combo >= 10 ? '🔥🔥🔥' : combo >= 5 ? '🔥🔥' : combo >= 3 ? '🔥' : ''), [combo]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-500">
          정답 <span key={score} className="wp-zoom-out inline-block text-2xl font-black text-emerald-600">{score}</span>
        </span>
        <span className="text-sm font-bold text-amber-500">{combo >= 3 && `${combo} 콤보 ${comboText}`}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-[width] duration-100 ${left < 8000 ? 'bg-rose-500' : 'bg-gradient-to-r from-lime-400 to-emerald-600'}`} style={{ width: `${(left / LIMIT) * 100}%` }} />
      </div>
      <div className={`flex h-36 items-center justify-center rounded-3xl text-6xl font-black tabular-nums shadow-inner transition-colors ${flash === 'ok' ? 'bg-emerald-50 text-emerald-600' : flash === 'bad' ? 'wp-shake bg-rose-50 text-rose-500' : 'bg-white text-slate-800 ring-1 ring-slate-200'}`}>
        <span key={q.id} className="wp-pop-in">{q.text}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {q.choices.map((c) => (
          <button key={`${q.id}-${c}`} type="button" onPointerDown={() => answer(c)} className="touch-none rounded-2xl bg-gradient-to-br from-lime-400 to-emerald-600 py-5 text-3xl font-black text-white shadow-md transition active:scale-90">
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
