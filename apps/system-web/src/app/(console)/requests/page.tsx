'use client';

import { useState } from 'react';
import { RequestList } from '@/components/request-list';
import { cn } from '@/components/ui';

const tabs = [
  ['PENDING', '대기'],
  ['APPROVED', '승인'],
  ['REJECTED', '거절'],
  ['', '전체'],
] as const;

export default function RequestsPage() {
  const [status, setStatus] = useState<string>('PENDING');
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">가입 요청</h1>
      <div className="flex gap-2">
        {tabs.map(([v, l]) => (
          <button
            key={l}
            onClick={() => setStatus(v)}
            className={cn('rounded-full px-4 py-1.5 text-sm', status === v ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200')}
          >
            {l}
          </button>
        ))}
      </div>
      <RequestList status={status} />
    </div>
  );
}
