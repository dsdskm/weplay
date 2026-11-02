'use client';

import { useEffect, useRef, useState } from 'react';
import { EMOJI_QUIZ, shuffle } from '@/lib/game-content';

const N = 10;
const PER = 8000;

/** 이모지 퀴즈: 이모지가 뜻하는 말을 보기 4개 중에서. 문제당 8초 */
export function EmojiQuiz({ onFinish }: { onFinish: (n: number) => void }) {
  const [qs] = useState(() =>
    shuffle(EMOJI_QUIZ)
      .slice(0, N)
      .map((q) => ({ ...q, choices: shuffle([q.answer, ...shuffle(EMOJI_QUIZ.filter((x) => x.answer !== q.answer)).slice(0, 3).map((x) => x.answer)]) })),
  );
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string>();
  const [left, setLeft] = useState(PER);
  const t0 = useRef(performance.now());
  const scoreRef = useRef(0);

  const q = qs[i];
  const go = (choice: string | null) => {
    if (picked !== undefined) return;
    setPicked(choice ?? '');
    if (choice === q.answer) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
    }
    setTimeout(() => {
      if (i + 1 >= N) onFinish(scoreRef.current);
      else {
        setI(i + 1);
        setPicked(undefined);
        t0.current = performance.now();
      }
    }, 900);
  };

  useEffect(() => {
    const id = setInterval(() => {
      const remain = PER - (performance.now() - t0.current);
      setLeft(Math.max(0, remain));
      if (remain <= 0) go(null);
    }, 80);
    return () => clearInterval(id);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm font-semibold text-slate-500">
        <span>
          {i + 1}/{N}
        </span>
        <span>
          정답 <b className="text-orange-500">{score}</b>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-gradient-to-r from-yellow-300 to-orange-500 transition-[width] duration-100" style={{ width: `${(left / PER) * 100}%` }} />
      </div>
      <div className="flex h-40 items-center justify-center rounded-3xl bg-gradient-to-br from-yellow-50 to-orange-50 shadow-inner">
        <span key={i} className="wp-zoom-out text-6xl tracking-widest">{q.emoji}</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {q.choices.map((c) => {
          const state = picked === undefined ? '' : c === q.answer ? 'bg-emerald-500 text-white ring-emerald-500 scale-[1.02]' : c === picked ? 'wp-shake bg-rose-500 text-white ring-rose-500' : 'opacity-50';
          return (
            <button key={c} type="button" onClick={() => go(c)} className={`rounded-2xl bg-white px-4 py-4 text-base font-bold ring-1 ring-slate-200 transition active:scale-95 ${state}`}>
              {c}
            </button>
          );
        })}
      </div>
    </div>
  );
}
