'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Badge, Button, Card, ErrorText } from '@/components/ui';
import { useDialog } from '@/components/confirm-dialog';
import { api, errorMessage } from '@/lib/api';
import type { TeamRow } from '@/lib/types';

const selectCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm';

/** 팀 수정 팝업. 값은 임시로 바꾸고 [저장]을 눌러야 반영. 코드 재발급·삭제는 별도 확인 후 즉시 실행 */
export function TeamEditDialog({ team, onClose }: { team: TeamRow; onClose: () => void }) {
  const { confirm } = useDialog();
  const qc = useQueryClient();
  const [draft, setDraft] = useState({
    visibility: team.visibility,
    requireApproval: team.requireApproval,
    primaryAdminId: team.primaryAdminId ?? '',
  });
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    setError(undefined);
    try {
      if (draft.visibility !== team.visibility || draft.requireApproval !== team.requireApproval) {
        await api(`/admin/teams/${team.id}`, {
          method: 'PATCH',
          body: { visibility: draft.visibility, requireApproval: draft.requireApproval },
        });
      }
      if (draft.primaryAdminId && draft.primaryAdminId !== team.primaryAdminId) {
        await api(`/admin/teams/${team.id}/primary-admin`, { method: 'PUT', body: { userId: draft.primaryAdminId } });
      }
      await qc.invalidateQueries();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (fn: () => Promise<unknown>) => {
    setError(undefined);
    try {
      await fn();
      await qc.invalidateQueries();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <Card className="w-full max-w-md space-y-4">
        <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
          <h2 className="font-bold">{team.name} 수정</h2>
          <label className="block space-y-1 text-sm">
            <span className="text-slate-500">공개 여부</span>
            <select className={selectCls} value={draft.visibility} onChange={(e) => setDraft({ ...draft, visibility: e.target.value as 'PUBLIC' | 'PRIVATE' })}>
              <option value="PUBLIC">공개</option>
              <option value="PRIVATE">비공개</option>
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-slate-500">가입 방식</span>
            <select className={selectCls} value={draft.requireApproval ? 'APPROVAL' : 'AUTO'} onChange={(e) => setDraft({ ...draft, requireApproval: e.target.value === 'APPROVAL' })}>
              <option value="APPROVAL">수동 승인</option>
              <option value="AUTO">자동 승인</option>
            </select>
          </label>
          <div className="space-y-2 text-sm">
            <span className="text-slate-500">대표 팀 ADMIN</span>
            {team.admins.length === 0 ? (
              <p className="text-xs text-slate-400">팀 ADMIN이 없습니다. 계정 관리에서 팀 ADMIN을 먼저 지정하세요.</p>
            ) : (
              <select className={selectCls} value={draft.primaryAdminId} onChange={(e) => setDraft({ ...draft, primaryAdminId: e.target.value })}>
                {!draft.primaryAdminId && <option value="">— 미지정 —</option>}
                {team.admins.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-2 border-t border-slate-100 pt-3 text-sm">
            <div className="flex items-center gap-3">
              <span className="text-slate-500">팀 코드</span>
              <span className="font-mono font-bold tracking-widest">{team.joinCode}</span>
              {!team.joinCodeEnabled && <Badge tone="rose">사용 중지</Badge>}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={async () => {
                  if (await confirm({ message: '코드를 재발급하면 이전 코드는 즉시 무효화되고, 이 팀의 모든 계정의 팀 소속이 초기화됩니다. 그룹 소속은 유지됩니다.', danger: true }))
                    await runAction(() => api(`/admin/teams/${team.id}/join-code/rotate`, { method: 'POST' }));
                }}
              >
                코드 재발급
              </Button>
            </div>
          </div>

          <ErrorText>{error}</ErrorText>
          <div className="flex flex-wrap justify-between gap-2 pt-2">
            <Button
              variant="danger"
              onClick={async () => {
                if (!(await confirm({ message: `${team.name} 팀을 삭제할까요? 되돌릴 수 없습니다.`, danger: true }))) return;
                await runAction(() => api(`/admin/teams/${team.id}`, { method: 'DELETE' }));
                onClose();
              }}
            >
              팀 삭제
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose}>
                취소
              </Button>
              <Button onClick={save} disabled={saving}>
                저장
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
