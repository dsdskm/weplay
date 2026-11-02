'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { Badge, Button, Card, Empty, ErrorText, Input } from '@/components/ui';
import { Pager } from '@/components/pager';
import { useDialog } from '@/components/confirm-dialog';
import { api, errorMessage } from '@/lib/api';
import { useGroupId } from '@/lib/hooks';
import { SURVEY_STATUS } from '@/lib/survey';
import type { Paginated } from '@/lib/types';

interface SurveyItem {
  id: string;
  title: string;
  status: 'PENDING' | 'QUEUED' | 'ACTIVE' | 'CLOSED' | 'REJECTED';
  launchMode: 'MANUAL' | 'RANDOM';
  anonymous: boolean;
  author: { id: string; name: string } | null;
  questionCount: number;
  responseCount: number;
  endsAt: string | null;
  responded: boolean;
  mine: boolean;
}
type QType = 'SINGLE' | 'MULTI' | 'TEXT' | 'RATING';
interface Q {
  text: string;
  type: QType;
  options: string[];
}

const TYPE_LABEL: Record<QType, string> = { SINGLE: '단일 선택', MULTI: '복수 선택', TEXT: '서술형', RATING: '별점(1~5)' };
const TABS = [
  ['', '전체'],
  ['ACTIVE', '진행 중'],
  ['CLOSED', '종료'],
  ['mine', '내가 만든'],
] as const;

