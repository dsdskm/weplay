'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { FeatureKey, groupByCategory } from '@weplay/shared';
import { Badge, Button, Card, ErrorText } from '@/components/ui';
import { FeatureSettingsCard } from '@/components/feature-settings-card';
import { useDialog } from '@/components/confirm-dialog';
import { api, errorMessage } from '@/lib/api';
import { useFeatureFlags, useGroupId } from '@/lib/hooks';
import type { Paginated } from '@/lib/types';

const ACTIVITIES: { key: FeatureKey; title: string }[] = [
  { key: FeatureKey.ROLLING_PAPER, title: '📝 롤링페이퍼' },
  { key: FeatureKey.PHOTO_MISSION, title: '📸 사진·영상 미션' },
  { key: FeatureKey.DINNER_VOTE, title: '🍻 회식 투표' },
  { key: FeatureKey.RANDOM_SURVEY, title: '📊 랜덤 설문' },
  { key: FeatureKey.SNACK_DRAW, title: '🍩 간식 쏘기' },
  { key: FeatureKey.BOARD, title: '💬 자유 게시판' },
  { key: FeatureKey.MINI_GAMES, title: '🎮 미니게임' },
  { key: FeatureKey.DUTY_ROSTER, title: '🗂️ 공통 업무' },
  { key: FeatureKey.SUGGESTION_BOX, title: '💡 건의사항' },
];

/** 관리자: 활동 기능 설정 + 설문 승인 대기 */
export default function ActivitiesAdminPage() {
  const groupId = useGroupId();
  const flags = useFeatureFlags(groupId);
  const qc = useQueryClient();
  const { prompt } = useDialog();
  const [error, setError] = useState<string>();

  const { data: pending } = useQuery({
    queryKey: ['group', groupId, 'surveys', 'pending'],
    queryFn: () => api<Paginated<{ id: string; title: string; author: { name: string } | null; questionCount: number }>>(`/groups/${groupId}/surveys?status=PENDING&pageSize=20`),
    enabled: flags.isOn(FeatureKey.RANDOM_SURVEY),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['group', groupId, 'surveys'] });
  const approve = useMutation({ mutationFn: (id: string) => api(`/groups/${groupId}/surveys/${id}/approve`, { body: {} }), onSuccess: refresh, onError: (e) => setError(errorMessage(e)) });
  const reject = useMutation({
    mutationFn: (v: { id: string; reason: string }) => api(`/groups/${groupId}/surveys/${v.id}/reject`, { body: { reason: v.reason } }),
    onSuccess: refresh,
    onError: (e) => setError(errorMessage(e)),
  });

  const enabled = ACTIVITIES.filter((a) => flags.isOn(a.key));
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-2xl font-bold">활동 기능 설정</h1>
      <ErrorText>{error}</ErrorText>
      {flags.loaded && enabled.length === 0 && <Card className="text-sm text-slate-600">사용 중인 활동 기능이 없어요. 기능 신청 메뉴에서 신청해 주세요.</Card>}

      {pending && pending.items.length > 0 && (
        <Card className="space-y-2">
          <h2 className="font-bold">승인 대기 설문 ({pending.total})</h2>
          {pending.items.map((s) => (
            <div key={s.id} className="flex items-center gap-2 text-sm">
              <Link href={`/g/${groupId}/surveys/${s.id}`} className="min-w-0 flex-1 truncate font-medium hover:underline">
                {s.title}
              </Link>
              <Badge tone="slate">{s.author?.name ?? '익명'}</Badge>
              <Button onClick={() => approve.mutate(s.id)}>승인</Button>
              <Button
                variant="secondary"
                onClick={async () => {
                  const reason = await prompt({ message: '반려 사유를 입력해 주세요', required: true });
                  if (reason) reject.mutate({ id: s.id, reason });
                }}
              >
                반려
              </Button>
            </div>
          ))}
        </Card>
      )}

      {groupByCategory(enabled, (a) => a.key).map((sec) => (
        <section key={sec.category.key} className="space-y-3">
          <h2 className="pt-2 text-lg font-bold">
            {sec.category.icon} {sec.category.name}
          </h2>
          {sec.items.map((a) => (
            <FeatureSettingsCard key={a.key} groupId={groupId} feature={a.key} title={a.title} />
          ))}
        </section>
      ))}
    </div>
  );
}
