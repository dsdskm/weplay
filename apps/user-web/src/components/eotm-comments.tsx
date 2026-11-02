'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Avatar, Button, ErrorText, Input } from '@/components/ui';
import { Pager } from '@/components/pager';
import { api, errorMessage } from '@/lib/api';
import type { EotmComment, EotmReason, Paginated } from '@/lib/types';
import { useDialog } from '@/components/confirm-dialog';

const pagesOf = (total: number, size: number) => Math.max(1, Math.ceil(total / size));

/** 선정자 상세: 추천 사유(익명, 내용만)와 댓글을 페이지네이션으로 보여 주고 댓글을 남김 */
export function EotmComments({
  groupId,
  month,
  targetUserId,
  targetName,
}: {
  groupId: string;
  month: string;
  targetUserId: string;
  targetName: string;
}) {
  const { confirm } = useDialog();
  const qc = useQueryClient();
  const [reasonPage, setReasonPage] = useState(1);
  const [commentPage, setCommentPage] = useState(1);
  const [body, setBody] = useState('');
  const [error, setError] = useState<string>();
  const [editing, setEditing] = useState<{ id: string; body: string }>();
  const base = `/groups/${groupId}/employee-of-the-month/winners/${month}/${targetUserId}`;
  const key = ['group', groupId, 'employee-of-the-month', 'winner', month, targetUserId];

  const { data: reasons } = useQuery({
    queryKey: [...key, 'reasons', reasonPage],
    queryFn: () => api<Paginated<EotmReason>>(`${base}/reasons?page=${reasonPage}&pageSize=5`),
  });
  const { data: comments } = useQuery({
    queryKey: [...key, 'comments', commentPage],
    queryFn: () => api<Paginated<EotmComment>>(`${base}/comments?page=${commentPage}&pageSize=5`),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['group', groupId, 'employee-of-the-month', 'winner'] });
  const onError = (e: unknown) => setError(errorMessage(e));

  const submit = () => {
    if (!body.trim() || create.isPending) return;
    create.mutate();
  };

  const create = useMutation({
    mutationFn: () => api(`/groups/${groupId}/employee-of-the-month/comments`, { body: { month, targetUserId, body: body.trim() } }),
    onSuccess: () => {
      setError(undefined);
      setBody('');
      refresh();
    },
    onError,
  });
  const update = useMutation({
    mutationFn: (v: { id: string; body: string }) =>
      api(`/groups/${groupId}/employee-of-the-month/comments/${v.id}`, { method: 'PATCH', body: { body: v.body.trim() } }),
    onSuccess: () => {
      setError(undefined);
      setEditing(undefined);
      refresh();
    },
    onError,
  });
  const remove = useMutation({
    mutationFn: (commentId: string) => api(`/groups/${groupId}/employee-of-the-month/comments/${commentId}`, { method: 'DELETE' }),
    onSuccess: () => {
      setError(undefined);
      refresh();
    },
    onError,
  });

  return (
    <div className="space-y-3 border-t border-slate-100 pt-3">
      {reasons && reasons.total > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-400">추천 사유 {reasons.total}건 (익명)</p>
          <ul className="list-disc space-y-0.5 pl-4 text-xs text-slate-500">
            {reasons.items.map((r) => (
              <li key={r.id}>{r.reason}</li>
            ))}
          </ul>
          <Pager page={reasonPage} pages={pagesOf(reasons.total, reasons.pageSize)} setPage={setReasonPage} total={reasons.total} />
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-400">{targetName}님에게 남긴 댓글 {comments?.total ?? 0}</p>
        <ul className="space-y-2 text-sm">
          {comments?.items.map((c) => (
            <li key={c.id} className="flex items-start gap-2">
              <Avatar name={c.author.name} url={c.author.avatarUrl} size={24} />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-400">
                  <span className="font-semibold text-slate-600">{c.author.name}</span> · {new Date(c.createdAt).toLocaleDateString('ko-KR')}
                </p>
                {editing?.id === c.id ? (
                  <div className="mt-1 flex gap-2">
                    <Input
                      className="flex-1"
                      value={editing.body}
                      maxLength={300}
                      onChange={(e) => setEditing({ id: c.id, body: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.nativeEvent.isComposing && editing.body.trim()) update.mutate(editing);
                      }}
                    />
                    <Button variant="secondary" onClick={() => update.mutate(editing)} disabled={!editing.body.trim() || update.isPending}>
                      저장
                    </Button>
                    <Button variant="ghost" onClick={() => setEditing(undefined)}>
                      취소
                    </Button>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{c.body}</p>
                )}
              </div>
              {c.canEdit && editing?.id !== c.id && (
                <Button variant="ghost" onClick={() => setEditing({ id: c.id, body: c.body })}>
                  수정
                </Button>
              )}
              {c.canDelete && (
                <Button variant="ghost" onClick={async () => { if (await confirm({ message: '댓글을 삭제할까요? 되돌릴 수 없습니다.', danger: true })) remove.mutate(c.id); }} disabled={remove.isPending}>
                  삭제
                </Button>
              )}
            </li>
          ))}
        </ul>
        {comments && comments.total > 0 && (
          <Pager page={commentPage} pages={pagesOf(comments.total, comments.pageSize)} setPage={setCommentPage} total={comments.total} />
        )}
        <ErrorText>{error}</ErrorText>
        <div className="flex gap-2">
          <Input
            className="flex-1"
            placeholder="축하 댓글을 남겨보세요"
            value={body}
            maxLength={300}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              // 한글 조합 중 Enter는 무시 (조합 확정 때 중복 제출 방지)
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) submit();
            }}
          />
          <Button variant="secondary" onClick={submit} disabled={!body.trim() || create.isPending}>
            등록
          </Button>
        </div>
      </div>
    </div>
  );
}
