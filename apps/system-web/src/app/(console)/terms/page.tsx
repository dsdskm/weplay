'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Copy, Eye, Pencil, Plus, RefreshCw, Send, Trash2, Upload, X } from 'lucide-react';
import { TERMS_TYPES } from '@weplay/shared';
import { MAX_ATTACHMENT_SIZE, type Attachment } from '@weplay/shared';
import { AttachmentList } from '@/components/attachments';
import { Badge, Button, Card, cn, Empty, ErrorText } from '@/components/ui';
import { Modal } from '@/components/modal';
import { useDialog } from '@/components/confirm-dialog';
import { Pager } from '@/components/pager';
import { api, errorMessage, fromLocalInput, toLocalInput, uploadAdminTermsAttachment } from '@/lib/api';
import { TermsDelivery } from './terms-delivery';

interface Row {
  id: string;
  type: string;
  version: number;
  title: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  required: boolean;
  effectiveAt: string | null;
  publishedAt: string | null;
  length: number;
  agreements: number;
  attachment?: Attachment | null;
  changeSummary?: string | null;
  notifications?: { pending: number; sent: number; failed: number; simulated: number };
}
interface Detail extends Row {
  content: string;
  _count: { agreements: number };
}
type Form = { id?: string; type: string; content: string; required: boolean; effectiveAt: string; attachment?: Attachment | null; pendingFile?: File; changeSummary?: string };
const PAGE = 10;
const pagesOf = (total: number) => Math.max(1, Math.ceil(total / PAGE));
const STATUS = { DRAFT: ['초안', 'amber'], PUBLISHED: ['게시 중', 'green'], ARCHIVED: ['보관', 'slate'] } as const;

