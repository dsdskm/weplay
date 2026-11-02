'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Badge, Button, Card, ErrorText } from '@/components/ui';
import { NaverMap } from '@/components/naver-map';
import { useDialog } from '@/components/confirm-dialog';
import { api, errorMessage } from '@/lib/api';
import { useGroupId } from '@/lib/hooks';

interface Poll {
  id: string;
  title: string;
  open: boolean;
  closesAt: string | null;
  voters: number;
  multiDate: boolean;
  multiPlace: boolean;
  canClose: boolean;
  teamId: string | null;
  dates: { id: string; date: string; votes: number; voted: boolean }[];
  places: { id: string; place: { id: string; name: string; address: string | null; lat: number | null; lng: number | null; category: string | null; link: string | null }; votes: number; voted: boolean }[];
  topDateId: string | null;
  topPlaceId: string | null;
}

const fmtDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });

/** 회식 투표 상세: 지도와 날짜·장소 투표, 결과 막대 */
export default function DinnerPollPage() {
  const groupId = useGroupId();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { confirm } = useDialog();
  const [dateIds, setDateIds] = useState<string[]>([]);
  const [placeIds, setPlaceIds] = useState<string[]>([]);
  const [error, setError] = useState<string>();

  const { data: poll } = useQuery({ queryKey: ['group', groupId, 'dinner', 'poll', id], queryFn: () => api<Poll>(`/groups/${groupId}/dinner/polls/${id}`) });

  useEffect(() => {
    if (!poll) return;
    setDateIds(poll.dates.filter((d) => d.voted).map((d) => d.id));
    setPlaceIds(poll.places.filter((p) => p.voted).map((p) => p.id));
  }, [poll]);

  const refresh = () => qc.invalidateQueries({ queryKey: ['group', groupId, 'dinner'] });
  const onError = (e: unknown) => setError(errorMessage(e));

  const vote = useMutation({
    mutationFn: () => api(`/groups/${groupId}/dinner/polls/${id}/votes`, { method: 'PUT', body: { dateIds, placeIds } }),
    onSuccess: () => {
      setError(undefined);
      refresh();
    },
    onError,
  });
  const close = useMutation({ mutationFn: () => api(`/groups/${groupId}/dinner/polls/${id}/close`, { body: {} }), onSuccess: refresh, onError });
  const remove = useMutation({
    mutationFn: () => api(`/groups/${groupId}/dinner/polls/${id}`, { method: 'DELETE' }),
    onSuccess: () => router.replace(`/g/${groupId}/dinner`),
    onError,
  });

  if (!poll) return <p className="text-slate-400">불러오는 중…</p>;

  const maxDate = Math.max(1, ...poll.dates.map((d) => d.votes));
  const maxPlace = Math.max(1, ...poll.places.map((p) => p.votes));
  const pick = (list: string[], set: (v: string[]) => void, multi: boolean, v: string) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : multi ? [...list, v] : [v]);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link href={`/g/${groupId}/dinner`} className="text-sm text-slate-500">
        ← 회식 투표
      </Link>
      <ErrorText>{error}</ErrorText>
      <Card className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-black">🍻 {poll.title}</h1>
          <Badge tone={poll.open ? 'green' : 'slate'}>{poll.open ? '투표 중' : '마감'}</Badge>
        </div>
        <p className="text-xs text-slate-500">
          참여 {poll.voters}명{poll.closesAt && ` · 마감 ${new Date(poll.closesAt).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })}`}
        </p>
      </Card>

      <NaverMap places={poll.places.map((p) => ({ id: p.id, name: p.place.name, lat: p.place.lat, lng: p.place.lng, highlight: p.id === poll.topPlaceId }))} height={280} />

      <Card className="space-y-3">
        <h2 className="font-bold">날짜 {poll.multiDate ? '(여러 개 선택 가능)' : '(하나만 선택)'}</h2>
        {poll.dates.map((d) => (
          <label key={d.id} className="block space-y-1">
            <span className="flex items-center gap-2 text-sm">
              <input type={poll.multiDate ? 'checkbox' : 'radio'} name="date" disabled={!poll.open} checked={dateIds.includes(d.id)} onChange={() => pick(dateIds, setDateIds, poll.multiDate, d.id)} />
              <span className="font-medium">{fmtDate(d.date)}</span>
              {d.id === poll.topDateId && <Badge tone="amber">1위</Badge>}
              <span className="ml-auto text-xs text-slate-500">{d.votes}표</span>
            </span>
            <div className="h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-brand-500" style={{ width: `${(d.votes / maxDate) * 100}%` }} />
            </div>
          </label>
        ))}
      </Card>

      <Card className="space-y-3">
        <h2 className="font-bold">장소 {poll.multiPlace ? '(여러 개 선택 가능)' : '(하나만 선택)'}</h2>
        {poll.places.map((p) => (
          <label key={p.id} className="block space-y-1">
            <span className="flex items-center gap-2 text-sm">
              <input type={poll.multiPlace ? 'checkbox' : 'radio'} name="place" disabled={!poll.open} checked={placeIds.includes(p.id)} onChange={() => pick(placeIds, setPlaceIds, poll.multiPlace, p.id)} />
              <span className="font-medium">{p.place.name}</span>
              {p.id === poll.topPlaceId && <Badge tone="amber">1위</Badge>}
              <span className="truncate text-xs text-slate-400">{p.place.address}</span>
              <span className="ml-auto shrink-0 text-xs text-slate-500">{p.votes}표</span>
            </span>
            <div className="h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${(p.votes / maxPlace) * 100}%` }} />
            </div>
          </label>
        ))}
      </Card>

      <div className="flex flex-wrap justify-between gap-2">
        {poll.open ? (
          <Button onClick={() => vote.mutate()} disabled={vote.isPending}>
            투표 저장
          </Button>
        ) : (
          <span />
        )}
        {poll.canClose && (
          <div className="flex gap-2">
            {poll.open && (
              <Button
                variant="secondary"
                onClick={async () => {
                  if (await confirm({ message: '투표를 마감할까요?' })) close.mutate();
                }}
              >
                마감하기
              </Button>
            )}
            <Button
              variant="danger"
              onClick={async () => {
                if (await confirm({ message: '투표를 삭제할까요?', danger: true })) remove.mutate();
              }}
            >
              삭제
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