/** 랜덤 설문: 누구나 등록, 수동 또는 랜덤 시각에 시작 */
export default function SurveysPage() {
  const groupId = useGroupId();
  const qc = useQueryClient();
  const [tab, setTab] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [anonymous, setAnonymous] = useState(true);
  const [launchMode, setLaunchMode] = useState<'MANUAL' | 'RANDOM'>('MANUAL');
  const [questions, setQuestions] = useState<Q[]>([{ text: '', type: 'SINGLE', options: ['', ''] }]);

  const { data } = useQuery({
    queryKey: ['group', groupId, 'surveys', tab, page],
    queryFn: () => api<Paginated<SurveyItem> & { enabled: boolean }>(`/groups/${groupId}/surveys?page=${page}&pageSize=10${tab ? `&status=${tab}` : ''}`),
  });

  const setQ = (i: number, patch: Partial<Q>) => setQuestions(questions.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const valid =
    title.trim() &&
    questions.length > 0 &&
    questions.every((q) => q.text.trim() && (q.type === 'TEXT' || q.type === 'RATING' || q.options.filter((o) => o.trim()).length >= 2));

  const create = useMutation({
    mutationFn: () =>
      api<{ id: string; status: string }>(`/groups/${groupId}/surveys`, {
        body: {
          title: title.trim(),
          description: description.trim() || null,
          anonymous,
          launchMode,
          questions: questions.map((q) => ({
            text: q.text.trim(),
            type: q.type,
            ...(q.type === 'SINGLE' || q.type === 'MULTI' ? { options: q.options.map((o) => o.trim()).filter(Boolean) } : {}),
          })),
        },
      }),
    onSuccess: () => {
      setError(undefined);
      setCreating(false);
      setTitle('');
      setDescription('');
      setQuestions([{ text: '', type: 'SINGLE', options: ['', ''] }]);
      setTab('mine');
      qc.invalidateQueries({ queryKey: ['group', groupId, 'surveys'] });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  if (!data) return <p className="text-slate-400">불러오는 중…</p>;
  if (!data.enabled) return <Card>이 기능은 아직 그룹에서 사용할 수 없어요.</Card>;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">랜덤 설문</h1>
        <Button onClick={() => setCreating((v) => !v)}>{creating ? '닫기' : '설문 만들기'}</Button>
      </div>
      <ErrorText>{error}</ErrorText>

      {creating && (
        <Card className="space-y-4">
          <Input placeholder="설문 제목" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
          <Input placeholder="설명 (선택)" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} /> 익명 응답
            </label>
            <label className="flex items-center gap-2">
              시작 방식
              <select className="rounded-lg border border-slate-200 px-2 py-1" value={launchMode} onChange={(e) => setLaunchMode(e.target.value as 'MANUAL' | 'RANDOM')}>
                <option value="MANUAL">직접 시작</option>
                <option value="RANDOM">랜덤 시각에 자동 시작</option>
              </select>
            </label>
          </div>
          {questions.map((q, i) => (
            <div key={i} className="space-y-2 rounded-xl border border-slate-100 p-3">
              <div className="flex gap-2">
                <Input placeholder={`질문 ${i + 1}`} value={q.text} onChange={(e) => setQ(i, { text: e.target.value })} maxLength={200} />
                <select className="rounded-xl border border-slate-200 px-2 text-sm" value={q.type} onChange={(e) => setQ(i, { type: e.target.value as QType })}>
                  {Object.entries(TYPE_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                {questions.length > 1 && (
                  <Button variant="ghost" onClick={() => setQuestions(questions.filter((_, j) => j !== i))}>
                    빼기
                  </Button>
                )}
              </div>
              {(q.type === 'SINGLE' || q.type === 'MULTI') && (
                <div className="space-y-1 pl-2">
                  {q.options.map((o, k) => (
                    <div key={k} className="flex gap-2">
                      <Input placeholder={`보기 ${k + 1}`} value={o} onChange={(e) => setQ(i, { options: q.options.map((x, m) => (m === k ? e.target.value : x)) })} maxLength={100} />
                      {q.options.length > 2 && (
                        <Button variant="ghost" onClick={() => setQ(i, { options: q.options.filter((_, m) => m !== k) })}>
                          ×
                        </Button>
                      )}
                    </div>
                  ))}
                  {q.options.length < 10 && (
                    <Button variant="ghost" onClick={() => setQ(i, { options: [...q.options, ''] })}>
                      + 보기 추가
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setQuestions([...questions, { text: '', type: 'SINGLE', options: ['', ''] }])}>
              + 질문 추가
            </Button>
            <Button onClick={() => create.mutate()} disabled={!valid || create.isPending}>
              등록
            </Button>
          </div>
          <p className="text-xs text-slate-400">그룹 설정에 따라 관리자 승인이 필요할 수 있어요.</p>
        </Card>
      )}

      <div className="flex gap-2">
        {TABS.map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              setTab(k);
              setPage(1);
            }}
            className={tab === k ? 'rounded-full bg-slate-900 px-4 py-1.5 text-sm text-white' : 'rounded-full bg-white px-4 py-1.5 text-sm text-slate-600 ring-1 ring-slate-200'}
          >
            {label}
          </button>
        ))}
      </div>

      {data.items.length === 0 ? (
        <Empty>설문이 없어요.</Empty>
      ) : (
        <div className="space-y-2">
          {data.items.map((s) => {
            const st = SURVEY_STATUS[s.status];
            return (
              <Link key={s.id} href={`/g/${groupId}/surveys/${s.id}`}>
                <Card className="mb-2 flex items-center gap-3 transition hover:shadow-md">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{s.title}</p>
                    <p className="text-xs text-slate-500">
                      {s.author ? s.author.name : '익명'} · 질문 {s.questionCount} · 응답 {s.responseCount}
                      {s.endsAt && s.status === 'ACTIVE' && ` · 마감 ${new Date(s.endsAt).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })}`}
                    </p>
                  </div>
                  {s.status === 'ACTIVE' && !s.responded && <Badge tone="amber">참여하기</Badge>}
                  {s.responded && <Badge tone="green">응답 완료</Badge>}
                  <Badge tone={st.tone}>{st.label}</Badge>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
      <Pager page={page} pages={Math.max(1, Math.ceil(data.total / data.pageSize))} setPage={setPage} total={data.total} />
    </div>
  );
}
