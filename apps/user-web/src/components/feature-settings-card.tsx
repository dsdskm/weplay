'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { FEATURE_SETTINGS, FeatureKey, type SettingValues } from '@weplay/shared';
import { Button, Card, ErrorText, Input } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';

/** 기능별 관리자 설정 편집 카드. 값을 바꿔도 [저장]을 눌러야 반영 */
export function FeatureSettingsCard({ groupId, feature, title }: { groupId: string; feature: FeatureKey; title: string }) {
  const qc = useQueryClient();
  const fields = FEATURE_SETTINGS[feature] ?? [];
  const key = ['group', groupId, 'feature-settings', feature];
  const [draft, setDraft] = useState<SettingValues>();
  const [error, setError] = useState<string>();

  const { data } = useQuery({ queryKey: key, queryFn: () => api<SettingValues>(`/groups/${groupId}/features/${feature}/settings`) });
  const values = { ...data, ...draft } as SettingValues;

  const save = useMutation({
    mutationFn: () => api(`/groups/${groupId}/features/${feature}/settings`, { method: 'PUT', body: values }),
    onSuccess: () => {
      setError(undefined);
      setDraft(undefined);
      qc.invalidateQueries({ queryKey: ['group', groupId, 'feature-settings'] });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  if (!data) return null;
  const set = (k: string, v: number | boolean | string) => setDraft({ ...draft, [k]: v });

  return (
    <Card className="space-y-4">
      <h2 className="font-bold">{title} 설정</h2>
      <ErrorText>{error}</ErrorText>
      <div className="space-y-3">
        {fields.map((f) => (
          <label key={f.key} className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="min-w-0 flex-1">
              <span className="font-medium text-slate-700">{f.label}</span>
              {f.help && <span className="block text-xs text-slate-400">{f.help}</span>}
            </span>
            {f.type === 'boolean' && <input type="checkbox" checked={!!values[f.key]} onChange={(e) => set(f.key, e.target.checked)} />}
            {f.type === 'number' && (
              <Input type="number" className="w-28" min={f.min} max={f.max} value={Number(values[f.key])} onChange={(e) => set(f.key, Number(e.target.value))} />
            )}
            {f.type === 'select' && (
              <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={String(values[f.key])} onChange={(e) => set(f.key, e.target.value)}>
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            )}
          </label>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => setDraft(undefined)} disabled={!draft}>
          취소
        </Button>
        <Button onClick={() => save.mutate()} disabled={!draft || save.isPending}>
          저장
        </Button>
      </div>
    </Card>
  );
}
