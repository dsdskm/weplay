'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { Badge, Button, Card, Empty, ErrorText, Input } from '@/components/ui';
import { NaverMap } from '@/components/naver-map';
import { Pager } from '@/components/pager';
import { useDialog } from '@/components/confirm-dialog';
import { api, errorMessage } from '@/lib/api';
import { useGroupId } from '@/lib/hooks';
import type { Paginated } from '@/lib/types';

interface Place {
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  category: string | null;
  link: string | null;
  note: string | null;
  teamId: string | null;
  teamName: string | null;
  canDelete: boolean;
}
interface PollItem {
  id: string;
  title: string;
  teamName: string | null;
  open: boolean;
  closesAt: string | null;
  dateCount: number;
  placeCount: number;
  voterCount: number;
}
interface Team {
  id: string;
  name: string;
}
interface SearchHit {
  name: string;
  address: string;
  category: string;
  link: string | null;
  lat: number;
  lng: number;
}

/** 회식 투표: 후보 장소(네이버 지도)와 날짜·장소 투표 */
export default function DinnerPage() {
  const groupId = useGroupId();
  const qc = useQueryClient();
  const { confirm } = useDialog();
  const [tab, setTab] = useState<'polls' | 'places'>('polls');
  const [error, setError] = useState<string>();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">회식 투표</h1>
      <ErrorText>{error}</ErrorText>
      <div className="flex gap-2">
        {([
          ['polls', '투표'],
          ['places', '후보 장소·지도'],
        ] as const).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={tab === k ? 'rounded-full bg-slate-900 px-4 py-1.5 text-sm text-white' : 'rounded-full bg-white px-4 py-1.5 text-sm text-slate-600 ring-1 ring-slate-200'}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'polls' ? <Polls groupId={groupId} qc={qc} onError={setError} /> : <Places groupId={groupId} qc={qc} onError={setError} confirm={confirm} />}
    </div>
  );
}

