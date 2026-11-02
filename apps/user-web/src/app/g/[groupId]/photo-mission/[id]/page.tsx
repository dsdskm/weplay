'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Avatar, Badge, Button, Card, Empty, ErrorText, Input } from '@/components/ui';
import { MediaView } from '@/components/media-view';
import { useDialog } from '@/components/confirm-dialog';
import { api, errorMessage, uploadFile } from '@/lib/api';
import { useGroupId } from '@/lib/hooks';

interface Submission {
  id: string;
  mediaUrl: string;
  mediaType: string;
  caption: string | null;
  isBest: boolean;
  author: { id: string; name: string; avatarUrl: string | null };
  mine: boolean;
}
interface Mission {
  id: string;
  theme: string;
  description: string | null;
  referenceUrl: string | null;
  referenceType: string | null;
  host: { id: string; name: string; avatarUrl: string | null };
  open: boolean;
  deadline: string | null;
  isHost: boolean;
  canManage: boolean;
  bestCount: number;
  allowVideo: boolean;
  canSubmit: boolean;
  remainingSubmissions: number;
  submissions: Submission[];
}

/** 미션 상세: 주제, 제출물 갤러리, 업로드, 주최자의 베스트 컷 선정 */
export default function PhotoMissionPage() {
  const groupId = useGroupId();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { confirm } = useDialog();
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [picked, setPicked] = useState<string[] | null>(null);
  const [error, setError] = useState<string>();
  const key = ['group', groupId, 'photo-mission', id];

  const { data: mission } = useQuery({ queryKey: key, queryFn: () => api<Mission>(`/groups/${groupId}/photo-missions/${id}`) });

  const refresh = () => qc.invalidateQueries({ queryKey: ['group', groupId, 'photo-mission'] });
  const onError = (e: unknown) => setError(errorMessage(e));

  const submit = useMutation({
    mutationFn: (v: { url: string; type: 'IMAGE' | 'VIDEO' }) =>
      api(`/groups/${groupId}/photo-missions/${id}/submissions`, { body: { mediaUrl: v.url, mediaType: v.type, caption: caption.trim() || null } }),
    onSuccess: () => {
      setError(undefined);
      setCaption('');
      refresh();
    },
    onError,
  });
  const removeSub = useMutation({
    mutationFn: (sid: string) => api(`/groups/${groupId}/photo-missions/${id}/submissions/${sid}`, { method: 'DELETE' }),
    onSuccess: refresh,
    onError,
  });
  const saveBest = useMutation({
    mutationFn: (ids: string[]) => api(`/groups/${groupId}/photo-missions/${id}/best`, { method: 'PUT', body: { submissionIds: ids } }),
    onSuccess: () => {
      setError(undefined);
      setPicked(null);
      refresh();
    },
    onError,
  });
  const close = useMutation({ mutationFn: () => api(`/groups/${groupId}/photo-missions/${id}/close`, { body: {} }), onSuccess: refresh, onError });
  const removeMission = useMutation({
    mutationFn: () => api(`/groups/${groupId}/photo-missions/${id}`, { method: 'DELETE' }),
    onSuccess: () => router.replace(`/g/${groupId}/photo-mission`),
    onError,
  });

  if (!mission) return <p className="text-slate-400">불러오는 중…</p>;

  const bestIds = picked ?? mission.submissions.filter((s) => s.isBest).map((s) => s.id);
  const toggleBest = (sid: string) => {
    const base = picked ?? bestIds;
    setPicked(base.includes(sid) ? base.filter((x) => x !== sid) : base.length >= mission.bestCount ? base : [...base, sid]);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link href={`/g/${groupId}/photo-mission`} className="text-sm text-slate-500">
        ← 미션 목록
      </Link>
      <ErrorText>{error}</ErrorText>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-black">📸 {mission.theme}</h1>
          <Badge tone={mission.open ? 'green' : 'slate'}>{mission.open ? '진행 중' : '종료'}</Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Avatar name={mission.host.name} url={mission.host.avatarUrl} size={24} /> 주최 {mission.host.name}
          {mission.deadline && <span className="ml-2 text-xs">마감 {new Date(mission.deadline).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })}</span>}
        </div>
        {mission.description && <p className="whitespace-pre-wrap text-sm text-slate-600">{mission.description}</p>}
        {mission.referenceUrl && <MediaView url={mission.referenceUrl} type={mission.referenceType ?? 'IMAGE'} className="max-h-72 w-full rounded-xl" />}
      </Card>

      {mission.canSubmit && (
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">사진·영상 올리기</h2>
            <span className="text-xs text-slate-400">남은 제출 {mission.remainingSubmissions}개</span>
          </div>
          <Input placeholder="한마디 (선택)" value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={200} />
          <label className="inline-block cursor-pointer rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
            {uploading || submit.isPending ? '올리는 중…' : '파일 선택해서 올리기'}
            <input
              type="file"
              accept={mission.allowVideo ? 'image/*,video/*' : 'image/*'}
              className="hidden"
              disabled={uploading || submit.isPending}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                setUploading(true);
                try {
                  const up = await uploadFile(groupId, file);
                  submit.mutate({ url: up.url, type: up.mediaType });
                } catch (err) {
                  onError(err);
                } finally {
                  setUploading(false);
                }
              }}
            />
          </label>
        </Card>
      )}
      {mission.isHost && mission.open && <Card className="text-sm text-slate-500">주최자는 사진을 올리지 않고, 올라온 사진 중 베스트 컷을 골라요.</Card>}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">제출 {mission.submissions.length}개</h2>
          {mission.canManage && mission.submissions.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              베스트 컷 {bestIds.length}/{mission.bestCount}
              <Button variant="secondary" disabled={saveBest.isPending || picked === null} onClick={() => saveBest.mutate(bestIds)}>
                베스트 컷 확정
              </Button>
            </div>
          )}
        </div>
        {mission.submissions.length === 0 ? (
          <Empty>아직 올라온 사진이 없어요.</Empty>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mission.submissions.map((s) => {
              const best = bestIds.includes(s.id);
              return (
                <div key={s.id} className={`overflow-hidden rounded-2xl bg-white shadow-sm ring-2 ${best ? 'ring-amber-400' : 'ring-slate-100'}`}>
                  <div className="relative">
                    <MediaView url={s.mediaUrl} type={s.mediaType} className="aspect-square w-full" />
                    {best && <span className="absolute left-2 top-2 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-white">🏆 베스트 컷</span>}
                  </div>
                  <div className="space-y-1 p-3 text-sm">
                    <p className="flex items-center gap-2">
                      <Avatar name={s.author.name} url={s.author.avatarUrl} size={20} />
                      <span className="font-semibold">{s.author.name}</span>
                    </p>
                    {s.caption && <p className="text-xs text-slate-500">{s.caption}</p>}
                    <div className="flex items-center justify-between pt-1">
                      {mission.canManage ? (
                        <label className="flex items-center gap-1 text-xs text-slate-500">
                          <input type="checkbox" checked={best} onChange={() => toggleBest(s.id)} /> 베스트
                        </label>
                      ) : (
                        <span />
                      )}
                      {(s.mine || mission.canManage) && (
                        <button
                          type="button"
                          className="text-xs text-slate-400 hover:text-rose-600"
                          onClick={async () => {
                            if (await confirm({ message: '이 사진·영상을 삭제할까요?', danger: true })) removeSub.mutate(s.id);
                          }}
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {mission.canManage && (
        <div className="flex justify-end gap-2">
          {mission.open && (
            <Button
              variant="secondary"
              onClick={async () => {
                if (await confirm({ message: '미션을 끝낼까요? 끝나면 더 이상 올릴 수 없어요.' })) close.mutate();
              }}
            >
              미션 끝내기
            </Button>
          )}
          <Button
            variant="danger"
            onClick={async () => {
              if (await confirm({ message: '미션을 삭제할까요? 올라온 사진도 모두 사라져요.', danger: true })) removeMission.mutate();
            }}
          >
            삭제
          </Button>
        </div>
      )}
    </div>
  );
}
