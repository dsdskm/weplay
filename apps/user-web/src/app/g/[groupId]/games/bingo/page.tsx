'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { Avatar, Button, Card, cn, ErrorText, Input } from '@/components/ui';
import { useDialog } from '@/components/confirm-dialog';
import { Confetti, medal } from '@/components/games/fx';
import { MediaView } from '@/components/media-view';
import { Modal } from '@/components/modal';
import { api, assetUrl, errorMessage, uploadFile } from '@/lib/api';
import type { BingoState } from '@/lib/games';
import { useGroupId } from '@/lib/hooks';

/** 팀 사진 빙고: 칸 미션에 맞는 사진으로 칸을 채우고 줄을 완성 */
export default function BingoPage() {
  const groupId = useGroupId();
  const qc = useQueryClient();
  const { confirm } = useDialog();
  const [cell, setCell] = useState<number>();
  const [view, setView] = useState<number>();
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [party, setParty] = useState(0);
  const [error, setError] = useState<string>();
  const fileRef = useRef<HTMLInputElement>(null);
  const { data } = useQuery({ queryKey: ['group', groupId, 'games', 'bingo'], queryFn: () => api<BingoState>(`/groups/${groupId}/games/bingo`), refetchInterval: 30_000 });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['group', groupId, 'games', 'bingo'] });
    qc.invalidateQueries({ queryKey: ['group', groupId, 'points'] });
  };
  const fill = useMutation({
    mutationFn: (body: { index: number; mediaUrl: string; mediaType: string; caption?: string }) => api<{ newLines: number }>(`/groups/${groupId}/games/bingo/cells`, { body }),
    onSuccess: (r) => {
      setCell(undefined);
      setCaption('');
      if (r.newLines > 0) setParty((p) => p + 1);
      refresh();
    },
    onError: (e) => setError(errorMessage(e)),
  });
  const clear = useMutation({ mutationFn: (id: string) => api(`/groups/${groupId}/games/bingo/cells/${id}`, { method: 'DELETE' }), onSuccess: refresh, onError: (e) => setError(errorMessage(e)) });

  if (!data) return <p className="text-slate-400">불러오는 중…</p>;
  const b = data.board;
  const inLine = new Set((b?.lines ?? []).flat());
  const pick = async (file: File) => {
    if (cell === undefined) return;
    setUploading(true);
    try {
      const up = await uploadFile(groupId, file);
      await fill.mutateAsync({ index: cell, mediaUrl: up.url, mediaType: up.mediaType, caption: caption.trim() || undefined });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setUploading(false);
    }
  };
  const viewing = b && view !== undefined ? b.cells[view] : undefined;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {party > 0 && <Confetti key={party} count={90} />}
      <Link href={`/g/${groupId}/games`} className="text-sm text-slate-500">
        ← 게임
      </Link>
      <div className="wp-gradient rounded-3xl bg-gradient-to-br from-pink-500 via-rose-400 to-orange-300 p-6 text-white shadow-xl">
        <p className="text-xs font-bold uppercase tracking-widest opacity-80">팀 협동</p>
        <h1 className="text-3xl font-black">📸 사진 빙고</h1>
        <p className="mt-1 text-sm opacity-90">
          칸의 미션에 맞는 사진을 찍어 올려요. 한 줄을 완성할 때마다 팀원 모두 +{data.lineReward}P! {b && `한 사람은 ${b.perMember}칸까지 채울 수 있어요 (내가 채운 칸 ${b.myCount})`}
        </p>
      </div>
      <ErrorText>{error}</ErrorText>

      {!b ? (
        <Card>팀에 들어가면 팀 빙고판이 생겨요.</Card>
      ) : (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <p className="font-bold">{data.team?.name} 팀 · {b.week} 주</p>
            <p className="text-sm font-black text-rose-500">빙고 {b.lines.length}줄</p>
          </div>
          <div className={cn('grid gap-2', b.size === 4 ? 'grid-cols-4' : 'grid-cols-3')}>
            {b.cells.map((c, i) => {
              const lined = inLine.has(c.index);
              return (
                <button
                  key={c.index}
                  type="button"
                  style={{ animationDelay: `${i * 40}ms` }}
                  onClick={() => (c.photo ? setView(c.index) : setCell(c.index))}
                  className={cn(
                    'wp-pop-in relative aspect-square overflow-hidden rounded-2xl text-left shadow-sm ring-2 transition hover:-translate-y-0.5',
                    lined ? 'wp-glow ring-rose-400' : c.photo ? 'ring-emerald-300' : 'ring-dashed ring-slate-200 bg-slate-50',
                  )}
                >
                  {c.photo ? (
                    <>
                      {c.photo.mediaType === 'VIDEO' ? (
                        <video src={assetUrl(c.photo.mediaUrl)} className="h-full w-full object-cover" muted />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={assetUrl(c.photo.mediaUrl)} alt={c.mission} className="h-full w-full object-cover" />
                      )}
                      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-[11px] font-bold text-white">{c.mission}</span>
                      {lined && <span className="absolute right-1.5 top-1.5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-black text-white">BINGO</span>}
                    </>
                  ) : (
                    <span className="flex h-full flex-col items-center justify-center gap-1 p-2 text-center">
                      <span className="text-2xl opacity-50">📷</span>
                      <span className="text-xs font-bold text-slate-600 sm:text-sm">{c.mission}</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      <Card className="space-y-2">
        <h2 className="font-bold">🏁 팀별 빙고 현황</h2>
        <p className="text-xs text-slate-400">모든 팀의 빙고판 칸 수가 같고, 큰 팀은 한 사람이 채울 수 있는 칸이 적어요. 인원이 많아도 여러 사람이 참여해야 해요.</p>
        {data.ranking.map((r) => (
          <div key={r.team.id} className={cn('flex items-center gap-2 rounded-xl px-3 py-2 text-sm', r.isMine && 'bg-rose-50')}>
            <span className="w-6 text-center">{medal(r.rank) ?? r.rank}</span>
            <span className="flex-1 truncate font-semibold">{r.team.name}</span>
            <span className="text-xs text-slate-500">
              {r.filled}/{r.total}칸
            </span>
            <span className="w-14 text-right font-black text-rose-500">{r.lines}줄</span>
          </div>
        ))}
      </Card>

      <Modal
        open={cell !== undefined}
        onClose={() => setCell(undefined)}
        title={b && cell !== undefined ? `“${b.cells[cell].mission}”` : ''}
        footer={
          <Button disabled={uploading || fill.isPending} onClick={() => fileRef.current?.click()}>
            {uploading ? '올리는 중…' : '사진 찍기 / 고르기'}
          </Button>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-500">미션에 맞는 사진을 올려 주세요. 팀원이 보고 웃을 수 있게 재밌게!</p>
          <Input placeholder="한 줄 설명 (선택)" value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={100} />
          <input ref={fileRef} type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
        </div>
      </Modal>

      <Modal open={!!viewing} onClose={() => setView(undefined)} title={viewing?.mission}>
        {viewing?.photo && (
          <div className="space-y-3">
            <MediaView url={viewing.photo.mediaUrl} type={viewing.photo.mediaType as 'IMAGE' | 'VIDEO'} className="w-full rounded-2xl" />
            <p className="flex items-center gap-2 text-sm">
              <Avatar name={viewing.photo.user?.name ?? '?'} url={viewing.photo.user?.avatarUrl} size={24} />
              <b>{viewing.photo.user?.name}</b> {viewing.photo.caption}
            </p>
            {viewing.photo.canDelete && (
              <Button
                variant="ghost"
                className="text-rose-600"
                onClick={async () => {
                  if (await confirm({ message: '이 칸의 사진을 지울까요? 줄 보상은 그대로예요.', danger: true })) {
                    clear.mutate(viewing.photo!.id);
                    setView(undefined);
                  }
                }}
              >
                사진 지우기
              </Button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
