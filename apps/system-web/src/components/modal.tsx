'use client';

import { useEffect, type ReactNode } from 'react';
import { cn } from './ui';

/** 공통 모달: 모바일은 아래에서 올라오는 시트, 데스크톱은 가운데 창. 변경은 footer 의 [저장] 버튼으로만 반영 */
export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[55] flex items-end justify-center bg-slate-900/40 sm:items-center sm:p-4">
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} className={cn('wp-sheet flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')}>
        <div className="border-b border-slate-100 px-5 pb-3 pt-2 sm:pt-4">
          <span className="mx-auto mb-2 block h-1 w-10 rounded-full bg-slate-200 sm:hidden" />
          <div className="flex items-center gap-3">
            <h2 className="min-w-0 flex-1 truncate text-lg font-bold">{title}</h2>
            <button type="button" aria-label="닫기" onClick={onClose} className="rounded-full px-2 py-1 text-slate-400 hover:bg-slate-100">
              ✕
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}
