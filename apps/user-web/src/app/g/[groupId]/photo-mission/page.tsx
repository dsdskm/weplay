'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { Avatar, Badge, Button, Card, Empty, ErrorText, Input } from '@/components/ui';
import { MediaView } from '@/components/media-view';
import { Pager } from '@/components/pager';
import { api, errorMessage, uploadFile } from '@/lib/api';
import { useGroupId } from '@/lib/hooks';
import type { Paginated } from '@/lib/types';

interface User {
  id: string;
  name: string;
  avatarUrl: string | null;
}
interface MissionItem {
  id: string;
  theme: string;
  host: User;
  open: boolean;
  deadline: string | null;
  submissionCount: number;
  cover: { mediaUrl: string; mediaType: string } | null;
}
interface Rotation {
  mode: string;
  nextHost: User | null;
  hasOpen: boolean;
  canCreate: boolean;
}

const MODE_LABEL: Record<string, string> = { ROTATION: '돌아가며 주최', ANYONE: '누구나 주최', ADMIN_ONLY: '관리자만 주최' };

/** 사진·영상 미션: 주최 순서와 미션 목록, 새 미션 열기 */
export default function PhotoMissionsPage() {
  const groupId = useGroupId();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [theme, setTheme] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [reference, setReference] = useState<{ url: string; type: 'IMAGE' | 'VIDEO' } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();

  const { data } = useQuery({
    queryKey: ['group', groupId, 'photo-missions', page],
    queryFn: () => api<Paginated<MissionItem> & { enabled: boolean; rotation: Rotation }>(`/groups/${groupId}/photo-missions?page=${page}&pageSize=8`),
  });

  const create = useMutation({
    mutationFn: () =>
      api<{ id: string }>(`/groups/${groupId}/photo-missions`, {
        body: {
          theme: theme.trim(),
          description: description.trim() || null,
          referenceUrl: reference?.url ?? null,
          referenceType: reference?.type ?? null,
          deadline: deadline ? new Date(deadline).toISOString() : null,
        },
      }),
    onSuccess: () => {
      setError(undefined);
      setCreating(false);
      setTheme('');
      setDescription('');
      setDeadline('');
      setReference(null);
      qc.invalidateQueries({ queryKey: ['group', groupId, 'photo-missions'] });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  if (!data) return <p className="text-slate-400">불러오는 중…</p>;
  if (!data.enabled) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-2xl font-bold">사진·영상 미션</h1>
        <Card>
          <p className="text-slate-600">이 기능은 아직 그룹에서 사용할 수 없어요.</p>
        </Card>
      </div>
    );
  }

  const r = data.rotation;
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">사진·영상 미션</h1>
        {r.canCreate && <Button onClick={() => setCreating((v) => !v)}>{creating ? '닫기' : '미션 열기'}</Button>}
      </div>
      <ErrorText>{error}</ErrorText>

      <Card className="flex flex-wrap items-center gap-3 text-sm">
        <Badge tone="brand">{MODE_LABEL[r.mode] ?? r.mode}</Badge>
        {r.hasOpen ? (
          <span className="text-slate-600">진행 중인 미션이 있어요. 사진을 올려 보세요!</span>
        ) : r.mode === 'ROTATION' && r.nextHost ? (
          <span className="flex items-center gap-2 text-slate-600">
            다음 주최 차례 <Avatar name={r.nextHost.name} url={r.nextHost.avatarUrl} size={24} /> <b>{r.nextHost.name}</b>
          </span>
        ) : (
          <span className="text-slate-500">새 미션을 기다리고 있어요.</span>
        )}
      </Card>

      {creating && (
        <Card className="space-y-3">
          <h2 className="font-bold">미션 열기</h2>
          <Input placeholder="주제 (예: 오늘의 점심, 가장 귀여운 것)" value={theme} onChange={(e) => setTheme(e.target.value)} maxLength={80} />
          <textarea
            className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="설명 (선택)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
          />
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label className="rounded-xl border border-dashed border-slate-300 px-3 py-2 text-slate-600">
              {uploading ? '올리는 중…' : '예시 사진·영상 올리기 (선택)'}
              <input
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploading(true);
                  try {
                    const up = await uploadFile(groupId, file);
                    setReference({ url: up.url, type: up.mediaType });
                    setError(undefined);
                  } catch (err) {
                    setError(errorMessage(err));
                  } finally {
                    setUploading(false);
                  }
                }}
              />
            </label>
            {reference && <MediaView url={reference.url} type={reference.type} className="h-16 w-16 rounded-lg" />}
            <label className="ml-auto flex items-center gap-2 text-xs text-slate-500">
              마감 (비우면 기본 기간)
              <Input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </label>
          </div>
          <Button onClick={() => create.mutate()} disabled={!theme.trim() || create.isPending || uploading}>
            미션 시작
          </Button>
        </Card>
      )}

      {data.items.length === 0 ? (
        <Empty>아직 미션이 없어요.</Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.items.map((m) => (
            <Link key={m.id} href={`/g/${groupId}/photo-mission/${m.id}`}>
              <Card className="flex h-full gap-3 transition hover:shadow-md">
                {m.cover ? <MediaView url={m.cover.mediaUrl} type={m.cover.mediaType} className="h-20 w-20 shrink-0 rounded-xl" /> : <div className="h-20 w-20 shrink-0 rounded-xl bg-slate-100" />}
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate font-bold">{m.theme}</p>
                  <p className="text-xs text-slate-500">주최 {m.host.name}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Badge tone={m.open ? 'green' : 'slate'}>{m.open ? '진행 중' : '종료'}</Badge>
                    <span>📷 {m.submissionCount}</span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
      <Pager page={page} pages={Math.max(1, Math.ceil(data.total / data.pageSize))} setPage={setPage} total={data.total} />
    </div>
  );
}
