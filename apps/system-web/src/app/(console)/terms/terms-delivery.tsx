'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { Badge, Button, Empty, ErrorText } from '@/components/ui';
import { api, errorMessage, toLocalInput } from '@/lib/api';

interface Notification {
    id: string;
    userId: string;
    email: string;
    status: string;
    attempts: number;
    sentAt: string | null;
    lastError: string | null;
}

const DELIVERY = {
    PENDING: ['대기', 'amber'],
    SENDING: ['발송 중', 'amber'],
    SENT: ['발송 완료', 'green'],
    FAILED: ['실패', 'rose'],
    SIMULATED: ['모의 발송 (SIMULATED)', 'slate'],
    SKIPPED: ['발송 제외', 'slate'],
} as const;

export function TermsDelivery({ id }: { id: string }) {
    const qc = useQueryClient();
    const notifications = useQuery({
        queryKey: ['admin', 'terms', 'notifications', id],
        queryFn: () => api<Notification[]>(`/admin/terms/${id}/notifications`),
        refetchInterval: 10000,
    });
    const retry = useMutation({
        mutationFn: () => api<{ ok: true }>(`/admin/terms/${id}/notifications/retry`, { body: {} }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'terms'] }),
    });
    const items = notifications.data;
    const retryable = items?.filter((item) => item.status === 'FAILED' || item.status === 'SIMULATED').length ?? 0;

    return <section className="min-w-0 space-y-3 border-t border-slate-100 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold">메일 발송 내역</h3>
            <div className="flex flex-wrap gap-2">
                <Button variant="secondary" title="메일 발송 상태 새로고침" aria-label="메일 발송 상태 새로고침" disabled={notifications.isFetching || retry.isPending} onClick={() => void notifications.refetch()}><RefreshCw size={16} aria-hidden="true" /></Button>
                <Button variant="secondary" disabled={!retryable || retry.isPending || notifications.isFetching || notifications.isError} onClick={() => retry.mutate()}><RefreshCw size={16} aria-hidden="true" />{retry.isPending ? '재시도 요청 중...' : `미발송 ${retryable}건 재시도`}</Button>
            </div>
        </div>
        <ErrorText>{notifications.isError ? errorMessage(notifications.error) : undefined}</ErrorText>
        <ErrorText>{retry.isError ? errorMessage(retry.error) : undefined}</ErrorText>
        {retry.isSuccess && <p role="status" className="text-sm text-emerald-700">실패 및 모의 발송 건의 재시도를 요청했어요.</p>}
        {notifications.isPending && <p role="status" className="text-sm text-slate-500">발송 내역을 불러오는 중...</p>}
        {items?.length === 0 && <Empty>메일 발송 내역이 없어요.</Empty>}
        {!!items?.length && <>
            <div className="flex flex-wrap gap-2" aria-label="메일 발송 집계">
                {Object.entries(DELIVERY).map(([status, [label, tone]]) => <Badge key={status} tone={tone}>{label} {items.filter((item) => item.status === status).length}</Badge>)}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <caption className="sr-only">수신자별 약관 개정 메일 발송 상태</caption>
                    <thead className="border-b border-slate-200 text-slate-500"><tr><th scope="col" className="p-2">수신자</th><th scope="col" className="p-2">상태</th><th scope="col" className="p-2">시도</th><th scope="col" className="p-2">발송일</th><th scope="col" className="p-2">마지막 오류</th></tr></thead>
                    <tbody>{items.map((item) => {
                        const delivery = DELIVERY[item.status as keyof typeof DELIVERY];
                        return <tr key={item.id} className="border-b border-slate-100 align-top">
                            <td className="max-w-56 break-all p-2"><p>{item.email}</p><p className="text-slate-400">{item.userId}</p></td>
                            <td className="p-2"><Badge tone={delivery?.[1] ?? 'slate'}>{delivery?.[0] ?? item.status}</Badge></td>
                            <td className="p-2">{item.attempts}</td>
                            <td className="whitespace-nowrap p-2">{toLocalInput(item.sentAt).replace('T', ' ') || '-'}</td>
                            <td className="min-w-32 max-w-64 break-words p-2 text-rose-600">{item.lastError || '-'}</td>
                        </tr>;
                    })}</tbody>
                </table>
            </div>
        </>}
    </section>;
}