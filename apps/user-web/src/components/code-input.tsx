'use client';

import { JOIN_CODE_ALPHABET, JOIN_CODE_LENGTH } from '@weplay/shared';
import { KeyboardEvent, useRef } from 'react';

const ALLOWED = new Set(JOIN_CODE_ALPHABET);
const HALF = JOIN_CODE_LENGTH / 2;

const clean = (raw: string) => raw.toUpperCase().split('').filter((c) => ALLOWED.has(c));

/** 8자리 코드 입력 (ABCD-EF23 형태로 칸 분리). value는 항상 빈칸 없이 앞에서부터 채워진다 */
export function CodeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const focus = (i: number) => refs.current[Math.max(0, Math.min(JOIN_CODE_LENGTH - 1, i))]?.focus();

  /** start 위치부터 입력 문자열을 채운다 (붙여넣기·단일 입력 공용) */
  const insert = (start: number, input: string) => {
    const chars = clean(input);
    const next = (value.slice(0, start) + chars.join('') + value.slice(start + chars.length)).slice(0, JOIN_CODE_LENGTH);
    onChange(next);
    return Math.min(start + chars.length, JOIN_CODE_LENGTH - 1);
  };

  const onKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (i < value.length) {
        onChange(value.slice(0, i) + value.slice(i + 1));
      } else if (i > 0) {
        onChange(value.slice(0, i - 1) + value.slice(i));
        focus(i - 1);
      }
    } else if (e.key === 'ArrowLeft') focus(i - 1);
    else if (e.key === 'ArrowRight') focus(i + 1);
  };

  return (
    <div className="flex w-full items-center justify-center gap-1">
      {Array.from({ length: JOIN_CODE_LENGTH }, (_, i) => (
        <span key={i} className="contents">
          {i === HALF && <span className="px-0.5 text-xl font-bold text-slate-300">-</span>}
          <input
            ref={(el) => {
              refs.current[i] = el;
            }}
            value={value[i] ?? ''}
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            aria-label={`코드 ${i + 1}번째 글자`}
            onChange={(e) => {
              const typed = clean(e.target.value).pop();
              if (typed) focus(insert(i, typed));
            }}
            onKeyDown={(e) => onKeyDown(i, e)}
            onPaste={(e) => {
              e.preventDefault();
              focus(insert(i, e.clipboardData.getData('text')));
            }}
            onFocus={(e) => e.target.select()}
            className="h-11 w-8 min-w-0 rounded-xl border border-slate-200 bg-white text-center font-mono text-xl font-bold uppercase text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 sm:h-12 sm:w-10"
          />
        </span>
      ))}
    </div>
  );
}
