'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Badge } from '@/components/ui';
import { api } from '@/lib/api';
import type { Member, Paged } from '@/lib/types';

/** 구성원 선택 드롭다운: 입력한 이름·이메일로 필터링해서 고름 */
export function MemberCombobox({
  groupId,
  value,
  onChange,
  excludeId,
  placeholder = '구성원 선택',
  clearable = false,
}: {
  groupId: string;
  value: Member | null;
  onChange: (member: Member | null) => void;
  excludeId?: string;
  placeholder?: string;
  clearable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const { data } = useQuery({
    queryKey: ['group', groupId, 'member-combobox', q],
    queryFn: () => {
      const params = new URLSearchParams({ pageSize: '20' });
      if (q.trim()) params.set('q', q.trim());
      return api<Paged<Member>>(`/groups/${groupId}/members?${params.toString()}`);
    },
    enabled: open,
  });

  const pick = (m: Member) => {
    if (m.id === excludeId) return;
    onChange(m);
    setOpen(false);
    setQ('');
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-1">
        <input
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          placeholder={placeholder}
          value={open ? q : (value?.name ?? '')}
          onFocus={() => {
            setOpen(true);
            setQ('');
          }}
          onBlur={() => setOpen(false)}
          onChange={(e) => {
            setOpen(true);
            setQ(e.target.value);
          }}
        />
        {clearable && value && !open && (
          <button type="button" className="px-2 text-slate-400 hover:text-slate-600" onMouseDown={(e) => e.preventDefault()} onClick={() => onChange(null)}>
            ×
          </button>
        )}
      </div>

      {open && (
        <ul className="absolute z-40 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-lg">
          {data?.items.map((m) => {
            const isSelf = m.id === excludeId;
            return (
              <li
                key={m.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(m);
                }}
                className={`flex items-center gap-2 px-3 py-2 ${isSelf ? 'cursor-not-allowed text-slate-300' : 'cursor-pointer hover:bg-slate-50'}`}
              >
                <span className="font-semibold">{m.name}</span>
                {isSelf && <Badge tone="slate">본인</Badge>}
                <span className="min-w-0 flex-1 truncate text-xs text-slate-400">
                  {m.teams.map((t) => t.name).join(', ') || '팀 없음'} · {m.email}
                </span>
              </li>
            );
          })}
          {data && data.items.length === 0 && <li className="px-3 py-2 text-slate-400">검색 결과가 없어요.</li>}
        </ul>
      )}
    </div>
  );
}
