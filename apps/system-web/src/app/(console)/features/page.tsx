'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { FEATURE_CATALOG, FEATURE_CATEGORIES, groupByCategory } from '@weplay/shared';
import { useDialog } from '@/components/confirm-dialog';
import { Pager } from '@/components/pager';
import { Badge, Button, Card, cn, Empty, ErrorText, Input } from '@/components/ui';
import { api, assetUrl, errorMessage, uploadAdminImage } from '@/lib/api';
import { Modal } from '@/components/modal';

interface FeatureRequest {
  id: string;
  groupId: string;
  /** 기본 탑재로 신청 기록 없이 사용 중 */
  byDefault?: boolean;
  feature: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectReason: string | null;
  reviewedAt: string | null;
  updatedAt: string;
  group: { id: string; name: string };
}

interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

interface CatalogItem {
  key: string;
  name: string;
  description: string;
  category: string;
  active: boolean;
  guide?: { summary: string | null; body: string | null; images: string[] };
  isDefault: boolean;
  counts: Record<'PENDING' | 'APPROVED' | 'REJECTED', number>;
}

const STATUS_BADGE = {
  PENDING: { text: '대기', tone: 'amber' },
  APPROVED: { text: '승인', tone: 'green' },
  REJECTED: { text: '거절', tone: 'rose' },
} as const;

const PAGE_SIZE = 10;
const pagesOf = (total: number) => Math.max(1, Math.ceil(total / PAGE_SIZE));

type Tab = 'CATALOG' | 'PENDING' | 'DONE';
const TABS: { key: Tab; label: string }[] = [
  { key: 'CATALOG', label: '기능 목록' },
  { key: 'PENDING', label: '승인 대기' },
  { key: 'DONE', label: '처리 완료' },
];

const FEATURE_ICON: Record<string, string> = {
  EMPLOYEE_OF_THE_MONTH: '🏅',
  COMPLIMENT_CARD: '💌',
  POINTS_BADGE: '🏆',
  MANITTO: '🤫',
  ROLLING_PAPER: '📝',
  PHOTO_MISSION: '📸',
  DINNER_VOTE: '🍻',
  RANDOM_SURVEY: '📊',
  SNACK_DRAW: '🍩',
  BOARD: '💬',
  MINI_GAMES: '🎮',
};

const featureName = (key: string) => FEATURE_CATALOG.find((f) => f.key === key)?.name ?? key;

