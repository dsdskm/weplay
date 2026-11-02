'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Badge, Button, Card, Empty, ErrorText, Input } from '@/components/ui';
import { Pager } from '@/components/pager';
import { api, errorMessage } from '@/lib/api';

interface Row {
  id: string;
  name: string;
  storageQuotaMb: number;
  memberCount: number;
}
const PAGE = 10;
const pagesOf = (total: number) => Math.max(1, Math.ceil(total / PAGE));

/** 스토리지 할당: 그룹별 저장 용량(MB). 사용량 집계는 준비 중 */
export default function StorageAdminPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [error, setError] = useState<string>();
  const { data } = useQuery({ queryKey: ['admin', 'storage', q, page], queryFn: () => api<{ items: Row[]; total: number }>(`/admin/storage?${q ? `q=${encodeURIComponent(q)}&` : ''}page=${page}&pageSize=${PAGE}`) });
  const save = useMutation({
    mutationFn: ({ id, mb }: { id: string; mb: number }) => api(`/admin/storage/${id}`, { method: 'PUT', body: { storageQuotaMb: mb } }),
    onSuccess: (_, v) => {
      setError(undefined);
      setDraft((d) => {
        const next = { ...d };
        delete next[v.id];
        return next;
      });
      qc.invalidateQueries({ queryKey: ['admin', 'storage'] });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">스토리지 할당</h1>
        <p className="text-sm text-slate-500">그룹마다 사진·영상을 올릴 수 있는 용량을 정해요. 사용량 집계는 준비 중이에요.</p>
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQ(search.trim());
          setPage(1);
        }}
      >
        <Input placeholder="그룹 이름 검색" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button type="submit" variant="secondary">
          검색
        </Button>
      </form>
      <ErrorText>{error}</ErrorText>

      {!data ? (
        <p className="text-slate-400">불러오는 중…</p>
      ) : data.items.length === 0 ? (
        <Empty>그룹이 없어요.</Empty>
      ) : (
        <Card className="divide-y divide-slate-100 p-0">
          {data.items.map((g) => {
            const value = draft[g.id] ?? g.storageQuotaMb;
            const dirty = draft[g.id] !== undefined && draft[g.id] !== g.storageQuotaMb;
            return (
              <div key={g.id} className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{g.name}</p>
                  <p className="text-xs text-slate-400">
                    구성원 {g.memberCount}명 · 사용량 <Badge tone="slate">집계 준비 중</Badge>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-right text-sm"
                    value={value}
                    onChange={(e) => setDraft((d) => ({ ...d, [g.id]: Number(e.target.value) }))}
                  />
                  <span className="text-xs text-slate-500">MB</span>
                  <Button disabled={!dirty || save.isPending} onClick={() => save.mutate({ id: g.id, mb: value })}>
                    저장
                  </Button>
                </div>
              </div>
            );
          })}
        </Card>
      )}
      <Pager page={page} pages={pagesOf(data?.total ?? 0)} setPage={setPage} total={data?.total ?? 0} />
    </div>
  );
}
