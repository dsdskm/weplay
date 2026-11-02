'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Badge, Button, Card, ErrorText } from '@/components/ui';
import { Modal } from '@/components/modal';
import { MediaView } from '@/components/media-view';
import { api, errorMessage } from '@/lib/api';
import { useGroup, useGroupId } from '@/lib/hooks';
import type { FeatureItem } from '@/lib/types';
import { groupByCategory } from '@weplay/shared';

const STATUS_LABEL = {
  PENDING: { text: '검토 중', tone: 'amber' },
  APPROVED: { text: '사용 중', tone: 'green' },
  REJECTED: { text: '거절됨', tone: 'rose' },
} as const;

export default function AdminFeaturesPage() {
  const groupId = useGroupId();
  const qc = useQueryClient();
  const { data: group } = useGroup();
  const [error, setError] = useState<string>();
  const [guideOf, setGuideOf] = useState<FeatureItem>();
  const [slide, setSlide] = useState(0);

  const { data: features } = useQuery({
    queryKey: ['group', groupId, 'features'],
    queryFn: () => api<FeatureItem[]>(`/groups/${groupId}/features`),
    enabled: !!group,
  });

  const request = useMutation({
    mutationFn: (key: string) => api(`/groups/${groupId}/features/${key}/request`, { body: {} }),
    onSuccess: () => {
      setError(undefined);
      qc.invalidateQueries({ queryKey: ['group', groupId, 'features'] });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">기능 신청</h1>
      <p className="text-sm text-slate-500">신청한 기능은 MASTER 승인 후 사용할 수 있습니다.</p>
      <ErrorText>{error}</ErrorText>
      {groupByCategory(features ?? [], (f) => f.key).map((sec) => (
        <section key={sec.category.key} className="space-y-3">
          <h2 className="pt-2 text-lg font-bold">
            {sec.category.icon} {sec.category.name} <span className="text-xs font-normal text-slate-400">{sec.category.description}</span>
          </h2>
      {sec.items.map((f) => {
        const label = f.status ? STATUS_LABEL[f.status] : null;
        const inactive = f.active === false;
        const canRequest = !inactive && (!f.status || f.status === 'REJECTED');
        return (
          <Card key={f.key} className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="font-semibold">{f.name}</p>
                <p className="text-sm text-slate-500">{f.description}</p>
                {f.guide && (f.guide.summary || f.guide.body || f.guide.images?.length) ? (
                  <button type="button" onClick={() => { setSlide(0); setGuideOf(f); }} className="mt-1 text-xs font-bold text-brand-600 hover:underline">
                    ✨ 자세히 보기
                  </button>
                ) : null}
              </div>
              {inactive && <Badge tone="slate">일시 중지</Badge>}
              {f.isDefault && f.status === 'APPROVED' && !f.reviewedAt ? <Badge tone="brand">기본 제공</Badge> : label && <Badge tone={label.tone}>{label.text}</Badge>}
            </div>
            {inactive && <p className="text-sm text-slate-500">운영자가 이 기능을 잠시 멈췄어요. 다시 열리면 사용할 수 있어요.</p>}
            {f.status === 'REJECTED' && f.rejectReason && <p className="text-sm text-rose-600">거절 사유: {f.rejectReason}</p>}
            {canRequest && (
              <Button onClick={() => request.mutate(f.key)} disabled={request.isPending}>
                {f.status === 'REJECTED' ? '다시 신청' : '사용 신청'}
              </Button>
            )}
          </Card>
        );
      })}
        </section>
      ))}
      <Modal open={!!guideOf} onClose={() => setGuideOf(undefined)} title={guideOf?.name} wide>
        {guideOf?.guide && (
          <div className="space-y-4">
            {guideOf.guide.summary && <p className="text-base font-bold text-slate-700">{guideOf.guide.summary}</p>}
            {guideOf.guide.images?.length > 0 && (
              <div className="relative overflow-hidden rounded-2xl bg-slate-100">
                <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${slide * 100}%)` }}>
                  {guideOf.guide.images.map((src, i) => (
                    <div key={i} className="w-full shrink-0">
                      <MediaView url={src} type="IMAGE" className="aspect-video w-full object-cover" />
                    </div>
                  ))}
                </div>
                {guideOf.guide.images.length > 1 && (
                  <div className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-2">
                    {guideOf.guide.images.map((_, i) => (
                      <button key={i} type="button" aria-label={`${i + 1}번째 이미지`} onClick={() => setSlide(i)} className={`h-2 rounded-full transition-all ${i === slide ? 'w-6 bg-brand-600' : 'w-2 bg-white/80'}`} />
                    ))}
                  </div>
                )}
              </div>
            )}
            {guideOf.guide.body && <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{guideOf.guide.body}</div>}
          </div>
        )}
      </Modal>
    </div>
  );
}