function Polls({ groupId, qc, onError }: { groupId: string; qc: ReturnType<typeof useQueryClient>; onError: (m?: string) => void }) {
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [teamId, setTeamId] = useState('');
  const [dates, setDates] = useState<string[]>(['']);
  const [placeIds, setPlaceIds] = useState<string[]>([]);
  const [closesAt, setClosesAt] = useState('');

  const { data } = useQuery({
    queryKey: ['group', groupId, 'dinner', 'polls', page],
    queryFn: () => api<Paginated<PollItem> & { enabled: boolean; canCreate: boolean; teams: Team[] }>(`/groups/${groupId}/dinner/polls?page=${page}&pageSize=10`),
  });
  const { data: places } = useQuery({
    queryKey: ['group', groupId, 'dinner', 'places', 'all', teamId],
    queryFn: () => api<Paginated<Place>>(`/groups/${groupId}/dinner/places?pageSize=100${teamId ? `&teamId=${teamId}` : '&teamId=group'}`),
    enabled: creating,
  });

  const create = useMutation({
    mutationFn: () =>
      api(`/groups/${groupId}/dinner/polls`, {
        body: { title: title.trim(), teamId: teamId || null, dates: dates.filter(Boolean), placeIds, closesAt: closesAt ? new Date(closesAt).toISOString() : null },
      }),
    onSuccess: () => {
      onError(undefined);
      setCreating(false);
      setTitle('');
      setDates(['']);
      setPlaceIds([]);
      setClosesAt('');
      qc.invalidateQueries({ queryKey: ['group', groupId, 'dinner'] });
    },
    onError: (e) => onError(errorMessage(e)),
  });

  if (!data) return <p className="text-slate-400">불러오는 중…</p>;
  if (!data.enabled) return <Card>이 기능은 아직 그룹에서 사용할 수 없어요.</Card>;

  return (
    <div className="space-y-4">
      {data.canCreate && (
        <div className="flex justify-end">
          <Button onClick={() => setCreating((v) => !v)}>{creating ? '닫기' : '투표 만들기'}</Button>
        </div>
      )}
      {creating && (
        <Card className="space-y-3">
          <h2 className="font-bold">회식 투표 만들기</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input placeholder="제목 (예: 11월 회식)" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
            <select
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={teamId}
              onChange={(e) => {
                setTeamId(e.target.value);
                setPlaceIds([]);
              }}
            >
              <option value="">그룹 전체</option>
              {data.teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} 팀
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">후보 날짜</p>
            {dates.map((d, i) => (
              <div key={i} className="flex gap-2">
                <Input type="date" value={d} onChange={(e) => setDates(dates.map((x, j) => (j === i ? e.target.value : x)))} />
                {dates.length > 1 && (
                  <Button variant="ghost" onClick={() => setDates(dates.filter((_, j) => j !== i))}>
                    빼기
                  </Button>
                )}
              </div>
            ))}
            {dates.length < 14 && (
              <Button variant="ghost" onClick={() => setDates([...dates, ''])}>
                + 날짜 추가
              </Button>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">후보 장소 ({teamId ? '팀 전용' : '그룹 공통'} 장소에서 고르기)</p>
            {places?.items.length === 0 && <p className="text-xs text-slate-400">등록된 장소가 없어요. "후보 장소·지도" 탭에서 먼저 등록해 주세요.</p>}
            <div className="grid gap-1 sm:grid-cols-2">
              {places?.items.map((p) => (
                <label key={p.id} className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm">
                  <input type="checkbox" checked={placeIds.includes(p.id)} onChange={(e) => setPlaceIds(e.target.checked ? [...placeIds, p.id] : placeIds.filter((x) => x !== p.id))} />
                  <span className="font-medium">{p.name}</span>
                  <span className="truncate text-xs text-slate-400">{p.address}</span>
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-500">
            마감 (비우면 기본 기간)
            <Input type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
          </label>
          <Button onClick={() => create.mutate()} disabled={!title.trim() || !dates.some(Boolean) || placeIds.length === 0 || create.isPending}>
            만들기
          </Button>
        </Card>
      )}

      {data.items.length === 0 ? (
        <Empty>진행 중인 투표가 없어요.</Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.items.map((p) => (
            <Link key={p.id} href={`/g/${groupId}/dinner/${p.id}`}>
              <Card className="h-full space-y-2 transition hover:shadow-md">
                <div className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate font-bold">{p.title}</p>
                  <Badge tone={p.open ? 'green' : 'slate'}>{p.open ? '투표 중' : '마감'}</Badge>
                </div>
                <p className="text-xs text-slate-500">
                  {p.teamName ? `${p.teamName} 팀` : '그룹 전체'} · 날짜 {p.dateCount} · 장소 {p.placeCount} · 참여 {p.voterCount}명
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
      <Pager page={page} pages={Math.max(1, Math.ceil(data.total / data.pageSize))} setPage={setPage} total={data.total} />
    </div>
  );
}

function Places({
  groupId,
  qc,
  onError,
  confirm,
}: {
  groupId: string;
  qc: ReturnType<typeof useQueryClient>;
  onError: (m?: string) => void;
  confirm: ReturnType<typeof useDialog>['confirm'];
}) {
  const [teamFilter, setTeamFilter] = useState('');
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', category: '', link: '', note: '', lat: '', lng: '', teamId: '' });
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);

  const { data } = useQuery({
    queryKey: ['group', groupId, 'dinner', 'places', teamFilter, page],
    queryFn: () => api<Paginated<Place> & { enabled: boolean; teams: Team[] }>(`/groups/${groupId}/dinner/places?pageSize=10&page=${page}${teamFilter ? `&teamId=${teamFilter}` : ''}`),
  });
  const { data: mapData } = useQuery({
    queryKey: ['group', groupId, 'dinner', 'places', 'map', teamFilter],
    queryFn: () => api<Paginated<Place>>(`/groups/${groupId}/dinner/places?pageSize=100${teamFilter ? `&teamId=${teamFilter}` : ''}`),
  });

  const add = useMutation({
    mutationFn: () =>
      api(`/groups/${groupId}/dinner/places`, {
        body: {
          name: form.name.trim(),
          address: form.address.trim() || null,
          category: form.category.trim() || null,
          link: form.link.trim() || null,
          note: form.note.trim() || null,
          lat: form.lat ? Number(form.lat) : null,
          lng: form.lng ? Number(form.lng) : null,
          teamId: form.teamId || null,
        },
      }),
    onSuccess: () => {
      onError(undefined);
      setAdding(false);
      setForm({ name: '', address: '', category: '', link: '', note: '', lat: '', lng: '', teamId: '' });
      setHits([]);
      setQuery('');
      qc.invalidateQueries({ queryKey: ['group', groupId, 'dinner', 'places'] });
    },
    onError: (e) => onError(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/groups/${groupId}/dinner/places/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group', groupId, 'dinner', 'places'] }),
    onError: (e) => onError(errorMessage(e)),
  });

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      setHits(await api<SearchHit[]>(`/groups/${groupId}/dinner/search?q=${encodeURIComponent(query.trim())}`));
      onError(undefined);
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setSearching(false);
    }
  };

  if (!data) return <p className="text-slate-400">불러오는 중…</p>;
  if (!data.enabled) return <Card>이 기능은 아직 그룹에서 사용할 수 없어요.</Card>;

  return (
    <div className="space-y-4">
      <NaverMap places={(mapData?.items ?? []).map((p) => ({ id: p.id, name: p.name, lat: p.lat, lng: p.lng }))} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <select
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          value={teamFilter}
          onChange={(e) => {
            setTeamFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">전체 장소</option>
          <option value="group">그룹 공통</option>
          {data.teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} 팀 장소
            </option>
          ))}
        </select>
        <Button onClick={() => setAdding((v) => !v)}>{adding ? '닫기' : '후보 장소 등록'}</Button>
      </div>

      {adding && (
        <Card className="space-y-3">
          <h2 className="font-bold">후보 장소 등록</h2>
          <div className="flex gap-2">
            <Input placeholder="네이버에서 장소 검색 (예: 강남역 삼겹살)" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && search()} />
            <Button variant="secondary" onClick={search} disabled={searching}>
              검색
            </Button>
          </div>
          {hits.length > 0 && (
            <ul className="max-h-48 divide-y divide-slate-100 overflow-auto rounded-xl border border-slate-100 text-sm">
              {hits.map((h, i) => (
                <li
                  key={i}
                  className="cursor-pointer px-3 py-2 hover:bg-slate-50"
                  onClick={() => {
                    setForm({ ...form, name: h.name, address: h.address, category: h.category, link: h.link ?? '', lat: String(h.lat), lng: String(h.lng) });
                    setHits([]);
                  }}
                >
                  <span className="font-semibold">{h.name}</span> <span className="text-xs text-slate-400">{h.address}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            <Input placeholder="장소 이름 (필수)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={80} />
            <Input placeholder="주소" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} maxLength={200} />
            <Input placeholder="종류 (예: 한식, 고깃집)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} maxLength={60} />
            <Input placeholder="링크 (선택)" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} maxLength={300} />
            <Input placeholder="위도 (지도 표시용)" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} />
            <Input placeholder="경도 (지도 표시용)" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input placeholder="메모 (선택)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} maxLength={200} />
            <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })}>
              <option value="">그룹 공통 장소</option>
              {data.teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} 팀 전용
                </option>
              ))}
            </select>
          </div>
          <Button onClick={() => add.mutate()} disabled={!form.name.trim() || add.isPending}>
            등록
          </Button>
        </Card>
      )}

      {data.items.length === 0 ? (
        <Empty>등록된 후보 장소가 없어요.</Empty>
      ) : (
        <Card className="divide-y divide-slate-100 p-0">
          {data.items.map((p) => (
            <div key={p.id} className="flex items-start gap-3 px-5 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  {p.link ? (
                    <a href={p.link} target="_blank" rel="noreferrer" className="text-brand-600 underline">
                      {p.name}
                    </a>
                  ) : (
                    p.name
                  )}
                  <Badge tone={p.teamName ? 'amber' : 'slate'}>{p.teamName ? `${p.teamName} 팀` : '그룹 공통'}</Badge>
                  {p.category && <span className="text-xs font-normal text-slate-400">{p.category}</span>}
                </p>
                <p className="text-xs text-slate-500">{p.address || '주소 없음'}</p>
                {p.note && <p className="text-xs text-slate-400">{p.note}</p>}
              </div>
              {p.canDelete && (
                <Button
                  variant="ghost"
                  onClick={async () => {
                    if (await confirm({ message: `${p.name} 장소를 삭제할까요?`, danger: true })) remove.mutate(p.id);
                  }}
                >
                  삭제
                </Button>
              )}
            </div>
          ))}
          <div className="px-5 py-3">
            <Pager page={page} pages={Math.max(1, Math.ceil(data.total / data.pageSize))} setPage={setPage} total={data.total} />
          </div>
        </Card>
      )}
    </div>
  );
}
