'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { INQUIRY_CATEGORIES, INQUIRY_STATUS, labelOf } from '@weplay/shared';
import { Badge, Button, Card, cn, ErrorText } from '@/components/ui';
import { useDialog } from '@/components/confirm-dialog';
import { SimpleShell } from '@/components/simple-shell';
import { api, errorMessage } from '@/lib/api';
import { fmtDateTime } from '@/lib/format';

interface Detail {
  id: string;
  category: string;
  title: string;
  body: string;
  status: string;
  group: { name: string } | null;
  createdAt: string;
  replies: { id: string; body: string; fromMaster: boolean; author: string; createdAt: string }[];
}

/** 문의 상세: 대화 형태로 답변을 주고받음 */
export default function InquiryPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { confirm } = useDialog();
  const [text, setText] = useState('');
  const [error, setError] = useState<string>();
  const { data: d } = useQuery({ queryKey: ['support', 'detail', id], queryFn: () => api<Detail>(`/support/inquiries/${id}`), refetchInterval: 30_000 });
  const refresh = () => qc.invalidateQueries({ queryKey: ['support'] });
  const reply = useMutation({
    mutationFn: () => api(`/support/inquiries/${id}/replies`, { body: { body: text.trim() } }),
    onSuccess: () => {
      setText('');
      refresh();
    },
    onError: (e) => setError(errorMessage(e)),
  });
  const close = useMutation({ mutationFn: () => api(`/support/inquiries/${id}/close`, { body: {} }), onSuccess: refresh, onError: (e) => setError(errorMessage(e)) });

  return (
    <SimpleShell>
      <Link href="/support" className="text-sm text-slate-500">
        ← 문의 목록
      </Link>
      {!d ? (
        <p className="text-slate-400">불러오는 중…</p>
      ) : (
        <div className="mt-3 space-y-4">
          <Card className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="slate">{labelOf(INQUIRY_CATEGORIES, d.category)}</Badge>
              <Badge tone={d.status === 'ANSWERED' ? 'green' : d.status === 'OPEN' ? 'amber' : 'slate'}>{labelOf(INQUIRY_STATUS, d.status)}</Badge>
              {d.group && <Badge tone="brand">{d.group.name}</Badge>}
            </div>
            <h1 className="text-xl font-black">{d.title}</h1>
            <p className="text-xs text-slate-400">{fmtDateTime(d.createdAt)}</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{d.body}</p>
          </Card>
          <div className="space-y-3">
            {d.replies.map((r) => (
              <div key={r.id} className={cn('wp-pop-in flex', r.fromMaster ? 'justify-start' : 'justify-end')}>
                <div className={cn('max-w-[85%] rounded-3xl px-4 py-3 text-sm shadow-sm', r.fromMaster ? 'rounded-tl-md bg-white ring-1 ring-slate-100' : 'rounded-tr-md bg-brand-600 text-white')}>
                  <p className={cn('mb-1 text-xs font-semibold', r.fromMaster ? 'text-brand-600' : 'text-white/80')}>{r.fromMaster ? '🛟 운영자' : '나'}</p>
                  <p className="whitespace-pre-wrap">{r.body}</p>
                  <p className={cn('mt-1 text-[10px]', r.fromMaster ? 'text-slate-400' : 'text-white/70')}>{fmtDateTime(r.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
          <ErrorText>{error}</ErrorText>
          {d.status !== 'CLOSED' ? (
            <Card className="space-y-2">
              <textarea className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="추가로 궁금한 점을 적어 주세요" value={text} onChange={(e) => setText(e.target.value)} />
              <div className="flex justify-between gap-2">
                <Button
                  variant="ghost"
                  onClick={async () => {
                    if (await confirm({ message: '문의를 종료할까요? 종료하면 더 답글을 달 수 없어요.' })) close.mutate();
                  }}
                >
                  문의 종료
                </Button>
                <Button onClick={() => reply.mutate()} disabled={!text.trim() || reply.isPending}>
                  보내기
                </Button>
              </div>
            </Card>
          ) : (
            <p className="text-center text-sm text-slate-400">종료된 문의예요.</p>
          )}
        </div>
      )}
    </SimpleShell>
  );
}
