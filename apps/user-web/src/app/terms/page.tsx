'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Badge, Card, Empty } from '@/components/ui';
import { SimpleShell } from '@/components/simple-shell';
import { Tabs } from '@/components/tabs';
import { api } from '@/lib/api';
import { fmtDateTime } from '@/lib/format';

interface Terms {
  id: string;
  type: string;
  version: number;
  title: string;
  content: string;
  required: boolean;
  effectiveAt: string | null;
}

/** 약관·정책 (로그인 없이도 볼 수 있음) */
export default function TermsPage() {
  const { data } = useQuery({ queryKey: ['terms'], queryFn: () => api<Terms[]>('/terms') });
  const [tab, setTab] = useState<string>('');
  const current = data?.find((t) => t.type === tab) ?? data?.[0];
  return (
    <SimpleShell requireAuth={false}>
      <div className="space-y-4">
        <h1 className="text-2xl font-black">약관·정책</h1>
        {!data ? (
          <p className="text-slate-400">불러오는 중…</p>
        ) : data.length === 0 ? (
          <Empty>게시된 약관이 없어요.</Empty>
        ) : (
          <>
            <Tabs value={current?.type ?? ''} onChange={setTab} items={data.map((t) => ({ key: t.type, label: t.title }))} />
            {current && (
              <Card className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold">{current.title}</h2>
                  <Badge tone="slate">v{current.version}</Badge>
                  {current.required ? <Badge tone="rose">필수</Badge> : <Badge tone="slate">선택</Badge>}
                </div>
                {current.effectiveAt && <p className="text-xs text-slate-400">시행일 {fmtDateTime(current.effectiveAt)}</p>}
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{current.content}</div>
              </Card>
            )}
          </>
        )}
      </div>
    </SimpleShell>
  );
}