export default function FeaturesPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('CATALOG');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string>();
  const [rejecting, setRejecting] = useState<{ id: string; reason: string }>();
  const [category, setCategory] = useState<string>('ALL');

  const { data: catalog } = useQuery({
    queryKey: ['admin', 'features', 'catalog'],
    queryFn: () => api<CatalogItem[]>('/admin/features/catalog'),
    enabled: tab === 'CATALOG',
  });

  const { data } = useQuery({
    queryKey: ['admin', 'features', tab, page],
    queryFn: () =>
      api<Paginated<FeatureRequest>>(
        `/admin/features?status=${tab === 'PENDING' ? 'PENDING' : 'APPROVED,REJECTED'}&page=${page}&pageSize=${PAGE_SIZE}`,
      ),
    enabled: tab !== 'CATALOG',
    refetchInterval: 15_000,
  });

  const review = useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: 'approve' | 'reject'; reason?: string }) =>
      api(`/admin/features/${id}/${action}`, { body: action === 'reject' ? { reason } : {} }),
    onSuccess: () => {
      setError(undefined);
      setRejecting(undefined);
      qc.invalidateQueries({ queryKey: ['admin', 'features'] });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const list = data?.items ?? [];

  return (
    <div className={cn('mx-auto space-y-4', tab === 'CATALOG' ? 'max-w-6xl' : 'max-w-3xl')}>
      <h1 className="text-2xl font-bold">기능 관리</h1>
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              setPage(1);
            }}
            className={tab === t.key ? 'rounded-full bg-slate-900 px-4 py-1.5 text-sm text-white' : 'rounded-full bg-white px-4 py-1.5 text-sm text-slate-600 ring-1 ring-slate-200'}
          >
            {t.label}
          </button>
        ))}
      </div>
      <ErrorText>{error}</ErrorText>

      {tab === 'CATALOG' && (
        <>
          {catalog?.length === 0 && <Empty>등록된 기능이 없습니다.</Empty>}
          {catalog && (
            <p className="text-sm text-slate-500">
              활성 {catalog.filter((f) => f.active).length} / 전체 {catalog.length}. 비활성으로 바꾸면 모든 그룹에서 메뉴가 사라지고 신청도 막히지만, 승인 기록과 데이터는 남아 다시 켜면 그대로 돌아옵니다.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {[{ key: 'ALL', name: '전체', icon: '✨' }, ...FEATURE_CATEGORIES].map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setCategory(c.key)}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all',
                  category === c.key ? 'bg-slate-900 text-white shadow' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50',
                )}
              >
                {c.icon} {c.name}
                {catalog && c.key !== 'ALL' && <span className="ml-1 opacity-60">{catalog.filter((f) => f.category === c.key).length}</span>}
              </button>
            ))}
          </div>
          {groupByCategory(catalog ?? [], (f) => f.key)
            .filter((g) => category === 'ALL' || g.category.key === category)
            .map((g) => (
              <section key={g.category.key} className="space-y-3">
                <div className="flex items-baseline gap-2 pt-2">
                  <h2 className="text-lg font-bold">
                    {g.category.icon} {g.category.name}
                  </h2>
                  <span className="text-xs text-slate-400">
                    {g.category.description} · 활성 {g.items.filter((f) => f.active).length}/{g.items.length}
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {g.items.map((f, i) => (
                    <FeatureCard key={f.key} item={f} index={i} onError={setError} />
                  ))}
                </div>
              </section>
            ))}
        </>
      )}

      {tab !== 'CATALOG' && list.length === 0 && <Empty>신청이 없습니다.</Empty>}
      {tab !== 'CATALOG' &&
        list.map((r) => (
          <Card key={r.id} className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="font-semibold">{r.group.name}</p>
                <p className="text-sm text-slate-500">{featureName(r.feature)}</p>
              </div>
              <Badge tone={STATUS_BADGE[r.status].tone}>{STATUS_BADGE[r.status].text}</Badge>
            </div>
            {r.status === 'REJECTED' && r.rejectReason && <p className="text-sm text-rose-600">거절 사유: {r.rejectReason}</p>}
            {r.status === 'PENDING' && rejecting?.id !== r.id && (
              <div className="flex gap-2">
                <Button onClick={() => review.mutate({ id: r.id, action: 'approve' })} disabled={review.isPending}>
                  승인
                </Button>
                <Button variant="ghost" onClick={() => setRejecting({ id: r.id, reason: '' })}>
                  거절
                </Button>
              </div>
            )}
            {rejecting?.id === r.id && (
              <div className="flex gap-2">
                <Input
                  className="flex-1"
                  placeholder="거절 사유"
                  value={rejecting.reason}
                  onChange={(e) => setRejecting({ id: r.id, reason: e.target.value })}
                />
                <Button
                  variant="danger"
                  disabled={!rejecting.reason.trim() || review.isPending}
                  onClick={() => review.mutate({ id: r.id, action: 'reject', reason: rejecting.reason.trim() })}
                >
                  거절 확정
                </Button>
              </div>
            )}
          </Card>
        ))}
      {tab !== 'CATALOG' && data && <Pager page={page} pages={pagesOf(data.total)} setPage={setPage} total={data.total} />}
    </div>
  );
}

