'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';

/** 승인 대기 가입 요청 취소. 카드 링크 안에 있어도 이동하지 않도록 기본 동작을 막는다 */
export function CancelRequestButton({ requestId }: { requestId: string }) {
  const qc = useQueryClient();
  const cancel = useMutation({
    mutationFn: () => api(`/me/requests/${requestId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group'] });
      qc.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (e) => alert(errorMessage(e)),
  });
  return (
    <button
      type="button"
      disabled={cancel.isPending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm('가입 요청을 취소할까요?')) cancel.mutate();
      }}
      className="text-xs font-semibold text-rose-600 hover:underline disabled:opacity-50"
    >
      요청 취소
    </button>
  );
}
