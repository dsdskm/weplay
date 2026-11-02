'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Avatar, cn, Input } from './ui';
import { api } from '@/lib/api';
import type { Member, Paged } from '@/lib/types';

/** 여러 명 고르기 + 순서 정하기 (순번 업무·턴제 게임 등). teamId 가 있으면 그 팀원만 */
export function MemberPicker({ groupId, teamId, value, onChange, ordered = true, max }: { groupId: string; teamId?: string | null; value: string[]; onChange: (ids: string[]) => void; ordered?: boolean; max?: number }) {
  const [q, setQ] = useState('');
  const { data } = useQuery({ queryKey: ['group', groupId, 'members', 'picker'], queryFn: () => api<Paged<Member>>(`/groups/${groupId}/members?pageSize=100`) });
  const all = useMemo(() => (data?.items ?? []).filter((m) => !teamId || m.teams.some((t) => t.id === teamId)), [data, teamId]);
  const byId = new Map(all.map((m) => [m.id, m]));
  const shown = all.filter((m) => !q.trim() || m.name.includes(q.trim()) || (m.email ?? '').includes(q.trim()));
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : max && value.length >= max ? value : [...value, id]);
  const move = (i: number, d: number) => {
    const next = [...value];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((id, i) => {
            const m = byId.get(id);
            return (
              <span key={id} className="wp-pop-in flex items-center gap-1 rounded-full bg-brand-50 py-0.5 pl-1 pr-1 text-xs font-semibold text-brand-700">
                {ordered && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] text-white">{i + 1}</span>}
                {m?.name ?? '…'}
                {ordered && (
                  <>
                    <button type="button" aria-label="앞으로" className="px-0.5 opacity-60 hover:opacity-100" onClick={() => move(i, -1)}>
                      ◀
                    </button>
                    <button type="button" aria-label="뒤로" className="px-0.5 opacity-60 hover:opacity-100" onClick={() => move(i, 1)}>
                      ▶
                    </button>
                  </>
                )}
                <button type="button" aria-label="빼기" className="px-1 opacity-60 hover:opacity-100" onClick={() => toggle(id)}>
                  ✕
                </button>
              </span>
            );
          })}
        </div>
      )}
      <div className="flex gap-2">
        <Input placeholder="이름·이메일 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="button" className="shrink-0 rounded-xl px-3 text-xs font-semibold text-brand-600 hover:bg-brand-50" onClick={() => onChange(all.map((m) => m.id).slice(0, max ?? all.length))}>
          모두
        </button>
        {value.length > 0 && (
          <button type="button" className="shrink-0 rounded-xl px-3 text-xs text-slate-500 hover:bg-slate-100" onClick={() => onChange([])}>
            비우기
          </button>
        )}
      </div>
      <div className="max-h-52 divide-y divide-slate-50 overflow-y-auto rounded-2xl ring-1 ring-slate-100">
        {shown.map((m) => {
          const on = value.includes(m.id);
          return (
            <button key={m.id} type="button" onClick={() => toggle(m.id)} className={cn('flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition', on ? 'bg-brand-50' : 'hover:bg-slate-50')}>
              <span className={cn('flex h-5 w-5 items-center justify-center rounded-md border text-[11px] transition', on ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300')}>{on ? '✓' : ''}</span>
              <Avatar name={m.name} url={m.avatarUrl} size={24} />
              <span className="min-w-0 flex-1 truncate">{m.name}</span>
              <span className="truncate text-xs text-slate-400">{m.teams.map((t) => t.name).join(', ')}</span>
            </button>
          );
        })}
        {shown.length === 0 && <p className="p-4 text-center text-xs text-slate-400">구성원이 없어요</p>}
      </div>
    </div>
  );
}
