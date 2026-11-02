'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { Avatar, Badge, Button, Card, Empty, ErrorText, Input } from '@/components/ui';
import { MemberCombobox } from '@/components/member-combobox';
import { Pager } from '@/components/pager';
import { api, errorMessage } from '@/lib/api';
import { useGroupId, useMe } from '@/lib/hooks';
import { PAPER_THEMES, themeBg } from '@/lib/paper-theme';
import { ROLLING_TEMPLATES } from '@weplay/shared';
import type { Member, Paginated } from '@/lib/types';

interface PaperItem {
  id: string;
  title: string;
  theme: string;
  target: { id: string; name: string; avatarUrl: string | null };
  open: boolean;
  closeAt: string | null;
  noteCount: number;
}


/** 롤링페이퍼 목록과 새로 만들기 */
export default function RollingPapersPage() {
  const groupId = useGroupId();
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
  const [creating, setCreating] = useState(false);
  const [target, setTarget] = useState<Member | null>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [theme, setTheme] = useState('YELLOW');
  const [closeAt, setCloseAt] = useState('');
  const [error, setError] = useState<string>();

  const { data } = useQuery({
    queryKey: ['group', groupId, 'rolling-papers', status, page],
    queryFn: () =>
      api<Paginated<PaperItem> & { enabled: boolean }>(`/groups/${groupId}/rolling-papers?page=${page}&pageSize=12${status === 'ALL' ? '' : `&status=${status}`}`),
  });

  const create = useMutation({
    mutationFn: () =>
      api<{ id: string }>(`/groups/${groupId}/rolling-papers`, {
        body: { targetUserId: target?.id, title: title.trim(), message: message.trim() || null, theme, closeAt: closeAt ? new Date(closeAt).toISOString() : null },
      }),
    onSuccess: () => {
      setError(undefined);
      setCreating(false);
      setTarget(null);
      setTitle('');
      setMessage('');
      setCloseAt('');
      qc.invalidateQueries({ queryKey: ['group', groupId, 'rolling-papers'] });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  if (!data) return <p className="text-slate-400">불러오는 중…</p>;
  if (!data.enabled) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-2xl font-bold">롤링페이퍼</h1>
        <Card>
          <p className="text-slate-600">이 기능은 아직 그룹에서 사용할 수 없어요.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">롤링페이퍼</h1>
        <Button onClick={() => setCreating((v) => !v)}>{creating ? '닫기' : '새 롤링페이퍼'}</Button>
      </div>
      <ErrorText>{error}</ErrorText>

      {creating && (
        <Card className="space-y-3">
          <h2 className="font-bold">새 롤링페이퍼 만들기</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <MemberCombobox groupId={groupId} value={target} onChange={setTarget} excludeId={undefined} placeholder="누구를 위한 롤링페이퍼인가요?" />
            <Input placeholder="제목 (예: 생일 축하해요!)" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} />
          </div>
          <div className="flex flex-wrap gap-2">
            {ROLLING_TEMPLATES.map((t, i) => (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setTitle(t.title);
                  setMessage(t.message);
                  setTheme(t.theme);
                }}
                style={{ animationDelay: `${i * 50}ms` }}
                className="wp-pop-in rounded-full bg-white px-3 py-1.5 text-xs font-bold ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow active:scale-95"
              >
                {t.icon} {t.name}
              </button>
            ))}
          </div>
          <Input placeholder="한마디 소개 (선택)" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={300} />
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-slate-500">색상</span>
            {PAPER_THEMES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTheme(t.key)}
                className={`rounded-full px-3 py-1 ring-1 ${theme === t.key ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-600 ring-slate-200'}`}
              >
                {t.label}
              </button>
            ))}
            <label className="ml-auto flex items-center gap-2 text-xs text-slate-500">
              마감 (선택)
              <Input type="datetime-local" value={closeAt} onChange={(e) => setCloseAt(e.target.value)} />
            </label>
          </div>
          <Button onClick={() => create.mutate()} disabled={!target || !title.trim() || create.isPending || target?.id === me?.id}>
            만들기
          </Button>
          {target?.id === me?.id && <p className="text-xs text-rose-500">본인의 롤링페이퍼는 다른 사람이 만들어 줘요.</p>}
        </Card>
      )}

      <div className="flex gap-2">
        {(['ALL', 'OPEN', 'CLOSED'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
            className={status === s ? 'rounded-full bg-slate-900 px-4 py-1.5 text-sm text-white' : 'rounded-full bg-white px-4 py-1.5 text-sm text-slate-600 ring-1 ring-slate-200'}
          >
            {s === 'ALL' ? '전체' : s === 'OPEN' ? '진행 중' : '마감'}
          </button>
        ))}
      </div>

      {data.items.length === 0 ? (
        <Empty>아직 롤링페이퍼가 없어요. 첫 번째로 만들어 보세요!</Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((p) => (
            <Link key={p.id} href={`/g/${groupId}/rolling-paper/${p.id}`}>
              <div className={`h-full rounded-2xl bg-gradient-to-br ${themeBg(p.theme)} p-4 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md`}>
                <div className="flex items-center gap-2">
                  <Avatar name={p.target.name} url={p.target.avatarUrl} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-slate-500">{p.target.name}님에게</p>
                    <p className="truncate font-bold text-slate-800">{p.title}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span>📝 {p.noteCount}장</span>
                  <Badge tone={p.open ? 'green' : 'slate'}>{p.open ? '진행 중' : '마감'}</Badge>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      <Pager page={page} pages={Math.max(1, Math.ceil(data.total / data.pageSize))} setPage={setPage} total={data.total} />
    </div>
  );
}
