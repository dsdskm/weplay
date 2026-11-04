'use client';

import { createContext, ReactNode, useCallback, useContext, useRef, useState } from 'react';
import { Button, Card, Input } from './ui';

interface BaseOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  /** 삭제 등 되돌릴 수 없는 작업이면 true (확인 버튼이 빨간색) */
  danger?: boolean;
}

export interface PromptOptions extends BaseOptions {
  placeholder?: string;
  /** true면 빈 값으로 확인할 수 없음 */
  required?: boolean;
}

interface DialogApi {
  /** 확인/취소. 확인이면 true */
  confirm: (options: BaseOptions | string) => Promise<boolean>;
  /** 안내 후 확인 */
  alert: (options: BaseOptions | string) => Promise<void>;
  /** 입력 받기. 취소하면 null */
  prompt: (options: PromptOptions | string) => Promise<string | null>;
}

type Mode = 'confirm' | 'alert' | 'prompt';
interface Active {
  mode: Mode;
  options: PromptOptions;
  resolve: (value: unknown) => void;
}

const toOptions = <T extends BaseOptions>(input: T | string) => (typeof input === 'string' ? ({ message: input } as T) : input);

const DialogContext = createContext<DialogApi>({
  confirm: async () => false,
  alert: async () => undefined,
  prompt: async () => null,
});

/** 앱 공통 모달 (confirm / alert / prompt). window.confirm·alert·prompt 대신 사용 */
export function DialogProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<Active>();
  const activeRef = useRef<Active | undefined>(undefined);
  const seq = useRef(0);

  const open = useCallback(<T,>(mode: Mode, options: PromptOptions) => {
    return new Promise<T>((resolve) => {
      // 열려 있던 모달은 취소 처리 후 새로 연다
      const prev = activeRef.current;
      if (prev) prev.resolve(prev.mode === 'prompt' ? null : prev.mode === 'alert' ? undefined : false);
      const next: Active = { mode, options, resolve: resolve as (value: unknown) => void };
      activeRef.current = next;
      seq.current += 1;
      setActive(next);
    });
  }, []);

  const api: DialogApi = {
    confirm: (input) => open<boolean>('confirm', toOptions(input)),
    alert: (input) => open<void>('alert', toOptions(input)),
    prompt: (input) => open<string | null>('prompt', toOptions(input)),
  };

  const close = (value: unknown) => {
    activeRef.current?.resolve(value);
    activeRef.current = undefined;
    setActive(undefined);
  };

  return (
    <DialogContext.Provider value={api}>
      {children}
      {active && <DialogBox key={seq.current} active={active} onClose={close} />}
    </DialogContext.Provider>
  );
}

function DialogBox({ active, onClose }: { active: Active; onClose: (value: unknown) => void }) {
  const { mode, options } = active;
  const [text, setText] = useState('');
  const cancelValue = mode === 'prompt' ? null : mode === 'alert' ? undefined : false;
  const okValue = mode === 'prompt' ? text.trim() : mode === 'alert' ? undefined : true;
  const okDisabled = mode === 'prompt' && !!options.required && !text.trim();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4">
      <Card className="w-full max-w-sm space-y-4">
        <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
          <h2 className="font-bold">{options.title ?? (mode === 'alert' ? '알림' : '확인')}</h2>
          <p className="whitespace-pre-wrap text-sm text-slate-600">{options.message}</p>
          {mode === 'prompt' && (
            <Input autoFocus placeholder={options.placeholder} value={text} onChange={(e) => setText(e.target.value)} />
          )}
          <div className="flex justify-end gap-2">
            {mode !== 'alert' && (
              <Button variant="ghost" onClick={() => onClose(cancelValue)}>
                {options.cancelText ?? '취소'}
              </Button>
            )}
            <Button variant={options.danger ? 'danger' : 'primary'} disabled={okDisabled} onClick={() => onClose(okValue)}>
              {options.confirmText ?? '확인'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

/** 사용: const { confirm, alert, prompt } = useDialog(); if (await confirm({ message: '...', danger: true })) ... */
export function useDialog() {
  return useContext(DialogContext);
}
