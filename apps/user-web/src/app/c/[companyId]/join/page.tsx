'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { JoinForm } from '@/components/join-form';
import { Card } from '@/components/ui';

export default function JoinGroupPage() {
  const qc = useQueryClient();
  const [done, setDone] = useState(false);
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-bold">그룹 가입</h1>
      <p className="text-slate-500">그룹 담당자에게 받은 그룹 코드를 입력하세요.</p>
      <Card>
        {done ? (
          <div className="space-y-2 text-center">
            <p className="text-4xl">📨</p>
            <p className="font-semibold">가입 요청을 보냈어요. 승인되면 그룹에 추가됩니다.</p>
            <button className="text-sm text-brand-600" onClick={() => setDone(false)}>
              다른 그룹 코드 입력
            </button>
          </div>
        ) : (
          <JoinForm
            groupOnly
            onDone={() => {
              setDone(true);
              qc.invalidateQueries({ queryKey: ['me'] });
            }}
          />
        )}
      </Card>
    </div>
  );
}