/** 기능 카드(그리드): 활성 스위치, 상태 집계, 그룹 목록(펼치면 한 줄 전체 사용, 승인된 그룹은 회수 가능) */
function FeatureCard({ item, index, onError }: { item: CatalogItem; index: number; onError: (msg: string) => void }) {
  const qc = useQueryClient();
  const { confirm } = useDialog();
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [revoking, setRevoking] = useState<{ id: string; reason: string }>();
  const [guideOpen, setGuideOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ['admin', 'features', 'grants', item.key, page],
    queryFn: () => api<Paginated<FeatureRequest>>(`/admin/features/grants?feature=${item.key}&page=${page}&pageSize=${PAGE_SIZE}`),
    enabled: open,
  });

  const revoke = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api(`/admin/features/catalog/${item.key}/groups/${id}/revoke`, { body: { reason } }),
    onSuccess: () => {
      onError('');
      setRevoking(undefined);
      qc.invalidateQueries({ queryKey: ['admin', 'features'] });
    },
    onError: (e) => onError(errorMessage(e)),
  });

  const toggle = useMutation({
    mutationFn: (active: boolean) => api(`/admin/features/catalog/${item.key}/active`, { method: 'PUT', body: { active } }),
    onSuccess: () => {
      onError('');
      qc.invalidateQueries({ queryKey: ['admin', 'features', 'catalog'] });
    },
    onError: (e) => onError(errorMessage(e)),
  });

  const setDefault = useMutation({
    mutationFn: (isDefault: boolean) => api<{ autoApproved: number }>(`/admin/features/catalog/${item.key}/default`, { method: 'PUT', body: { isDefault } }),
    onSuccess: () => {
      onError('');
      qc.invalidateQueries({ queryKey: ['admin', 'features'] });
    },
    onError: (e) => onError(errorMessage(e)),
  });

  const onDefault = async () => {
    const next = !item.isDefault;
    const ok = await confirm(
      next
        ? { message: `${item.name}을(를) 기본 탑재로 지정할까요? 신청하지 않은 모든 그룹이 바로 쓸 수 있고, 대기 중인 신청 ${item.counts.PENDING}건은 자동 승인돼요. 회수·거절한 그룹은 그대로 막혀 있어요.` }
        : { message: `${item.name} 기본 탑재를 해제할까요? 신청·승인 기록이 없는 그룹에서는 더 이상 쓸 수 없어요.`, danger: true },
    );
    if (ok) setDefault.mutate(next);
  };

  const onToggle = async () => {
    const next = !item.active;
    const ok = await confirm(
      next
        ? { message: `${item.name} 기능을 활성화할까요? 승인된 그룹에서 바로 다시 쓸 수 있어요.` }
        : { message: `${item.name} 기능을 비활성화할까요? 사용 중인 그룹 ${item.counts.APPROVED}곳에서 메뉴가 사라지고 신청도 막혀요. (데이터는 유지)`, danger: true },
    );
    if (ok) toggle.mutate(next);
  };

  return (
    <Card
      className={cn(
        'fv-card relative flex flex-col gap-3 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg',
        open && 'sm:col-span-2 lg:col-span-3',
        !item.active && 'bg-slate-50',
      )}
    >
      <div style={{ animationDelay: `${index * 50}ms` }} className="fv-pop flex items-start gap-3">
        <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl transition-all duration-500', item.active ? 'bg-brand-50' : 'bg-slate-200 grayscale')}>
          {FEATURE_ICON[item.key] ?? '🧩'}
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn('font-bold transition-colors', !item.active && 'text-slate-400')}>{item.name}</p>
          <p className="text-xs text-slate-500">{item.description}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={item.active}
          aria-label={`${item.name} ${item.active ? '비활성화' : '활성화'}`}
          disabled={toggle.isPending}
          onClick={onToggle}
          className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300', item.active ? 'bg-emerald-500' : 'bg-slate-300')}
        >
          <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all duration-300', item.active ? 'left-6' : 'left-1')} />
        </button>
      </div>
      <button
        type="button"
        onClick={onDefault}
        disabled={setDefault.isPending}
        className={cn(
          'flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-all duration-300',
          item.isDefault ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200' : 'bg-slate-50 text-slate-500 ring-1 ring-slate-100 hover:bg-slate-100',
        )}
      >
        <span>
          <b>기본 탑재</b> · {item.isDefault ? '신청 없이 모든 그룹에서 사용' : '그룹이 신청하고 승인받아야 사용'}
        </span>
        <span className={cn('relative h-5 w-9 shrink-0 rounded-full transition-colors duration-300', item.isDefault ? 'bg-brand-500' : 'bg-slate-300')}>
          <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all duration-300', item.isDefault ? 'left-[18px]' : 'left-0.5')} />
        </span>
      </button>
      <div className="mt-auto flex flex-wrap items-center gap-2">
        <Badge tone={item.active ? 'green' : 'slate'}>{item.active ? '활성' : '비활성'}</Badge>
        <Badge tone="amber">대기 {item.counts.PENDING}</Badge>
        <Badge tone="brand">사용 중 {item.counts.APPROVED}</Badge>
        <Badge tone="rose">거절 {item.counts.REJECTED}</Badge>
        <Button variant="ghost" onClick={() => setGuideOpen(true)}>
          📝 설명 편집
        </Button>
        <Button variant="ghost" className="ml-auto" onClick={() => setOpen((v) => !v)}>
          {open ? '닫기' : '그룹 보기'}
        </Button>
      </div>

      {open && (
        <div className="space-y-2 border-t border-slate-100 pt-3">
          {!data || data.total === 0 ? (
            <p className="text-sm text-slate-400">{item.isDefault ? '그룹이 없습니다.' : '신청한 그룹이 없습니다.'}</p>
          ) : (
            <>
              {data.items.map((g) => (
                <div key={g.groupId} className="space-y-2 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex-1 font-medium">{g.group.name}</span>
                    {g.byDefault ? <Badge tone="brand">기본 탑재</Badge> : <Badge tone={STATUS_BADGE[g.status].tone}>{STATUS_BADGE[g.status].text}</Badge>}
                    {g.status === 'APPROVED' && revoking?.id !== g.groupId && (
                      <Button variant="danger" onClick={() => setRevoking({ id: g.groupId, reason: '' })}>
                        회수
                      </Button>
                    )}
                  </div>
                  {g.status === 'REJECTED' && g.rejectReason && <p className="text-xs text-rose-600">사유: {g.rejectReason}</p>}
                  {revoking?.id === g.groupId && (
                    <div className="flex gap-2">
                      <Input
                        className="flex-1"
                        placeholder="회수 사유 (그룹에 표시됩니다)"
                        value={revoking.reason}
                        onChange={(e) => setRevoking({ id: g.groupId, reason: e.target.value })}
                      />
                      <Button
                        variant="danger"
                        disabled={!revoking.reason.trim() || revoke.isPending}
                        onClick={() => revoke.mutate({ id: g.groupId, reason: revoking.reason.trim() })}
                      >
                        회수 확정
                      </Button>
                      <Button variant="ghost" onClick={() => setRevoking(undefined)}>
                        취소
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              <Pager page={page} pages={pagesOf(data.total)} setPage={setPage} total={data.total} />
            </>
          )}
        </div>
      )}
      {guideOpen && <GuideEditor item={item} onClose={() => setGuideOpen(false)} />}
    </Card>
  );
}

/** 기능 설명 편집 (MASTER): 한 줄 소개, 본문, 이미지. [저장]을 눌러야 반영 */
function GuideEditor({ item, onClose }: { item: CatalogItem; onClose: () => void }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [summary, setSummary] = useState(item.guide?.summary ?? '');
  const [body, setBody] = useState(item.guide?.body ?? '');
  const [images, setImages] = useState<string[]>(item.guide?.images ?? []);
  const [error, setError] = useState<string>();
  const upload = useMutation({
    mutationFn: (file: File) => uploadAdminImage(file),
    onSuccess: (r) => setImages((x) => [...x, r.url].slice(0, 8)),
    onError: (e) => setError(errorMessage(e)),
  });
  const save = useMutation({
    mutationFn: () => api(`/admin/features/catalog/${item.key}/guide`, { method: 'PUT', body: { summary: summary.trim() || null, body: body.trim() || null, images } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'features', 'catalog'] });
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });
  return (
    <Modal
      open
      onClose={onClose}
      wide
      title={`${item.name} 설명 편집`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            저장
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <ErrorText>{error}</ErrorText>
        <div className="space-y-1">
          <p className="text-sm font-semibold">한 줄 소개</p>
          <Input placeholder="예: 점심 메뉴를 함께 정하고 투표해요" value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={120} />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold">자세한 설명</p>
          <textarea className="min-h-32 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm leading-relaxed" value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000} placeholder="무엇을 할 수 있는지, 어떻게 쓰는지 적어 주세요" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">이미지 (최대 8장)</p>
            <Button variant="secondary" disabled={upload.isPending || images.length >= 8} onClick={() => fileRef.current?.click()}>
              {upload.isPending ? '올리는 중…' : '이미지 추가'}
            </Button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload.mutate(e.target.files[0])} />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {images.map((src, i) => (
              <div key={src} className="relative overflow-hidden rounded-xl ring-1 ring-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={assetUrl(src)} alt={`설명 이미지 ${i + 1}`} className="aspect-video w-full object-cover" />
                <button type="button" aria-label="이미지 빼기" onClick={() => setImages(images.filter((x) => x !== src))} className="absolute right-1 top-1 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
                  ✕
                </button>
              </div>
            ))}
            {images.length === 0 && <p className="col-span-full text-xs text-slate-400">이미지가 없어요. 화면 캡처나 안내 사진을 올려 주세요.</p>}
          </div>
        </div>
      </div>
    </Modal>
  );
}
