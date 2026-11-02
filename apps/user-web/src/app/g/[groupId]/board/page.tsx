'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { Badge, Button, Card, Empty, ErrorText, Input } from '@/components/ui';
import { Pager } from '@/components/pager';
import { api, errorMessage } from '@/lib/api';
import { useGroupId } from '@/lib/hooks';
import type { Paginated } from '@/lib/types';

interface Boards {
  enabled: boolean;
  anonymousAllowed: boolean;
  boards: { teamId: string | null; name: string; postCount: number }[];
}
interface Post {
  id: string;
  title: string;
  excerpt: string;
  author: { name: string } | null;
  pinned: boolean;
  commentCount: number;
  createdAt: string;
}

/** 자유 게시판: 그룹 전체 + 팀별 게시판 */
export default function BoardPage() {
  const groupId = useGroupId();
  const qc = useQueryClient();
  const [board, setBoard] = useState<string>('group');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [writing, setWriting] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [error, setError] = useState<string>();

  const { data: boards } = useQuery({ queryKey: ['group', groupId, 'board', 'boards'], queryFn: () => api<Boards>(`/groups/${groupId}/board/boards`) });
  const current = boards?.boards.find((b) => (b.teamId ?? 'group') === board) ?? boards?.boards[0];
  const key = current?.teamId ?? 'group';

  const { data: posts } = useQuery({
    queryKey: ['group', groupId, 'board', 'posts', key, q, page],
    queryFn: () => api<Paginated<Post>>(`/groups/${groupId}/board/posts?teamId=${key}&page=${page}&pageSize=10${q ? `&q=${encodeURIComponent(q)}` : ''}`),
    enabled: !!current,
  });

  const create = useMutation({
    mutationFn: () => api(`/groups/${groupId}/board/posts`, { body: { teamId: current?.teamId ?? null, title: title.trim(), body: body.trim(), anonymous } }),
    onSuccess: () => {
      setError(undefined);
      setWriting(false);
      setTitle('');
      setBody('');
      setAnonymous(false);
      qc.invalidateQueries({ queryKey: ['group', groupId, 'board'] });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  if (!boards) return <p className="text-slate-400">불러오는 중…</p>;
  if (!boards.enabled) return <Card>이 기능은 아직 그룹에서 사용할 수 없어요.</Card>;
  if (!current) return <Empty>사용할 수 있는 게시판이 없어요.</Empty>;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">자유 게시판</h1>
        <Button onClick={() => setWriting((v) => !v)}>{writing ? '닫기' : '글쓰기'}</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {boards.boards.map((b) => (
          <button
            key={b.teamId ?? 'group'}
            type="button"
            onClick={() => {
              setBoard(b.teamId ?? 'group');
              setPage(1);
            }}
            className={(b.teamId ?? 'group') === key ? 'rounded-full bg-slate-900 px-4 py-1.5 text-sm text-white' : 'rounded-full bg-white px-4 py-1.5 text-sm text-slate-600 ring-1 ring-slate-200'}
          >
            {b.name} <span className="opacity-60">{b.postCount}</span>
          </button>
        ))}
      </div>
      <ErrorText>{error}</ErrorText>

      {writing && (
        <Card className="space-y-3">
          <p className="text-xs text-slate-500">{current.name} 게시판에 글을 써요</p>
          <Input placeholder="제목" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
          <textarea className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" rows={6} placeholder="내용" value={body} onChange={(e) => setBody(e.target.value)} />
          <div className="flex items-center justify-between">
            {boards.anonymousAllowed ? (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} /> 익명으로 쓰기
              </label>
            ) : (
              <span />
            )}
            <Button onClick={() => create.mutate()} disabled={!title.trim() || !body.trim() || create.isPending}>
              등록
            </Button>
          </div>
        </Card>
      )}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQ(search.trim());
          setPage(1);
        }}
      >
        <Input placeholder="제목·내용 검색" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button type="submit" variant="secondary">
          검색
        </Button>
      </form>

      {!posts ? (
        <p className="text-slate-400">불러오는 중…</p>
      ) : posts.items.length === 0 ? (
        <Empty>글이 없어요. 첫 글을 남겨 보세요!</Empty>
      ) : (
        <Card className="divide-y divide-slate-100 p-0">
          {posts.items.map((p) => (
            <Link key={p.id} href={`/g/${groupId}/board/${p.id}`} className="block px-5 py-3 hover:bg-slate-50">
              <p className="flex items-center gap-2 font-semibold">
                {p.pinned && <Badge tone="amber">공지</Badge>}
                <span className="truncate">{p.title}</span>
                {p.commentCount > 0 && <span className="text-xs text-brand-600">[{p.commentCount}]</span>}
              </p>
              <p className="truncate text-sm text-slate-500">{p.excerpt}</p>
              <p className="text-xs text-slate-400">
                {p.author ? p.author.name : '익명'} · {new Date(p.createdAt).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })}
              </p>
            </Link>
          ))}
        </Card>
      )}
      {posts && <Pager page={page} pages={Math.max(1, Math.ceil(posts.total / posts.pageSize))} setPage={setPage} total={posts.total} />}
    </div>
  );
}
