'use client';

import { useMutation } from '@tanstack/react-query';
import { formatJoinCode, JOIN_CODE_LENGTH, normalizeJoinCode } from '@weplay/shared';
import { useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import type { JoinResult, LookupResult } from '@/lib/types';
import { CodeInput } from './code-input';
import { Badge, Button, Card, ErrorText, Input } from './ui';

const MANUAL = '__manual__';

/** 회사 코드 → 공개 그룹 드롭다운 선택 (마지막: 직접 입력) → 가입 요청 */
export function JoinForm({ onDone, groupOnly }: { onDone: (r: JoinResult) => void; groupOnly?: boolean }) {
  const [code, setCode] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const [manual, setManual] = useState(false);
  const [items, setItems] = useState<LookupResult[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string>();

  const company = items.find((i) => i.kind === 'COMPANY');
  const codeGroupIds = new Set(items.flatMap((i) => (i.kind === 'GROUP' && i.group ? [i.group.id] : [])));
  const publicGroups = company?.publicGroups ?? [];
  const pickable = publicGroups.filter((g) => !picked.includes(g.id) && !codeGroupIds.has(g.id));
  const pickedGroups = publicGroups.filter((g) => picked.includes(g.id));

  const lookup = useMutation({
    mutationFn: ({ raw }: { raw: string; src: 'top' | 'bottom' }) => api<LookupResult>('/join/lookup', { body: { code: normalizeJoinCode(raw) } }),
    onSuccess: (r, { src }) => {
      setError(undefined);
      if (groupOnly && r.kind !== 'GROUP') return setError('그룹 코드를 입력해주세요');
      if (!groupOnly && src === 'top' && !company && r.kind === 'GROUP') return setError('회사 코드를 먼저 입력하세요');
      if (src === 'bottom' && r.kind === 'COMPANY') return setError('회사 코드는 위에서 입력하세요');
      if (items[0] && items[0].company.id !== r.company.id) return setError('같은 회사의 코드만 함께 입력할 수 있습니다');
      if (items.some((i) => i.code === r.code)) return setError('이미 추가된 코드입니다');
      if (r.kind === 'COMPANY' && items.some((i) => i.kind === 'COMPANY')) return setError('회사 코드는 하나만 입력합니다');
      setItems((prev) => [...prev, r]);
      if (src === 'top') setCode('');
      else {
        setGroupCode('');
        setManual(false);
      }
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const submit = useMutation({
    mutationFn: () => {
      const companyCode = company?.code;
      const groupCodes = items.filter((i) => i.kind === 'GROUP').map((i) => i.code);
      return api<JoinResult>('/join/requests', {
        body: { companyCode, groupCodes, groupIds: picked, message: message || undefined },
      });
    },
    onSuccess: onDone,
    onError: (e) => setError(errorMessage(e)),
  });

  const checkLength = (v: string) => v.length === JOIN_CODE_LENGTH || setError(`${JOIN_CODE_LENGTH}자리 코드를 모두 입력해주세요`);

  return (
    <div className="space-y-4">
      {!company && (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (checkLength(code)) lookup.mutate({ raw: code, src: 'top' });
          }}
        >
          <p className="text-sm font-semibold text-slate-700">{groupOnly ? '그룹 코드' : '회사 코드'}</p>
          <CodeInput value={code} onChange={setCode} />
          <Button type="submit" variant="secondary" className="w-full" disabled={lookup.isPending}>
            {groupOnly ? '그룹 코드 확인' : '회사 코드 확인'}
          </Button>
        </form>
      )}

      {items.length > 0 && (
        <Card className="space-y-4 bg-brand-50 ring-brand-100">
          {company && (
            <div>
              <p className="text-xs text-brand-700">가입할 회사</p>
              <p className="text-lg font-bold">{company.company.name}</p>
              {company.company.description && <p className="text-sm text-slate-600">{company.company.description}</p>}
            </div>
          )}

          <ul className="space-y-1">
            {items.map((i) => (
              <li key={i.code} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm">
                <span className="flex items-center gap-2">
                  <Badge tone={i.kind === 'COMPANY' ? 'brand' : 'amber'}>{i.kind === 'COMPANY' ? '회사' : '그룹'}</Badge>
                  {i.kind === 'GROUP' ? i.group?.name : i.company.name}
                  <span className="font-mono text-xs text-slate-400">{formatJoinCode(i.code)}</span>
                </span>
                <button
                  className="text-xs text-slate-400 hover:text-rose-600"
                  onClick={() => {
                    setItems((p) => p.filter((x) => x.code !== i.code));
                    if (i.kind === 'COMPANY') setPicked([]);
                  }}
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>

          {company && !groupOnly && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700">그룹 선택</p>
              {pickedGroups.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {pickedGroups.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setPicked((p) => p.filter((x) => x !== g.id))}
                      className="inline-flex items-center gap-1 rounded-full bg-brand-600 px-3 py-1 text-xs font-medium text-white"
                    >
                      {g.name} <span className="opacity-70">×</span>
                    </button>
                  ))}
                </div>
              )}
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                value=""
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === MANUAL) setManual(true);
                  else if (v) setPicked((p) => [...p, v]);
                }}
              >
                <option value="" disabled>
                  {pickable.length || publicGroups.length ? '그룹을 선택하세요' : '공개 그룹이 없습니다'}
                </option>
                {pickable.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} · {g.requireApproval ? '승인 후 가입' : '바로 가입'}
                  </option>
                ))}
                <option value={MANUAL}>직접 입력</option>
              </select>

              {manual && (
                <form
                  className="space-y-2 rounded-xl bg-white p-3 ring-1 ring-slate-200"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (checkLength(groupCode)) lookup.mutate({ raw: groupCode, src: 'bottom' });
                  }}
                >
                  <p className="text-xs text-slate-500">비공개 그룹은 관리자에게 받은 그룹 코드를 입력하세요.</p>
                  <CodeInput value={groupCode} onChange={setGroupCode} />
                  <div className="flex gap-2">
                    <Button type="button" variant="ghost" className="flex-1" onClick={() => setManual(false)}>
                      취소
                    </Button>
                    <Button type="submit" variant="secondary" className="flex-1" disabled={lookup.isPending}>
                      그룹 코드 추가
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          <Input placeholder="관리자에게 남길 메시지 (선택)" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={300} />
          <Button className="w-full" onClick={() => submit.mutate()} disabled={submit.isPending}>
            가입 요청 보내기
          </Button>
        </Card>
      )}
      <ErrorText>{error}</ErrorText>
    </div>
  );
}
