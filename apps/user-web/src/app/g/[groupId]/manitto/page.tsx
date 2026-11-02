'use client';

import { useQuery } from '@tanstack/react-query';
import { Avatar, Badge, Card, Empty } from '@/components/ui';
import { ManittoChat } from '@/components/manitto-chat';
import { api } from '@/lib/api';
import { useGroup, useGroupId } from '@/lib/hooks';

interface ManittoStatus {
  enabled: boolean;
  round?: { id: string; startAt: string; endAt: string | null } | null;
  asGiver?: { assignmentId: string; target: { id: string; name: string; avatarUrl: string | null } } | null;
  asReceiver?: { assignmentId: string } | null;
  windowOpen?: boolean;
}

const dateTime = (iso: string) => new Date(iso).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' });

/** 마니또: 나의 마니또와 익명 채팅. 시작·종료·기간 관리는 관리자 메뉴에서 */
export default function ManittoPage() {
  const groupId = useGroupId();
  const { data: group } = useGroup();
  const { data: status } = useQuery({
    queryKey: ['group', groupId, 'manitto'],
    queryFn: () => api<ManittoStatus>(`/groups/${groupId}/manitto`),
    enabled: !!group,
  });

  if (!status) return <p className="text-slate-400">불러오는 중…</p>;

  if (!status.enabled) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-2xl font-bold">마니또</h1>
        <Card>
          <p className="text-slate-600">이 기능은 아직 그룹에서 사용할 수 없어요.</p>
        </Card>
      </div>
    );
  }

  const round = status.round;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">마니또</h1>

      {!round ? (
        <Card>
          <p className="text-slate-600">진행 중인 마니또가 없어요.</p>
        </Card>
      ) : (
        <>
          <Card className="flex flex-wrap items-center gap-3">
            <Badge tone={status.windowOpen ? 'green' : 'amber'}>{status.windowOpen ? '진행 중' : '시작 전'}</Badge>
            <span className="text-sm text-slate-500">
              {dateTime(round.startAt)} ~ {round.endAt ? dateTime(round.endAt) : '직접 종료 전까지'}
            </span>
          </Card>

          {status.asGiver && (
            <>
              <Card className="flex items-center gap-4">
                <Avatar name={status.asGiver.target.name} url={status.asGiver.target.avatarUrl} size={48} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-400">나의 마니또</p>
                  <p className="text-lg font-bold">{status.asGiver.target.name}</p>
                  <p className="text-xs text-slate-400">마니또에게는 내 이름이 보이지 않아요.</p>
                </div>
              </Card>
              <ManittoChat
                groupId={groupId}
                assignmentId={status.asGiver.assignmentId}
                title="마니또에게 보내는 메시지"
                hint="상대에게 내 이름은 보이지 않아요. 상대의 답장도 익명으로 옵니다."
              />
            </>
          )}

          {status.asReceiver && (
            <ManittoChat
              groupId={groupId}
              assignmentId={status.asReceiver.assignmentId}
              title="나에게 온 마니또 메시지"
              hint="나를 맡은 사람은 익명이에요. 답장을 보낼 수 있어요."
            />
          )}

          {!status.asGiver && !status.asReceiver && <Empty>이번 회차에 참가하지 않았어요.</Empty>}
        </>
      )}
    </div>
  );
}
