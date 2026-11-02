'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Avatar, Badge, Button, Card, ErrorText } from '@/components/ui';
import { useDialog } from '@/components/confirm-dialog';
import { api, errorMessage } from '@/lib/api';
import { useGroupId } from '@/lib/hooks';
import { themeBg } from '@/lib/paper-theme';

interface Note {
  id: string;
  body: string;
  color: string;
  rotation: number;
  createdAt: string;
  author: { id: string; name: string; avatarUrl: string | null } | null;
  mine: boolean;
  canDelete: boolean;
}
interface Paper {
  id: string;
  title: string;
  message: string | null;
  theme: string;
  target: { id: string; name: string; avatarUrl: string | null };
  open: boolean;
  closeAt: string | null;
  canClose: boolean;
  canWrite: boolean;
  remainingNotes: number;
  anonymousAllowed: boolean;
  maxNoteLength: number;
  notes: Note[];
}
const COLORS = ['#fef08a', '#fbcfe8', '#bae6fd', '#bbf7d0', '#fed7aa', '#ddd6fe'];

/** 롤링페이퍼: 종이 위에 포인트 메시지가 붙은 모양 */
export default function RollingPaperPage() {
  const groupId = useGroupId();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { confirm } = useDialog();
  const [body, setBody] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [anonymous, setAnonymous] = useState(false);
  const [error, setError] = useState<string>();
  const key = ['group', groupId, 'rolling-paper', id];

  const { data: paper } = useQuery({ queryKey: key, queryFn: () => api<Paper>(`/groups/${groupId}/rolling-papers/${id}`) });

  const refresh = () => qc.invalidateQueries({ queryKey: ['group', groupId, 'rolling-paper'] });
  const onError = (e: unknown) => setError(errorMessage(e));

  const write = useMutation({
    mutationFn: () => api(`/groups/${groupId}/rolling-papers/${id}/notes`, { body: { body: body.trim(), color, anonymous } }),
    onSuccess: () => {
      setError(undefined);
      setBody('');
      refresh();
    },
    onError,
  });
  const removeNote = useMutation({
    mutationFn: (noteId: string) => api(`/groups/${groupId}/rolling-papers/${id}/notes/${noteId}`, { method: 'DELETE' }),
    onSuccess: refresh,
    onError,
  });
  const close = useMutation({ mutationFn: () => api(`/groups/${groupId}/rolling-papers/${id}/close`, { body: {} }), onSuccess: refresh, onError });
  const removePaper = useMutation({
    mutationFn: () => api(`/groups/${groupId}/rolling-papers/${id}`, { method: 'DELETE' }),
    onSuccess: () => router.replace(`/g/${groupId}/rolling-paper`),
    onError,
  });

  if (!paper) return <p className="text-slate-400">불러오는 중…</p>;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Link href={`/g/${groupId}/rolling-paper`} className="text-sm text-slate-500">
        ← 롤링페이퍼 목록
      </Link>
      <ErrorText>{error}</ErrorText>

      {/* 종이 */}
      <div className={`rounded-3xl bg-gradient-to-br ${themeBg(paper.theme)} p-5 shadow-inner ring-1 ring-black/5 sm:p-8`}>
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Avatar name={paper.target.name} url={paper.target.avatarUrl} size={56} />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-500">{paper.target.name}님에게</p>
            <h1 className="text-2xl font-black text-slate-800">{paper.title}</h1>
            {paper.message && <p className="mt-1 text-sm text-slate-600">{paper.message}</p>}
          </div>
          <Badge tone={paper.open ? 'green' : 'slate'}>{paper.open ? '쓰는 중' : '마감'}</Badge>
        </div>

        {paper.notes.length === 0 ? (
          <p className="py-16 text-center text-slate-400">아직 메시지가 없어요. 첫 메시지를 남겨 보세요!</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {paper.notes.map((n) => (
              <div
                key={n.id}
                style={{ backgroundColor: n.color, transform: `rotate(${n.rotation}deg)` }}
                className="relative min-h-32 rounded-sm p-4 shadow-md transition hover:rotate-0 hover:shadow-lg"
              >
                <div className="absolute -top-2 left-1/2 h-4 w-12 -translate-x-1/2 rotate-1 bg-white/60 shadow-sm" />
                <p className="whitespace-pre-wrap text-sm text-slate-800">{n.body}</p>
                <p className="mt-3 text-right text-xs text-slate-600">— {n.author ? n.author.name : '익명'}{n.mine && ' (나)'}</p>
                {n.canDelete && (
                  <button
                    type="button"
                    className="absolute right-1 top-1 text-xs text-slate-400 hover:text-rose-600"
                    onClick={async () => {
                      if (await confirm({ message: '이 메시지를 삭제할까요?', danger: true })) removeNote.mutate(n.id);
                    }}
                  >
                    삭제
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 쓰기 */}
      {paper.canWrite ? (
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">메시지 남기기</h2>
            <span className="text-xs text-slate-400">남은 메시지 {paper.remainingNotes}개</span>
          </div>
          <textarea
            className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            style={{ backgroundColor: color }}
            placeholder="따뜻한 한마디를 남겨 주세요"
            maxLength={paper.maxNoteLength}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label="색상 선택"
                  onClick={() => setColor(c)}
                  className={`h-6 w-6 rounded-full ring-2 ${color === c ? 'ring-slate-700' : 'ring-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            {paper.anonymousAllowed && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
                익명으로 쓰기
              </label>
            )}
            <span className="ml-auto text-xs text-slate-400">
              {body.length}/{paper.maxNoteLength}
            </span>
            <Button onClick={() => write.mutate()} disabled={!body.trim() || write.isPending}>
              붙이기
            </Button>
          </div>
        </Card>
      ) : (
        paper.open && <Card className="text-sm text-slate-500">이 롤링페이퍼에 남길 수 있는 메시지를 모두 사용했어요.</Card>
      )}

      {paper.canClose && (
        <div className="flex justify-end gap-2">
          {paper.open && (
            <Button
              variant="secondary"
              onClick={async () => {
                if (await confirm({ message: '롤링페이퍼를 마감할까요? 마감하면 더 이상 쓸 수 없어요.' })) close.mutate();
              }}
            >
              마감하기
            </Button>
          )}
          <Button
            variant="danger"
            onClick={async () => {
              if (await confirm({ message: '롤링페이퍼를 삭제할까요? 모든 메시지가 사라져요.', danger: true })) removePaper.mutate();
            }}
          >
            삭제
          </Button>
        </div>
      )}
    </div>
  );
}
