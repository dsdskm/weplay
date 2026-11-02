'use client';

import { useEffect, useRef, useState } from 'react';
import { chosung, CHOSUNG_WORDS, shuffle } from '@/lib/game-content';

const LIMIT = 60_000;

/** 초성 퀴즈: 초성과 분류만 보고 단어 맞히기. 같은 초성의 다른 단어도 정답 */
export function ChosungQuiz({ onFinish }: { onFinish: (n: number) => void }) {
  const [deck] = useState(() => shuffle(CHOSUNG_WORDS));
  const [idx, setIdx] = useState(0);
  const [text, setText] = useState('');
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(LIMIT);
  const [flash, setFlash] = useState<'ok' | 'bad' | 'pass'>();
  const [reveal, setReveal] = useState<string>();
  const start = useRef(performance.now());
  const scoreRef = useRef(0);
  const ended = useRef(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = setInterval(() => {
      const remain = LIMIT - (performance.now() - start.current);
      setLeft(Math.max(0, remain));
      if (remain <= 0 && !ended.current) {
        ended.current = true;
        clearInterval(id);
        setTimeout(() => onFinish(scoreRef.current), 500);
      }
    }, 100);
    return () => clearInterval(id);
  }, [onFinish]);

  const cur = deck[idx % deck.length];
  const target = chosung(cur.word);
  const valid = new Set(CHOSUNG_WORDS.filter((w) => chosung(w.word) === target).map((w) => w.word.replace(/\s/g, '')));
  const next = () => {
    setIdx((i) => i + 1);
    setText('');
    input.current?.focus();
  };
  const submit = () => {
    if (ended.current || !text.trim()) return;
    const t = text.replace(/\s/g, '');
    // 문제 은행에 있는, 초성이 같은 단어면 정답 (예: ㅅㄱ → 사과·수건 등)
    if (valid.has(t)) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
      setFlash('ok');
      setTimeout(() => setFlash(undefined), 300);
      next();
    } else {
      setFlash('bad');
      setTimeout(() => setFlash(undefined), 300);
    }
  };
  const pass = () => {
    setReveal(cur.word);
    setFlash('pass');
    setTimeout(() => {
      setReveal(undefined);
      setFlash(undefined);
    }, 900);
    next();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-500">
          맞힌 단어 <span key={score} className="wp-zoom-out inline-block text-2xl font-black text-teal-600">{score}</span>
        </span>
        <span className="text-sm font-bold tabular-nums text-slate-500">{Math.ceil(left / 1000)}초</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-[width] duration-100 ${left < 10_000 ? 'bg-rose-500' : 'bg-gradient-to-r from-teal-400 to-cyan-600'}`} style={{ width: `${(left / LIMIT) * 100}%` }} />
      </div>
      <div className={`relative flex h-40 flex-col items-center justify-center gap-2 rounded-3xl shadow-inner ring-1 transition-colors ${flash === 'ok' ? 'bg-emerald-50 ring-emerald-300' : flash === 'bad' ? 'wp-shake bg-rose-50 ring-rose-300' : 'bg-white ring-slate-200'}`}>
        <span className="rounded-full bg-teal-100 px-3 py-0.5 text-xs font-bold text-teal-700">{cur.hint}</span>
        <span key={idx} className="wp-pop-in text-6xl font-black tracking-[0.3em] text-slate-800">{target}</span>
        {reveal && <span className="wp-fade absolute bottom-3 text-sm text-slate-400">정답: {reveal}</span>}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          ref={input}
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="단어 입력 후 엔터"
          className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-lg outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
        />
        <button type="submit" className="rounded-2xl bg-teal-600 px-5 font-bold text-white active:scale-95">
          확인
        </button>
        <button type="button" onClick={pass} className="rounded-2xl bg-slate-100 px-4 font-bold text-slate-600 active:scale-95">
          패스
        </button>
      </form>
    </div>
  );
}
