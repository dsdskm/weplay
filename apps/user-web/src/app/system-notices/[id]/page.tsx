'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { SYSTEM_NOTICE_LEVELS } from '@weplay/shared';
import { Badge, Card } from '@/components/ui';
import { SimpleShell } from '@/components/simple-shell';
import { api } from '@/lib/api';
import { fmtDateTime } from '@/lib/format';

/** 서비스(시스템) 공지 상세 */
export default function SystemNoticePage() {
  const { id } = useParams<{ id: string }>();
  const { data: n } = useQuery({ queryKey: ['system-notices', id], queryFn: () => api<{ title: string; body: string; level: string; createdAt: string }>(`/system-notices/${id}`) });
  const level = SYSTEM_NOTICE_LEVELS.find((l) => l.key === n?.level);
  return (
    <SimpleShell>
      {!n ? (
        <p className="text-slate-400">불러오는 중…</p>
      ) : (
        <Card className="wp-pop-in space-y-3">
          <Badge tone={n.level === 'URGENT' ? 'rose' : n.level === 'MAINTENANCE' ? 'amber' : 'brand'}>
            {level?.icon} {level?.name}
          </Badge>
          <h1 className="text-2xl font-black">{n.title}</h1>
          <p className="text-sm text-slate-400">{fmtDateTime(n.createdAt)}</p>
          <p className="whitespace-pre-wrap leading-relaxed">{n.body}</p>
        </Card>
      )}
    </SimpleShell>
  );
}
