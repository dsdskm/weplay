'use client';

import { useState } from 'react';

const SUITS = ['♠', '♥', '♦', '♣'];
const RANK = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const draw = () => ({ v: 1 + Math.floor(Math.random() * 13), s: SUITS[Math.floor(Math.random() * 4)], id: Math.random() });

/** High / Low: 다음 카드가 높을지 낮을지. 같으면 통과. 틀리면 끝. 연속 정답 수 */
export function HighLow({ onFinish }: { onFinish: (streak: number) => void }) {
  const [card, setCard] = useState(draw);
  const [next, setNext] = useState<ReturnType<typeof draw>>();
  const [streak, setStreak] = useState(0);
  const [result, setResult] = useState<'ok' | 'bad' | 'tie'>();
  const [busy, setBusy] = useState(false);

  const guess = (dir: 'H' | 'L') => {
    if (busy) return;
    setBusy(true);
    let n = draw();
    while (n.v === card.v && n.s === card.s) n = draw();
    setNext(n);
    const ok = n.v === card.v ? 'tie' : (dir === 'H') === n.v > card.v ? 'ok' : 'bad';
    setResult(ok);
    setTimeout(() => {
      if (ok === 'bad') {
        onFinish(streak);
        return;
      }
      const s = ok === 'ok' ? streak + 1 : streak;
      setStreak(s);
      setCard(n);
      setNext(undefined);
      setResult(undefined);
      setBusy(false);
    }, 1100);
  };

  const red = (s: string) => s === '♥' || s === '♦';
  const Face = ({ c, flip }: { c: ReturnType<typeof draw>; flip?: boolean }) => (
    <div className={`relative flex h-44 w-32 flex-col justify-between rounded-2xl bg-white p-3 shadow-xl ring-1 ring-slate-200 ${flip ? 'wp-flip-in' : ''} ${red(c.s) ? 'text-rose-500' : 'text-slate-900'}`}>
      <span className="text-xl font-black leading-none">
        {RANK[c.v]}
        <br />
        {c.s}
      </span>
      <span className="self-center text-5xl">{c.s}</span>
      <span className="rotate-180 text-xl font-black leading-none">
        {RANK[c.v]}
        <br />
        {c.s}
      </span>
    </div>
  );

  return (
    <div className="space-y-6 py-2">
      <p className="text-center text-sm font-semibold text-slate-500">
        연속 <span key={streak} className="wp-zoom-out inline-block text-3xl font-black text-slate-900">{streak}</span>
      </p>
      <div className="flex items-center justify-center gap-5" style={{ perspective: 800 }}>
        <Face c={card} />
        <span className="text-2xl text-slate-300">→</span>
        {next ? (
          <Face key={next.id} c={next} flip />
        ) : (
          <div className="flex h-44 w-32 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 text-4xl shadow-xl ring-4 ring-white">🂠</div>
        )}
      </div>
      <p className={`h-8 text-center text-2xl font-black ${result === 'bad' ? 'text-rose-500' : result ? 'text-emerald-500' : ''}`}>{result === 'ok' ? '정답! 🎉' : result === 'tie' ? '같은 숫자! 통과 😮' : result === 'bad' ? '아쉬워요 💥' : ''}</p>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" disabled={busy} onClick={() => guess('H')} className="rounded-2xl bg-gradient-to-br from-rose-400 to-rose-600 py-5 text-2xl font-black text-white shadow-md transition active:scale-90 disabled:opacity-60">
          ⬆ HIGH
        </button>
        <button type="button" disabled={busy} onClick={() => guess('L')} className="rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-600 py-5 text-2xl font-black text-white shadow-md transition active:scale-90 disabled:opacity-60">
          ⬇ LOW
        </button>
      </div>
    </div>
  );
}
