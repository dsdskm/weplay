'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { readAttachments, type Attachment } from '@weplay/shared';
import { AttachmentList, AttachmentPicker } from '@/components/attachments';
import { Avatar, Badge, Button, Card, ErrorText, Input } from '@/components/ui';
import { useDialog } from '@/components/confirm-dialog';
import { api, errorMessage, uploadAttachment } from '@/lib/api';
import { fmtDateTime } from '@/lib/format';
import { useGroupId } from '@/lib/hooks';

interface Notice {
  id: string;
  title: string;
  body: string;
  attachments?: Attachment[];
  teamId: string | null;
  pinned: boolean;
  important: boolean;
  author: { name: string; avatarUrl: string | null } | null;
  readCount: number;
  memberCount: number;
  canEdit: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 공지 상세 (열면 읽음). 작성 권한이 있으면 수정·삭제 */
export default function NoticeDetailPage() {
  const groupId = useGroupId();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { confirm } = useDialog();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', pinned: false, important: false });
  const [error, setError] = useState<string>();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const { data: n } = useQuery({ queryKey: ['group', groupId, 'notices', 'detail', id], queryFn: () => api<Notice>(`/groups/${groupId}/notices/${id}`) });

  useEffect(() => {
    // 읽음 처리됐으니 목록·배지 갱신
    if (n) qc.invalidateQueries({ queryKey: ['group', groupId, 'notices', 'badge'] });
  }, [n, qc, groupId]);

  const save = useMutation({
    mutationFn: () => api(`/groups/${groupId}/notices/${id}`, { method: 'PATCH', body: { ...form, attachments } }),
    onSuccess: () => {
      setEditing(false);
      setError(undefined);
      qc.invalidateQueries({ queryKey: ['group', groupId, 'notices'] });
    },
    onError: (e) => setError(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: () => api(`/groups/${groupId}/notices/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group', groupId, 'notices'] });
      router.replace(`/g/${groupId}/notices`);
    },
    onError: (e) => setError(errorMessage(e)),
  });

  if (!n) return <p className="text-slate-400">불러오는 중…</p>;
  const rate = n.memberCount ? Math.round((n.readCount / n.memberCount) * 100) : 0;
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href={`/g/${groupId}/notices`} className="text-sm text-slate-500">
        ← 공지사항
      </Link>
      <ErrorText>{error}</ErrorText>
      <Card className="space-y-4">
        {editing ? (
          <div className="space-y-3">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={100} />
            <textarea className="min-h-64 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            <AttachmentPicker value={attachments} onChange={setAttachments} upload={(file) => uploadAttachment(groupId, file)} onUploadingChange={setUploading} disabled={save.isPending} />
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} /> 맨 위 고정
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.important} onChange={(e) => setForm({ ...form, important: e.target.checked })} /> 중요 표시
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" disabled={uploading || save.isPending} onClick={() => setEditing(false)}>
                취소
              </Button>
              <Button onClick={() => save.mutate()} disabled={!form.title.trim() || !form.body.trim() || uploading || save.isPending}>
                저장
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-1.5">
              {n.pinned && <Badge tone="amber">📌 고정</Badge>}
              {n.important && <Badge tone="rose">중요</Badge>}
            </div>
            <h1 className="text-2xl font-black leading-tight">{n.title}</h1>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              {n.author && <Avatar name={n.author.name} url={n.author.avatarUrl} size={24} />}
              {n.author?.name} · {fmtDateTime(n.createdAt)}
              {n.updatedAt !== n.createdAt && ' (수정됨)'}
            </div>
            <p className="whitespace-pre-wrap leading-relaxed">{n.body}</p>
            <AttachmentList attachments={n.attachments} />
            <div>
              <div className="mb-1 flex justify-between text-xs text-slate-500">
                <span>읽은 사람</span>
                <span>
                  {n.readCount}/{n.memberCount}명 ({rate}%)
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="wp-bar h-full rounded-full bg-gradient-to-r from-brand-500 to-pink-500" style={{ width: `${rate}%` }} />
              </div>
            </div>
            {n.canEdit && (
              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setForm({ title: n.title, body: n.body, pinned: n.pinned, important: n.important });
                    setAttachments(readAttachments(n.attachments));
                    setEditing(true);
                  }}
                >
                  수정
                </Button>
                <Button
                  variant="danger"
                  onClick={async () => {
                    if (await confirm({ message: '공지를 삭제할까요?', danger: true })) remove.mutate();
                  }}
                >
                  삭제
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
