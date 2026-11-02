'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge, Button, Card, ErrorText } from '@/components/ui';
import { useDialog } from '@/components/confirm-dialog';
import { api, errorMessage } from '@/lib/api';
import { useGroupId } from '@/lib/hooks';
import { SURVEY_STATUS } from '@/lib/survey';

type Answer = string | number | string[];
interface Result {
  questionId: string;
  type: 'SINGLE' | 'MULTI' | 'TEXT' | 'RATING';
  total: number;
  options?: { option: string; count: number }[];
  average?: number;
  distribution?: Record<string, number> | number[];
  texts?: { text: string; author: { name: string } | null }[];
}
interface Detail {
  id: string;
  title: string;
  description: string | null;
  status: keyof typeof SURVEY_STATUS;
  launchMode: 'MANUAL' | 'RANDOM';
  anonymous: boolean;
  rejectReason: string | null;
  author: { id: string; name: string } | null;
  canManage: boolean;
  responseCount: number;
  endsAt: string | null;
  launchAt: string | null;
  responded: boolean;
  canRespond: boolean;
  questions: { id: string; text: string; type: 'SINGLE' | 'MULTI' | 'TEXT' | 'RATING'; options: string[] | null }[];
  results: Result[] | null;
  /** 관리자 여부는 서버에서 canManage 로 내려오므로 승인 버튼은 상태로 판단 */
}

