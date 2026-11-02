'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { labelOf, SUGGESTION_CATEGORIES, SUGGESTION_STATUS } from '@weplay/shared';
import { Badge, Button, Card, cn, ErrorText } from '@/components/ui';
import { useDialog } from '@/components/confirm-dialog';
import { api, errorMessage } from '@/lib/api';
import { fmtDateTime } from '@/lib/format';
import { useGroupId } from '@/lib/hooks';

interface Detail {
  id: string;
  title: string;
  body: string;
  category: string;
  status: string;
  author: { name: string } | null;
  mine: boolean;
  votes: number | null;
  voted: boolean;
  answer: string | null;
  answeredBy: { name: string } | null;
  answeredAt: string | null;
  canAnswer: boolean;
  canDelete: boolean;
  createdAt: string;
}

const STEPS = ['RECEIVED', 'REVIEWING', 'ACCEPTED', 'DONE'];

/** 건의 상세: 진행 단계, 공감, 관리자 답변 */
export default function SuggestionDetailPage() {
  const groupId = useGroupId();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { confirm } = useDialog();
  const [status, setStatus] = useState('RECEIVED');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState<string>();
  const { data: s } = useQuery({ queryKey: ['group', groupId, 'suggestions', 'detail', id], queryFn: () => api<Detail>(`/groups/${groupId}/suggestions/${id}`) });
  useEffect(() => {
    if (s) {
      setStatus(s.status);
      setAnswer(s.answer ?? '');
    }
  }, [s]);
  const refresh = () => qc.invalidateQueries({ queryKey: ['group', groupId, 'suggestions'] });
  const vote = useMutation({ mutationFn: () => api(`/groups/${groupId}/suggestions/${id}/vote`, { body: {} }), onSuccess: refresh });
  const save = useMutation({
    mutationFn: () => api(`/groups/${groupId}/suggestions/${id}/answer`, { method: 'PUT', body: { status, answer: answer.trim() || null } }),
    onSuccess: () => {
      setError(undefined);
      refresh();
    },
    onError: (e) => setError(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: () => api(`/groups/${groupId}/suggestions/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      refresh();
      router.replace(`/g/${groupId}/suggestions`);
    },
    onError: (e) => setError(errorMessage(e)),
  });

  if (!s) return <p className="text-slate-400">불러오는 중…</p>;
  const stepIdx = STEPS.indexOf(s.status);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href={`/g/${groupId}/suggestions`} className="text-sm text-slate-500">
        ← 건의사항
      </Link>
      <ErrorText>{error}</ErrorText>
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="slate">{labelOf(SUGGESTION_CATEGORIES, s.category)}</Badge>
          <Badge tone={(SUGGESTION_STATUS.find((x) => x.key === s.status)?.tone ?? 'slate') as 'slate'}>{labelOf(SUGGESTION_STATUS, s.status)}</Badge>
        </div>
        <h1 className="text-2xl font-black">{s.title}</h1>
        <p className="text-sm text-slate-400">
          {s.author ? s.author.name : '익명'}
          {s.mine && ' (나)'} · {fmtDateTime(s.createdAt)}
        </p>
        <p className="whitespace-pre-wrap leading-relaxed">{s.body}</p>

        {/* 진행 단계 */}
        {s.status !== 'DECLINED' ? (
          <div className="flex items-center gap-1">
            {STEPS.map((k, i) => (
              <div key={k} className="flex flex-1 items-center gap-1">
                <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-500', i <= stepIdx ? 'bg-brand-600 text-white shadow-md' : 'bg-slate-100 text-slate-400')}>
                  {i < stepIdx ? '✓' : i + 1}
                </div>
                <span className={cn('hidden text-xs sm:inline', i <= stepIdx ? 'font-semibold text-brand-700' : 'text-slate-400')}>{labelOf(SUGGESTION_STATUS, k)}</span>
                {i < STEPS.length - 1 && <div className={cn('h-1 flex-1 rounded-full', i < stepIdx ? 'bg-brand-500' : 'bg-slate-100')} />}
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">이번에는 보류됐어요.</p>
        )}

        <div className="flex items-center justify-between">
          <button type="button" onClick={() => vote.mutate()} className={cn('flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition active:scale-90', s.voted ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600')}>
            {s.voted ? '❤️' : '🤍'} 공감 {s.votes ?? ''}
          </button>
          {s.canDelete && (
            <Button
              variant="ghost"
              onClick={async () => {
                if (await confirm({ message: '건의를 삭제할까요?', danger: true })) remove.mutate();
              }}
            >
              삭제
            </Button>
          )}
        </div>
      </Card>

      {s.answer && (
        <Card className="wp-pop-in space-y-2 border-l-4 border-brand-500">
          <p className="text-sm font-bold text-brand-700">💬 관리자 답변</p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{s.answer}</p>
          <p className="text-xs text-slate-400">
            {s.answeredBy?.name} · {s.answeredAt && fmtDateTime(s.answeredAt)}
          </p>
        </Card>
      )}

      {s.canAnswer && (
        <Card className="space-y-3">
          <h2 className="font-bold">관리자 처리</h2>
          <div className="flex flex-wrap gap-2">
            {SUGGESTION_STATUS.map((x) => (
              <button key={x.key} type="button" onClick={() => setStatus(x.key)} className={cn('rounded-full px-3 py-1.5 text-sm font-semibold transition', status === x.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600')}>
                {x.name}
              </button>
            ))}
          </div>
          <textarea className="min-h-28 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="답변 (선택)" value={answer} onChange={(e) => setAnswer(e.target.value)} />
          <p className="text-xs text-slate-400">반영 예정·반영 완료로 바꾸면 작성자에게 포인트 보상이 한 번 지급돼요.</p>
          <div className="flex justify-end">
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              저장
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
