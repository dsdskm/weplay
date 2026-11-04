'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Badge, Button, Card, ErrorText, Input } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';

interface MailStatus {
  driver: string;
  from: string | null;
  configured: boolean;
}

interface SendResult {
  ok: boolean;
  to: string;
  subject: string;
  sentAt: string;
}

/** API 테스트: 서버 기능을 화면에서 바로 확인. 지금은 이메일 발송 테스트만 있음 */
export default function ApiTestPage() {
  const [to, setTo] = useState('');
  const { data: mail, error: mailError } = useQuery({ queryKey: ['admin', 'api-test', 'mail'], queryFn: () => api<MailStatus>('/admin/api-test/mail') });
  const send = useMutation({
    mutationFn: (email: string) => api<SendResult>('/admin/api-test/mail', { body: { to: email } }),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold">API 테스트</h1>
        <p className="text-sm text-slate-500">서버 기능을 직접 호출해서 동작을 확인합니다.</p>
      </div>

      <Card className="space-y-3">
        <h2 className="font-bold">메일 설정</h2>
        {mailError ? (
          <ErrorText>{errorMessage(mailError)}</ErrorText>
        ) : !mail ? (
          <p className="text-sm text-slate-400">불러오는 중…</p>
        ) : (
          <dl className="grid grid-cols-[6rem_1fr] gap-y-2 text-sm">
            <dt className="text-slate-500">발송 방식</dt>
            <dd>
              <Badge tone={mail.driver === 'gmail' ? 'green' : 'amber'}>{mail.driver}</Badge>
              {mail.driver !== 'gmail' && <span className="ml-2 text-xs text-slate-500">실제 발송되지 않고 서버 로그에만 남습니다</span>}
            </dd>
            <dt className="text-slate-500">발신 주소</dt>
            <dd>{mail.from ?? '-'}</dd>
            <dt className="text-slate-500">인증 설정</dt>
            <dd>{mail.configured ? '설정됨' : '누락됨 (MAIL_USER, MAIL_PASSWORD 확인)'}</dd>
          </dl>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="font-bold">이메일 발송 테스트</h2>
        <p className="text-xs text-slate-500">받는 주소로 랜덤 내용의 테스트 메일을 보냅니다.</p>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send.mutate(to);
          }}
        >
          <Input type="email" placeholder="받는 사람 이메일" value={to} onChange={(e) => setTo(e.target.value)} required />
          <Button type="submit" className="shrink-0" disabled={send.isPending || !to}>
            {send.isPending ? '발송 중…' : '보내기'}
          </Button>
        </form>
        {send.isSuccess && (
          <dl className="grid grid-cols-[6rem_1fr] gap-y-2 rounded-lg bg-emerald-50 p-3 text-sm">
            <dt className="text-slate-500">결과</dt>
            <dd className="text-emerald-700">발송 요청 완료</dd>
            <dt className="text-slate-500">받는 사람</dt>
            <dd>{send.data.to}</dd>
            <dt className="text-slate-500">제목</dt>
            <dd className="break-all">{send.data.subject}</dd>
            <dt className="text-slate-500">발송 시각</dt>
            <dd>{new Date(send.data.sentAt).toLocaleString('ko-KR')}</dd>
          </dl>
        )}
        <ErrorText>{send.isError ? errorMessage(send.error) : undefined}</ErrorText>
      </Card>
    </div>
  );
}
