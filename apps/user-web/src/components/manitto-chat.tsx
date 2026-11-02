'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button, Card, ErrorText, Input } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';

interface Message {
  id: string;
  body: string;
  createdAt: string;
  mine: boolean;
}

/** 마니또 익명 채팅방. 3초마다 새 메시지를 가져옴 (실시간 푸시는 SSE로 확장 가능) */
export function ManittoChat({ groupId, assignmentId, title, hint }: { groupId: string; assignmentId: string; title: string; hint: string }) {
  const qc = useQueryClient();
  const key = ['group', groupId, 'manitto', 'messages', assignmentId];
  const [text, setText] = useState('');
  const [error, setError] = useState<string>();

  const { data } = useQuery({
    queryKey: key,
    queryFn: () => api<{ windowOpen: boolean; items: Message[] }>(`/groups/${groupId}/manitto/assignments/${assignmentId}/messages`),
    refetchInterval: 3000,
  });

  const send = useMutation({
    mutationFn: (body: string) => api(`/groups/${groupId}/manitto/assignments/${assignmentId}/messages`, { body: { body } }),
    onSuccess: () => {
      setError(undefined);
      setText('');
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const submit = () => {
    if (!text.trim() || !data?.windowOpen || send.isPending) return;
    send.mutate(text.trim());
  };

  return (
    <Card className="space-y-3">
      <div>
        <h2 className="font-bold">{title}</h2>
        <p className="text-xs text-slate-400">{hint}</p>
      </div>
      <div className="max-h-80 space-y-2 overflow-y-auto rounded-xl bg-slate-50 p-3">
        {data?.items.length === 0 && <p className="text-center text-sm text-slate-400">아직 메시지가 없어요.</p>}
        {data?.items.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.mine ? 'items-end' : 'items-start'}`}>
            <span className="mb-0.5 text-[11px] text-slate-400">{m.mine ? '나' : '익명'}</span>
            <p className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${m.mine ? 'bg-brand-600 text-white' : 'bg-white text-slate-700'}`}>{m.body}</p>
          </div>
        ))}
      </div>
      <ErrorText>{error}</ErrorText>
      <div className="flex gap-2">
        <Input
          className="flex-1"
          placeholder={data?.windowOpen ? '익명으로 메시지 보내기' : '지금은 보낼 수 없어요'}
          value={text}
          maxLength={500}
          disabled={!data?.windowOpen}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) submit();
          }}
        />
        <Button onClick={submit} disabled={!text.trim() || !data?.windowOpen || send.isPending}>
          보내기
        </Button>
      </div>
    </Card>
  );
}
