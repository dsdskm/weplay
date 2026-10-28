'use client';

import { useMutation } from '@tanstack/react-query';
import { formatJoinCode, JOIN_CODE_LENGTH, normalizeJoinCode } from '@weplay/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import type { JoinResult, LookupResult } from '@/lib/types';
import { CodeInput } from './code-input';
import { Badge, Button, Card, ErrorText, Input } from './ui';

const MANUAL = '__manual__';

/** 그룹 코드 → 공개 팀 드롭다운 선택 (마지막: 직접 입력) → 가입 요청 */
export function JoinForm({ onDone, teamOnly }: { onDone: (r: JoinResult) => void; teamOnly?: boolean }) {
  const [code, setCode] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [manual, setManual] = useState(false);
  const [items, setItems] = useState<LookupResult[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string>();
  const qc = useQueryClient();

  const group = items.find((i) => i.kind === 'GROUP');
  const codeTeamIds = new Set(items.flatMap((i) => (i.kind === 'TEAM' && i.team ? [i.team.id] : [])));
  const publicTeams = group?.publicTeams ?? [];
  const pickable = publicTeams.filter((g) => (g.joinStatus === 'NONE' || g.joinStatus === 'REJECTED') && !picked.includes(g.id) && !codeTeamIds.has(g.id));
  const pendingTeams = publicTeams.filter((g) => g.joinStatus === 'PENDING');
  // 승인 대기 중인 항목은 제외하고 요청
  const actionableItems = items.filter((i) => i.joinStatus === 'NONE' || i.joinStatus === 'REJECTED');
  const canSubmit = actionableItems.length > 0 || picked.length > 0;
  const pickedTeams = publicTeams.filter((g) => picked.includes(g.id));

  const lookup = useMutation({
    mutationFn: ({ raw }: { raw: string; src: 'top' | 'bottom' }) => api<LookupResult>('/join/lookup', { body: { code: normalizeJoinCode(raw) } }),
    onSuccess: (r, { src }) => {
      setError(undefined);
      if (teamOnly && r.kind !== 'TEAM') return setError('팀 코드를 입력해주세요');
      if (!teamOnly && src === 'top' && !group && r.kind === 'TEAM') return setError('그룹 코드를 먼저 입력하세요');
      if (src === 'bottom' && r.kind === 'GROUP') return setError('그룹 코드는 위에서 입력하세요');
      if (items[0] && items[0].group.id !== r.group.id) return setError('같은 그룹의 코드만 함께 입력할 수 있습니다');
      if (items.some((i) => i.code === r.code)) return setError('이미 추가된 코드입니다');
      if (r.joinStatus === 'APPROVED') return setError(r.kind === 'TEAM' ? '이미 가입된 팀입니다' : '이미 가입된 그룹입니다');
      if (r.kind === 'GROUP' && items.some((i) => i.kind === 'GROUP')) return setError('그룹 코드는 하나만 입력합니다');
      setItems((prev) => [...prev, r]);
      if (src === 'top') setCode('');
      else {
        setTeamCode('');
        setManual(false);
      }
    },
    onError: (e) => setError(errorMessage(e)),
  });

  /** 승인 대기 요청 취소 (요청에 포함된 팀이 함께 취소됨) */
  const cancel = useMutation({
    mutationFn: ({ requestId }: { requestId: string; code: string }) => api(`/me/requests/${requestId}`, { method: 'DELETE' }),
    onSuccess: (_, { code }) => {
      setError(undefined);
      setItems((prev) => prev.filter((x) => x.code !== code));
      qc.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const submit = useMutation({
    mutationFn: () => {
      const groupCode = group && (group.joinStatus === 'NONE' || group.joinStatus === 'REJECTED') ? group.code : undefined;
      const teamCodes = actionableItems.filter((i) => i.kind === 'TEAM').map((i) => i.code);
      return api<JoinResult>('/join/requests', {
        body: { groupCode, teamCodes, teamIds: picked, message: message || undefined },
      });
    },
    onSuccess: onDone,
    onError: (e) => setError(errorMessage(e)),
  });

  const checkLength = (v: string) => v.length === JOIN_CODE_LENGTH || setError(`${JOIN_CODE_LENGTH}자리 코드를 모두 입력해주세요`);

  return (
    <div className="space-y-4">
      {!group && (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (checkLength(code)) lookup.mutate({ raw: code, src: 'top' });
          }}
        >
          <p className="text-sm font-semibold text-slate-700">{teamOnly ? '팀 코드' : '그룹 코드'}</p>
          <CodeInput value={code} onChange={setCode} />
          <Button type="submit" variant="secondary" className="w-full" disabled={lookup.isPending}>
            {teamOnly ? '팀 코드 확인' : '그룹 코드 확인'}
          </Button>
        </form>
      )}

      {items.length > 0 && (
        <Card className="space-y-4 bg-brand-50 ring-brand-100">
          {group && (
            <div>
              <p className="text-xs text-brand-700">가입할 그룹</p>
              <p className="text-lg font-bold">{group.group.name}</p>
              {group.group.description && <p className="text-sm text-slate-600">{group.group.description}</p>}
            </div>
          )}

          <ul className="space-y-1">
            {items.map((i) => (
              <li key={i.code} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm">
                <span className="flex items-center gap-2">
                  <Badge tone={i.kind === 'GROUP' ? 'brand' : 'amber'}>{i.kind === 'GROUP' ? '그룹' : '팀'}</Badge>
                  {i.kind === 'TEAM' ? i.team?.name : i.group.name}
                  <span className="font-mono text-xs text-slate-400">{formatJoinCode(i.code)}</span>
                  {i.joinStatus === 'PENDING' && <Badge tone="amber">승인 대기 중</Badge>}
                  {i.joinStatus === 'REJECTED' && <Badge tone="rose">거절됨{i.rejectReason ? `: ${i.rejectReason}` : ''}</Badge>}
                </span>
                {i.joinStatus === 'PENDING' && i.pendingRequestId ? (
                  <button
                    className="text-xs text-rose-600 hover:underline disabled:opacity-50"
                    disabled={cancel.isPending}
                    onClick={() => cancel.mutate({ requestId: i.pendingRequestId!, code: i.code })}
                  >
                    요청 취소
                  </button>
                ) : (
                <button
                  className="text-xs text-slate-400 hover:text-rose-600"
                  onClick={() => {
                    setItems((p) => p.filter((x) => x.code !== i.code));
                    if (i.kind === 'GROUP') setPicked([]);
                  }}
                >
                  삭제
                </button>
                )}
              </li>
            ))}
          </ul>

          {group && !teamOnly && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700">팀 선택</p>
              {pickedTeams.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {pickedTeams.map((g) => (
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
              {pendingTeams.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {pendingTeams.map((g) => (
                    <Badge key={g.id} tone="amber">
                      {g.name} · 승인 대기 중
                    </Badge>
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
                  {pickable.length || publicTeams.length ? '팀을 선택하세요' : '공개 팀이 없습니다'}
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
                    if (checkLength(teamCode)) lookup.mutate({ raw: teamCode, src: 'bottom' });
                  }}
                >
                  <p className="text-xs text-slate-500">비공개 팀은 관리자에게 받은 팀 코드를 입력하세요.</p>
                  <CodeInput value={teamCode} onChange={setTeamCode} />
                  <div className="flex gap-2">
                    <Button type="button" variant="ghost" className="flex-1" onClick={() => setManual(false)}>
                      취소
                    </Button>
                    <Button type="submit" variant="secondary" className="flex-1" disabled={lookup.isPending}>
                      팀 코드 추가
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          <Input placeholder="관리자에게 남길 메시지 (선택)" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={300} />
          <Button className="w-full" onClick={() => submit.mutate()} disabled={submit.isPending || !canSubmit}>
            가입 요청 보내기
          </Button>
        </Card>
      )}
      <ErrorText>{error}</ErrorText>
    </div>
  );
}