/** 설문 상세: 응답, 결과, 관리(승인·시작·종료·삭제) */
export default function SurveyDetailPage() {
  const groupId = useGroupId();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { confirm, prompt } = useDialog();
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [error, setError] = useState<string>();

  const { data: s } = useQuery({ queryKey: ['group', groupId, 'surveys', 'detail', id], queryFn: () => api<Detail>(`/groups/${groupId}/surveys/${id}`) });
  const refresh = () => qc.invalidateQueries({ queryKey: ['group', groupId, 'surveys'] });
  const onError = (e: unknown) => setError(errorMessage(e));
  const act = (path: string, body: unknown = {}) =>
    api(`/groups/${groupId}/surveys/${id}/${path}`, { body }).then(() => {
      setError(undefined);
      refresh();
    });

  const respond = useMutation({ mutationFn: () => act('respond', { answers }), onError });
  const approve = useMutation({ mutationFn: () => act('approve'), onError });
  const reject = useMutation({ mutationFn: (reason: string) => act('reject', { reason }), onError });
  const start = useMutation({ mutationFn: () => act('start'), onError });
  const close = useMutation({ mutationFn: () => act('close'), onError });
  const remove = useMutation({
    mutationFn: () => api(`/groups/${groupId}/surveys/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      refresh();
      router.replace(`/g/${groupId}/surveys`);
    },
    onError,
  });

  if (!s) return <p className="text-slate-400">불러오는 중…</p>;
  const st = SURVEY_STATUS[s.status];
  const toggle = (qid: string, opt: string) => {
    const cur = (answers[qid] as string[] | undefined) ?? [];
    setAnswers({ ...answers, [qid]: cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt] });
  };
  const ready = s.questions.every((q) => q.type === 'TEXT' || (answers[q.id] !== undefined && !(Array.isArray(answers[q.id]) && (answers[q.id] as string[]).length === 0)));

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href={`/g/${groupId}/surveys`} className="text-sm text-slate-500">
        ← 랜덤 설문
      </Link>
      <ErrorText>{error}</ErrorText>
      <Card className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-black">{s.title}</h1>
          <Badge tone={st.tone}>{st.label}</Badge>
          <Badge tone="slate">{s.anonymous ? '익명 응답' : '기명 응답'}</Badge>
        </div>
        {s.description && <p className="text-sm text-slate-600">{s.description}</p>}
        <p className="text-xs text-slate-500">
          {s.author ? s.author.name : '익명'} · 응답 {s.responseCount}명
          {s.endsAt && ` · 마감 ${new Date(s.endsAt).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })}`}
          {s.launchAt && s.status === 'QUEUED' && ` · 시작 예정 ${new Date(s.launchAt).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })}`}
        </p>
        {s.rejectReason && <p className="text-sm text-rose-600">반려 사유: {s.rejectReason}</p>}
      </Card>

      {s.canRespond && (
        <Card className="space-y-5">
          {s.questions.map((q, i) => (
            <div key={q.id} className="space-y-2">
              <p className="font-semibold">
                {i + 1}. {q.text}
                {q.type === 'TEXT' && <span className="ml-1 text-xs font-normal text-slate-400">(선택)</span>}
              </p>
              {(q.type === 'SINGLE' || q.type === 'MULTI') &&
                q.options?.map((o) => (
                  <label key={o} className="flex items-center gap-2 text-sm">
                    {q.type === 'SINGLE' ? (
                      <input type="radio" name={q.id} checked={answers[q.id] === o} onChange={() => setAnswers({ ...answers, [q.id]: o })} />
                    ) : (
                      <input type="checkbox" checked={((answers[q.id] as string[]) ?? []).includes(o)} onChange={() => toggle(q.id, o)} />
                    )}
                    {o}
                  </label>
                ))}
              {q.type === 'RATING' && (
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => setAnswers({ ...answers, [q.id]: n })} className={`text-3xl ${Number(answers[q.id] ?? 0) >= n ? '' : 'opacity-25'}`}>
                      ⭐
                    </button>
                  ))}
                </div>
              )}
              {q.type === 'TEXT' && (
                <textarea
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  rows={3}
                  maxLength={500}
                  value={(answers[q.id] as string) ?? ''}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                />
              )}
            </div>
          ))}
          <Button onClick={() => respond.mutate()} disabled={!ready || respond.isPending}>
            제출하기
          </Button>
        </Card>
      )}

      {s.responded && !s.results && <Card className="text-sm text-slate-600">응답해 주셔서 고마워요! 결과는 설문이 끝나면 공개돼요. 🎉</Card>}
      {!s.canRespond && !s.responded && s.status === 'ACTIVE' && <Card className="text-sm text-slate-600">이미 응답했거나 응답할 수 없는 설문이에요.</Card>}

      {s.results && (
        <Card className="space-y-5">
          <h2 className="font-bold">결과</h2>
          {s.questions.map((q, i) => {
            const r = s.results!.find((x) => x.questionId === q.id);
            if (!r) return null;
            const maxCount = Math.max(1, ...(r.options?.map((o) => o.count) ?? [1]));
            return (
              <div key={q.id} className="space-y-2">
                <p className="font-semibold">
                  {i + 1}. {q.text} <span className="text-xs font-normal text-slate-400">({r.total}명)</span>
                </p>
                {r.options?.map((o) => (
                  <div key={o.option} className="space-y-0.5">
                    <div className="flex justify-between text-sm">
                      <span>{o.option}</span>
                      <span className="text-slate-500">{o.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-brand-500" style={{ width: `${(o.count / maxCount) * 100}%` }} />
                    </div>
                  </div>
                ))}
                {r.type === 'RATING' && <p className="text-lg font-bold">⭐ {r.average?.toFixed(1)} / 5</p>}
                {r.texts && (
                  <ul className="space-y-1 text-sm">
                    {r.texts.length === 0 && <li className="text-slate-400">답변이 없어요.</li>}
                    {r.texts.map((t, k) => (
                      <li key={k} className="rounded-lg bg-slate-50 px-3 py-2">
                        {t.text}
                        {t.author && <span className="ml-2 text-xs text-slate-400">- {t.author.name}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </Card>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        {s.status === 'PENDING' && s.canManage && (
          <>
            <Button onClick={() => approve.mutate()}>승인</Button>
            <Button
              variant="secondary"
              onClick={async () => {
                const reason = await prompt({ message: '반려 사유를 입력해 주세요', required: true });
                if (reason) reject.mutate(reason);
              }}
            >
              반려
            </Button>
          </>
        )}
        {s.status === 'QUEUED' && s.canManage && (
          <Button
            onClick={async () => {
              if (await confirm({ message: '지금 바로 설문을 시작할까요?' })) start.mutate();
            }}
          >
            지금 시작
          </Button>
        )}
        {s.status === 'ACTIVE' && s.canManage && (
          <Button
            variant="secondary"
            onClick={async () => {
              if (await confirm({ message: '설문을 종료할까요?' })) close.mutate();
            }}
          >
            종료
          </Button>
        )}
        {s.canManage && (
          <Button
            variant="danger"
            onClick={async () => {
              if (await confirm({ message: '설문과 모든 응답을 삭제할까요?', danger: true })) remove.mutate();
            }}
          >
            삭제
          </Button>
        )}
      </div>
    </div>
  );
}