/** 약관 관리: 종류별 버전. 초안 → 게시(이전 버전은 보관, 사용자는 다시 동의) */
export default function TermsAdminPage() {
  const qc = useQueryClient();
  const { confirm } = useDialog();
  const [type, setType] = useState<string>(TERMS_TYPES[0].key);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Form>();
  const [detailId, setDetailId] = useState<string>();
  const [error, setError] = useState<string>();
  const list = useQuery({
    queryKey: ['admin', 'terms', 'list', type, page],
    queryFn: () => api<{ userCount: number; items: Row[]; total: number }>(`/admin/terms?type=${type}&page=${page}&pageSize=${PAGE}`),
    refetchInterval: 10000,
  });
  const { data } = list;
  const detail = useQuery({ queryKey: ['admin', 'terms', 'detail', detailId], queryFn: () => api<Detail>(`/admin/terms/${detailId}`), enabled: !!detailId });
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'terms'] });
  const open = useMutation({
    mutationFn: async ({ id, clone }: { id: string; clone: boolean }) => {
      const row = await api<Detail>(`/admin/terms/${id}`);
      if (!clone && row.status !== 'DRAFT') throw new Error('게시된 약관은 수정할 수 없어요. 새 버전을 만들어 주세요.');
      return { row, clone };
    },
    onSuccess: ({ row, clone }) => {
      setDetailId(undefined);
      setError(undefined);
      setEditing({ id: clone ? undefined : row.id, type: row.type, content: row.content, required: row.type === 'SERVICE' || row.required, effectiveAt: clone ? '' : toLocalInput(row.effectiveAt), attachment: row.attachment ?? null, changeSummary: clone ? '' : row.changeSummary ?? '' });
    },
    onError: (reason) => { setDetailId(undefined); setError(errorMessage(reason)); },
  });
  const save = useMutation({
    mutationFn: async () => {
      const f = editing!;
      let attachment = f.attachment ?? null;
      if (f.pendingFile) {
        attachment = await uploadAdminTermsAttachment(f.pendingFile, f.type);
        if (attachment.mediaType !== 'FILE' || !/\.(pdf|txt|html|htm)$/i.test(attachment.url)) throw new Error('PDF, 텍스트 또는 HTML 파일 응답이 필요해요.');
        const uploaded = attachment;
        setEditing((current) => current && current.pendingFile === f.pendingFile ? { ...current, attachment: uploaded, pendingFile: undefined } : current);
      }
      const body = { type: f.type, content: f.content.trim(), required: f.type === 'SERVICE' || f.required, effectiveAt: fromLocalInput(f.effectiveAt), attachment, changeSummary: f.changeSummary?.trim() ?? '' };
      return f.id ? api(`/admin/terms/${f.id}`, { method: 'PATCH', body }) : api('/admin/terms', { body });
    },
    onMutate: () => setError(undefined),
    onSuccess: () => {
      setEditing(undefined);
      setError(undefined);
      refresh();
    },
    onError: (e) => setError(errorMessage(e)),
  });
  const publish = useMutation({
    mutationFn: (id: string) => api(`/admin/terms/${id}/publish`, { body: {} }),
    onSuccess: (_, id) => { setError(undefined); setDetailId(id); return refresh(); },
    onError: (e) => setError(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/admin/terms/${id}`, { method: 'DELETE' }),
    onSuccess: () => { setError(undefined); if (data?.items.length === 1 && page > 1) setPage(page - 1); return refresh(); },
    onError: (e) => setError(errorMessage(e)),
  });
  const selectFile = (file: File) => {
    if (!/\.(pdf|txt|html|htm)$/i.test(file.name)) return setError('PDF, 텍스트(.txt) 또는 HTML(.html, .htm) 파일을 선택해 주세요.');
    if (!file.size || file.size > MAX_ATTACHMENT_SIZE) return setError('파일 크기가 허용 범위를 벗어났어요.');
    setEditing((current) => current ? { ...current, pendingFile: file } : current);
    setError(undefined);
  };
  const busy = save.isPending;
  const acting = open.isPending || publish.isPending || remove.isPending;
  const closeEditor = () => { if (!busy) { setEditing(undefined); setError(undefined); } };
  const f = editing;
  const set = (patch: Partial<Form>) => f && setEditing({ ...f, ...patch });

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">약관 관리</h1>
          <p className="text-sm text-slate-500">종류별로 버전을 만들고, 초안을 게시하면 사용자에게 다시 동의를 받아요.</p>
        </div>
        <Button className="shrink-0" disabled={acting || busy} onClick={() => { setError(undefined); setEditing({ type, content: '', required: type === 'SERVICE' || (TERMS_TYPES.find((item) => item.key === type)?.required ?? true), effectiveAt: '', attachment: null, changeSummary: '' }); }}><Plus size={16} aria-hidden="true" />새 초안</Button>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="약관 종류">
        {TERMS_TYPES.filter((item) => item.key === 'SERVICE' || item.key === 'PRIVACY').map((t) => (
          <button
            key={t.key}
            type="button"
            aria-pressed={type === t.key}
            onClick={() => {
              setType(t.key);
              setPage(1);
            }}
            className={cn('rounded-full px-4 py-1.5 text-sm font-semibold transition', type === t.key ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200')}
          >
            {t.name}
          </button>
        ))}
      </div>
      <ErrorText>{error}</ErrorText>

      {list.isError ? <div className="space-y-2"><ErrorText>{errorMessage(list.error)}</ErrorText><Button variant="secondary" onClick={() => void list.refetch()}><RefreshCw size={16} aria-hidden="true" />다시 조회</Button></div> : !data ? (
        <p className="text-slate-400">불러오는 중…</p>
      ) : data.items.length === 0 ? (
        <Empty>아직 이 종류의 약관이 없어요.</Empty>
      ) : (
        <div className="space-y-2">
          {data.items.map((r) => {
            const [label, tone] = STATUS[r.status];
            const rate = data.userCount ? Math.round((r.agreements / data.userCount) * 100) : 0;
            return (
              <Card key={r.id} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="flex flex-wrap items-center gap-2 font-bold">
                    <span className="min-w-0 break-words">v{r.version} · {r.title}</span>
                    <Badge tone={tone}>{label}</Badge>
                    {r.type === 'SERVICE' || r.required ? <Badge tone="rose">필수</Badge> : <Badge tone="slate">선택</Badge>}
                  </p>
                  <p className="text-xs text-slate-400">
                    {r.publishedAt ? `게시 ${toLocalInput(r.publishedAt).replace('T', ' ')}` : '게시 전'} · {r.length.toLocaleString()}자
                    {r.status !== 'DRAFT' && ` · 동의 ${r.agreements}명 (${rate}%)`}
                  </p>
                  <p className="text-xs text-slate-500">시행 {r.effectiveAt ? toLocalInput(r.effectiveAt).replace('T', ' ') : '게시 시점'}</p>
                  {r.changeSummary && <p className="whitespace-pre-wrap break-words text-sm text-slate-600">{r.changeSummary}</p>}
                  {r.attachment && <AttachmentList attachments={[r.attachment]} />}
                  {r.status !== 'DRAFT' && <div className="flex flex-wrap gap-1.5 text-xs" aria-label="메일 발송 집계">
                    {r.notifications ? <>
                      <Badge tone="amber">대기 {r.notifications.pending}</Badge>
                      <Badge tone="green">발송 완료 {r.notifications.sent}</Badge>
                      <Badge tone={r.notifications.failed ? 'rose' : 'slate'}>실패 {r.notifications.failed}</Badge>
                      <Badge tone="slate">모의 발송 (SIMULATED) {r.notifications.simulated}</Badge>
                    </> : <span className="text-slate-500">메일 집계 미제공</span>}
                  </div>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" title="약관 상세 및 메일 발송 내역" aria-label={`${r.title} 상세 및 메일 발송 내역`} disabled={acting} onClick={() => { setError(undefined); setDetailId(r.id); }}><Eye size={16} aria-hidden="true" /></Button>
                  <Button variant="secondary" title="새 버전 초안 복제" aria-label={`${r.title} 새 버전 초안 복제`} disabled={acting} onClick={() => open.mutate({ id: r.id, clone: true })}><Copy size={16} aria-hidden="true" /></Button>
                  {r.status === 'DRAFT' && (
                    <>
                      <Button variant="secondary" title="초안 수정" aria-label={`${r.title} 초안 수정`} disabled={acting} onClick={() => open.mutate({ id: r.id, clone: false })}>
                        <Pencil size={16} aria-hidden="true" />
                      </Button>
                      <Button
                        disabled={acting}
                        onClick={async () => {
                          setError(undefined);
                          if (await confirm({ message: `v${r.version} 「${r.title}」을(를) 게시할까요? 게시 후 수정·삭제할 수 없으며 이전 버전은 보관됩니다. 모든 활성 계정의 이메일로 개정 안내 메일이 발송되도록 큐에 등록됩니다. 시행일은 ${r.effectiveAt ? toLocalInput(r.effectiveAt).replace('T', ' ') : '게시 시점'}이며, 미래 시행일이어도 메일 발송은 지금 요청됩니다. 사용자는 약관에 다시 동의해야 합니다.` })) publish.mutate(r.id);
                        }}
                      >
                        <Send size={16} aria-hidden="true" />게시
                      </Button>
                      <Button
                        variant="danger"
                        title="초안 삭제"
                        aria-label={`${r.title} 초안 삭제`}
                        disabled={acting}
                        onClick={async () => {
                          if (await confirm({ message: '이 초안을 삭제할까요?', danger: true })) remove.mutate(r.id);
                        }}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <Pager page={page} pages={pagesOf(data?.total ?? 0)} setPage={setPage} total={data?.total ?? 0} />
      <Modal open={!!detailId} onClose={() => { if (!open.isPending) setDetailId(undefined); }} wide title={detail.data ? `v${detail.data.version} · ${detail.data.title}` : '약관 상세'} footer={<>
        <Button variant="ghost" disabled={open.isPending} onClick={() => setDetailId(undefined)}>닫기</Button>
        <Button disabled={!detail.data || open.isPending} onClick={() => detailId && open.mutate({ id: detailId, clone: true })}><Copy size={16} aria-hidden="true" />새 버전 초안</Button>
      </>}>
        {detailId && detail.isPending && <p role="status" className="text-sm text-slate-500">불러오는 중...</p>}
        {detail.isError && <div className="space-y-2"><ErrorText>{errorMessage(detail.error)}</ErrorText><Button variant="secondary" onClick={() => void detail.refetch()}><RefreshCw size={16} aria-hidden="true" />다시 조회</Button></div>}
        {detail.data && <div className="min-w-0 space-y-4">
          <h3 className="break-words font-bold">{detail.data.title}</h3>
          <p className="text-sm text-slate-500">{detail.data.status === 'DRAFT' ? '초안' : '게시된 문서 · 수정 불가'} · 동의 {detail.data._count.agreements.toLocaleString()}명 · {detail.data.type === 'SERVICE' || detail.data.required ? '필수' : '선택'}</p>
          <p className="text-sm text-slate-500">시행 {toLocalInput(detail.data.effectiveAt).replace('T', ' ') || '게시 시점'} · 게시 {toLocalInput(detail.data.publishedAt).replace('T', ' ') || '-'}</p>
          <section className="space-y-2"><h3 className="text-sm font-bold">개정 내용</h3><p className="whitespace-pre-wrap break-words text-sm">{detail.data.changeSummary || '등록된 개정 내용 없음'}</p></section>
          {detail.data.attachment && <AttachmentList attachments={[detail.data.attachment]} />}
          {detail.data.content && <section className="space-y-2"><h3 className="text-sm font-bold">본문 / 문서 요약</h3><p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{detail.data.content}</p></section>}
          {detail.data.status !== 'DRAFT' && detailId && <TermsDelivery key={detailId} id={detailId} />}
        </div>}
      </Modal>

      <Modal
        open={!!f}
        onClose={closeEditor}
        wide
        title={f?.id ? '초안 수정' : '새 초안'}
        footer={
          <>
            <Button variant="ghost" disabled={busy} onClick={closeEditor}>
              취소
            </Button>
            <Button onClick={() => save.mutate()} disabled={(!f?.content.trim() && !f?.attachment && !f?.pendingFile) || busy}>
              {save.isPending ? '저장 중...' : '저장'}
            </Button>
          </>
        }
      >
        {f && (
          <fieldset disabled={busy} className="min-w-0 space-y-3">
            <ErrorText>{error}</ErrorText>
            <div className="grid gap-2 sm:grid-cols-3">
              <select aria-label="약관 종류" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={f.type} disabled={!!f.id} onChange={(e) => set({ type: e.target.value, required: e.target.value === 'SERVICE' || (TERMS_TYPES.find((item) => item.key === e.target.value)?.required ?? true) })}>
                {TERMS_TYPES.filter((item) => item.key === 'SERVICE' || item.key === 'PRIVACY').map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.name}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={f.type === 'SERVICE' || f.required} disabled={f.type === 'SERVICE'} onChange={(e) => set({ required: e.target.checked })} /> 필수 동의
              </label>
            </div>
            <label className="flex flex-col gap-1 text-xs text-slate-500">
              시행일 (비우면 게시 시점)
              <input type="datetime-local" className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800" value={f.effectiveAt} onChange={(e) => set({ effectiveAt: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-500">개정 내용
              <textarea className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800" value={f.changeSummary ?? ''} onChange={(e) => set({ changeSummary: e.target.value })} />
            </label>
            <div className="min-w-0 space-y-2">
              <label className="flex flex-col gap-2 text-sm font-semibold"><span className="flex items-center gap-2"><Upload size={16} aria-hidden="true" />약관 문서 (PDF / TXT / HTML)</span>
                <input type="file" accept=".pdf,.txt,.html,.htm,application/pdf,text/plain,text/html" className="block w-full min-w-0 text-sm font-normal" onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; if (file && !busy) selectFile(file); }} />
              </label>
              {f.pendingFile ? <p role="status" className="break-all text-sm text-slate-600">{f.pendingFile.name} ({Math.ceil(f.pendingFile.size / 1024).toLocaleString()} KB) · 저장 대기</p> : f.attachment && <AttachmentList attachments={[f.attachment]} />}
              {(f.pendingFile || f.attachment) && <Button variant="ghost" title="첨부 문서 제거" onClick={() => set({ attachment: null, pendingFile: undefined })}><X size={16} aria-hidden="true" />첨부 제거</Button>}
            </div>
          </fieldset>
        )}
      </Modal>
    </div>
  );
}

