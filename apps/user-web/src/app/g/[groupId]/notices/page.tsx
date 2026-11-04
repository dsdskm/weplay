'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { SYSTEM_NOTICE_LEVELS } from '@weplay/shared';
import type { Attachment } from '@weplay/shared';
import { AttachmentPicker } from '@/components/attachments';
import { Avatar, Badge, Button, Card, cn, Empty, ErrorText, Input } from '@/components/ui';
import { Modal } from '@/components/modal';
import { Pager } from '@/components/pager';
import { Tabs } from '@/components/tabs';
import { api, errorMessage, uploadAttachment } from '@/lib/api';
import { pagesOf, timeAgo } from '@/lib/format';
import { useGroupId } from '@/lib/hooks';
import type { Paginated } from '@/lib/types';

interface NoticeItem {
  id: string;
  title: string;
  excerpt: string;
  teamName: string | null;
  pinned: boolean;
  important: boolean;
  read: boolean;
  readCount: number;
  author: { name: string; avatarUrl: string | null } | null;
  createdAt: string;
}
interface SystemItem {
  id: string;
  title: string;
  body: string;
  level: string;
  pinned: boolean;
  createdAt: string;
}

/** 공지사항: 그룹·팀 공지와 시스템 공지 */
export default function NoticesPage() {
  const groupId = useGroupId();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'group' | 'system'>('group');
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [writing, setWriting] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', teamId: '', pinned: false, important: false });
  const [error, setError] = useState<string>();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);

  const { data } = useQuery({
    queryKey: ['group', groupId, 'notices', page, q],
    queryFn: () => api<Paginated<NoticeItem> & { unread: number; canWrite: boolean; teams: { id: string; name: string }[] }>(`/groups/${groupId}/notices?page=${page}&pageSize=10${q ? `&q=${encodeURIComponent(q)}` : ''}`),
    enabled: tab === 'group',
  });
  const { data: system } = useQuery({
    queryKey: ['system-notices', page],
    queryFn: () => api<Paginated<SystemItem>>(`/system-notices?page=${page}&pageSize=10`),
    enabled: tab === 'system',
  });

  const create = useMutation({
    mutationFn: () => api(`/groups/${groupId}/notices`, { body: { ...form, title: form.title.trim(), body: form.body.trim(), teamId: form.teamId || null, attachments } }),
    onSuccess: () => {
      setWriting(false);
      setForm({ title: '', body: '', teamId: '', pinned: false, important: false });
      setAttachments([]);
      setError(undefined);
      qc.invalidateQueries({ queryKey: ['group', groupId, 'notices'] });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const level = (k: string) => SYSTEM_NOTICE_LEVELS.find((l) => l.key === k);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">공지사항</h1>
        {tab === 'group' && data?.canWrite && <Button onClick={() => setWriting(true)}>공지 쓰기</Button>}
      </div>
      <Tabs
        value={tab}
        onChange={(v) => {
          setTab(v);
          setPage(1);
        }}
        items={[
          { key: 'group', label: '그룹 공지', count: data?.unread || undefined },
          { key: 'system', label: '서비스 공지' },
        ]}
      />

      {tab === 'group' && (
        <>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setQ(search.trim());
              setPage(1);
            }}
          >
            <Input placeholder="제목 검색" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Button type="submit" variant="secondary">
              검색
            </Button>
          </form>
          {!data ? (
            <p className="text-slate-400">불러오는 중…</p>
          ) : data.items.length === 0 ? (
            <Empty>공지가 없어요.</Empty>
          ) : (
            <div className="space-y-2">
              {data.items.map((n, i) => (
                <Link key={n.id} href={`/g/${groupId}/notices/${n.id}`} className="wp-pop-in block" style={{ animationDelay: `${i * 30}ms` }}>
                  <Card className={cn('transition hover:-translate-y-0.5 hover:shadow-md', n.important && 'ring-2 ring-rose-200', !n.read && 'bg-brand-50/40')}>
                    <div className="flex items-start gap-3">
                      {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-1.5 font-bold">
                          {n.pinned && <Badge tone="amber">📌 고정</Badge>}
                          {n.important && <Badge tone="rose">중요</Badge>}
                          {n.teamName && <Badge tone="brand">{n.teamName} 팀</Badge>}
                          <span className="min-w-0 truncate">{n.title}</span>
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-500">{n.excerpt}</p>
                        <p className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                          {n.author && <Avatar name={n.author.name} url={n.author.avatarUrl} size={18} />}
                          {n.author?.name} · {timeAgo(n.createdAt)} · 읽음 {n.readCount}
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
          {data && <Pager page={page} pages={pagesOf(data.total, data.pageSize)} setPage={setPage} total={data.total} />}
        </>
      )}

      {tab === 'system' && (
        <>
          {!system ? (
            <p className="text-slate-400">불러오는 중…</p>
          ) : system.items.length === 0 ? (
            <Empty>서비스 공지가 없어요.</Empty>
          ) : (
            <div className="space-y-2">
              {system.items.map((n) => (
                <Link key={n.id} href={`/system-notices/${n.id}`} className="block">
                  <Card className="transition hover:shadow-md">
                    <p className="flex items-center gap-2 font-bold">
                      <span>{level(n.level)?.icon}</span>
                      <Badge tone={n.level === 'URGENT' ? 'rose' : n.level === 'MAINTENANCE' ? 'amber' : 'brand'}>{level(n.level)?.name}</Badge>
                      <span className="min-w-0 truncate">{n.title}</span>
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">{n.body}</p>
                    <p className="mt-1 text-xs text-slate-400">{timeAgo(n.createdAt)}</p>
                  </Card>
                </Link>
              ))}
            </div>
          )}
          {system && <Pager page={page} pages={pagesOf(system.total, system.pageSize)} setPage={setPage} total={system.total} />}
        </>
      )}

      <Modal
        open={writing}
        onClose={() => { if (!uploading && !create.isPending) setWriting(false); }}
        title="공지 쓰기"
        footer={
          <>
            <Button variant="ghost" disabled={uploading || create.isPending} onClick={() => setWriting(false)}>
              취소
            </Button>
            <Button onClick={() => create.mutate()} disabled={!form.title.trim() || !form.body.trim() || create.isPending || uploading}>
              올리기
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <ErrorText>{error}</ErrorText>
          <select className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })}>
            <option value="">그룹 전체 공지</option>
            {data?.teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} 팀 공지
              </option>
            ))}
          </select>
          <Input placeholder="제목" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={100} />
          <textarea className="min-h-48 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="내용" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          <AttachmentPicker value={attachments} onChange={setAttachments} upload={(file) => uploadAttachment(groupId, file)} onUploadingChange={setUploading} disabled={create.isPending} />
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} /> 맨 위 고정
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.important} onChange={(e) => setForm({ ...form, important: e.target.checked })} /> 중요 표시
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
}
