'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge, Button, Card, ErrorText, Input } from '@/components/ui';
import { Pager } from '@/components/pager';
import { useDialog } from '@/components/confirm-dialog';
import { api, errorMessage } from '@/lib/api';
import { useGroupId } from '@/lib/hooks';
import type { Paginated } from '@/lib/types';

interface PostDetail {
  id: string;
  title: string;
  body: string;
  author: { name: string } | null;
  pinned: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canModerate: boolean;
  commentsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}
interface Comment {
  id: string;
  body: string;
  author: { name: string };
  createdAt: string;
  canEdit: boolean;
  canDelete: boolean;
}

/** 게시글 상세 + 댓글 */
export default function BoardPostPage() {
  const groupId = useGroupId();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { confirm } = useDialog();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [text, setText] = useState('');
  const [editId, setEditId] = useState<string>();
  const [editText, setEditText] = useState('');
  const [error, setError] = useState<string>();

  const base = `/groups/${groupId}/board/posts/${id}`;
  const { data: post } = useQuery({ queryKey: ['group', groupId, 'board', 'post', id], queryFn: () => api<PostDetail>(base) });
  const { data: comments } = useQuery({
    queryKey: ['group', groupId, 'board', 'comments', id, page],
    queryFn: () => api<Paginated<Comment>>(`${base}/comments?page=${page}&pageSize=10`),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['group', groupId, 'board'] });
  const onError = (e: unknown) => setError(errorMessage(e));
  const ok = () => {
    setError(undefined);
    refresh();
  };

  const update = useMutation({
    mutationFn: () => api(base, { method: 'PATCH', body: { title: title.trim(), body: body.trim() } }),
    onSuccess: () => {
      setEditing(false);
      ok();
    },
    onError,
  });
  const remove = useMutation({
    mutationFn: () => api(base, { method: 'DELETE' }),
    onSuccess: () => {
      refresh();
      router.replace(`/g/${groupId}/board`);
    },
    onError,
  });
  const pin = useMutation({ mutationFn: (pinned: boolean) => api(`${base}/pin`, { method: 'PUT', body: { pinned } }), onSuccess: ok, onError });
  const hide = useMutation({
    mutationFn: () => api(`${base}/hide`, { method: 'PUT', body: {} }),
    onSuccess: () => {
      refresh();
      router.replace(`/g/${groupId}/board`);
    },
    onError,
  });
  const addComment = useMutation({
    mutationFn: () => api(`${base}/comments`, { body: { body: text.trim() } }),
    onSuccess: () => {
      setText('');
      ok();
    },
    onError,
  });
  const editComment = useMutation({
    mutationFn: () => api(`${base}/comments/${editId}`, { method: 'PATCH', body: { body: editText.trim() } }),
    onSuccess: () => {
      setEditId(undefined);
      ok();
    },
    onError,
  });
  const delComment = useMutation({ mutationFn: (cid: string) => api(`${base}/comments/${cid}`, { method: 'DELETE' }), onSuccess: ok, onError });

  if (!post) return <p className="text-slate-400">불러오는 중…</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href={`/g/${groupId}/board`} className="text-sm text-slate-500">
        ← 자유 게시판
      </Link>
      <ErrorText>{error}</ErrorText>
      <Card className="space-y-3">
        {editing ? (
          <>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
            <textarea className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" rows={8} value={body} onChange={(e) => setBody(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(false)}>
                취소
              </Button>
              <Button onClick={() => update.mutate()} disabled={!title.trim() || !body.trim()}>
                저장
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              {post.pinned && <Badge tone="amber">공지</Badge>}
              <h1 className="text-xl font-black">{post.title}</h1>
            </div>
            <p className="text-xs text-slate-500">
              {post.author ? post.author.name : '익명'} · {new Date(post.createdAt).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })}
              {post.updatedAt !== post.createdAt && ' (수정됨)'}
            </p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{post.body}</p>
            <div className="flex flex-wrap justify-end gap-2">
              {post.canModerate && (
                <>
                  <Button variant="ghost" onClick={() => pin.mutate(!post.pinned)}>
                    {post.pinned ? '공지 해제' : '공지로 고정'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      if (await confirm({ message: '이 글을 숨길까요? 목록에서 보이지 않게 돼요.', danger: true })) hide.mutate();
                    }}
                  >
                    숨기기
                  </Button>
                </>
              )}
              {post.canEdit && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setTitle(post.title);
                    setBody(post.body);
                    setEditing(true);
                  }}
                >
                  수정
                </Button>
              )}
              {post.canDelete && (
                <Button
                  variant="danger"
                  onClick={async () => {
                    if (await confirm({ message: '글과 댓글을 삭제할까요?', danger: true })) remove.mutate();
                  }}
                >
                  삭제
                </Button>
              )}
            </div>
          </>
        )}
      </Card>

      {post.commentsEnabled && (
        <Card className="space-y-3">
          <h2 className="font-bold">댓글 {comments?.total ?? 0}</h2>
          {comments?.items.map((c) => (
            <div key={c.id} className="space-y-1 border-b border-slate-100 pb-2 text-sm last:border-0">
              <p className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">{c.author.name}</span>
                {new Date(c.createdAt).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })}
                <span className="ml-auto flex gap-2">
                  {c.canEdit && editId !== c.id && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditId(c.id);
                        setEditText(c.body);
                      }}
                    >
                      수정
                    </button>
                  )}
                  {c.canDelete && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (await confirm({ message: '댓글을 삭제할까요?', danger: true })) delComment.mutate(c.id);
                      }}
                    >
                      삭제
                    </button>
                  )}
                </span>
              </p>
              {editId === c.id ? (
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (editText.trim() && !editComment.isPending) editComment.mutate();
                  }}
                >
                  <Input value={editText} onChange={(e) => setEditText(e.target.value)} maxLength={1000} />
                  <Button type="submit">저장</Button>
                  <Button type="button" variant="ghost" onClick={() => setEditId(undefined)}>
                    취소
                  </Button>
                </form>
              ) : (
                <p className="whitespace-pre-wrap">{c.body}</p>
              )}
            </div>
          ))}
          {comments && <Pager page={page} pages={Math.max(1, Math.ceil(comments.total / comments.pageSize))} setPage={setPage} total={comments.total} />}
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim() && !addComment.isPending) addComment.mutate();
            }}
          >
            <Input placeholder="댓글을 입력하세요" value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} />
            <Button type="submit" disabled={!text.trim() || addComment.isPending}>
              등록
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
