'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button, Card, ErrorText, Input } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import type { AdminTeam, AdminUserDetail, GroupRow } from '@/lib/types';

type Role = 'ADMIN' | 'USER';
type Status = 'ACTIVE' | 'DEACTIVATED';
type Pick = { checked: boolean; role: Role };

interface Props {
  user?: AdminUserDetail;
  defaultPlatformRole?: 'USER' | 'MASTER';
  onClose: () => void;
}

/** 계정 추가 / 수정 팝업. 그룹은 여러 개, 팀은 한 개만 선택 가능 */
export function AccountDialog({ user, defaultPlatformRole = 'USER', onClose }: Props) {
  const qc = useQueryClient();
  const isEdit = !!user;
  const { data: groups } = useQuery({ queryKey: ['groups'], queryFn: () => api<GroupRow[]>('/admin/groups') });
  const { data: teams } = useQuery({ queryKey: ['teams'], queryFn: () => api<AdminTeam[]>('/admin/teams') });

  const [form, setForm] = useState({
    email: user?.email ?? '',
    name: user?.name ?? '',
    birthDate: user?.birthDate ? user.birthDate.slice(0, 10) : '',
    phone: user?.phone ?? '',
    password: '',
    platformRole: (user?.platformRole ?? defaultPlatformRole) as 'USER' | 'MASTER',
    status: (user?.status ?? 'ACTIVE') as Status,
  });
  const [groupPick, setGroupPick] = useState<Record<string, Pick>>(() =>
    Object.fromEntries((user?.groupMemberships ?? []).map((m) => [m.group.id, { checked: true, role: m.role }])),
  );
  const current = user?.teamMembers[0];
  const [teamId, setTeamId] = useState(current?.team.id ?? '');
  const [teamRole, setTeamRole] = useState<Role>(current?.role ?? 'USER');
  const [error, setError] = useState<string>();

  const save = useMutation({
    mutationFn: async () => {
      const profile = { email: form.email, name: form.name, birthDate: form.birthDate || null, phone: form.phone || null };
      let id = user?.id;
      if (isEdit) {
        await api(`/admin/users/${id}`, {
          method: 'PATCH',
          body: { ...profile, platformRole: form.platformRole, status: form.status, ...(form.password ? { password: form.password } : {}) },
        });
      } else {
        const created = await api<{ id: string }>('/admin/users', { body: { ...profile, password: form.password, platformRole: form.platformRole } });
        id = created.id;
      }
      const groupRows = Object.entries(groupPick)
        .filter(([, p]) => p.checked)
        .map(([groupId, p]) => ({ groupId, role: p.role }));
      const teamRows = teamId ? [{ teamId, role: teamRole }] : [];
      await api(`/admin/users/${id}/memberships`, { method: 'PUT', body: { groups: groupRows, teams: teamRows } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['user'] });
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: () => api(`/admin/users/${user?.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const resetPassword = useMutation({
    mutationFn: (password: string) => api(`/admin/users/${user?.id}/reset-password`, { body: { password } }),
    onSuccess: () => setError(undefined),
    onError: (e) => setError(errorMessage(e)),
  });

  /** 그룹 선택 해제 시, 그 그룹 소속의 팀도 해제 */
  const toggleGroup = (groupId: string, checked: boolean) => {
    setGroupPick({ ...groupPick, [groupId]: { checked, role: groupPick[groupId]?.role ?? 'USER' } });
    if (!checked && teams?.some((t) => t.id === teamId && t.group.id === groupId)) setTeamId('');
  };
  /** 팀 선택 시 그 팀의 그룹도 함께 포함 */
  const pickTeam = (id: string) => {
    setTeamId(id);
    const t = teams?.find((x) => x.id === id);
    if (t && !groupPick[t.group.id]?.checked) {
      setGroupPick({ ...groupPick, [t.group.id]: { checked: true, role: groupPick[t.group.id]?.role ?? 'USER' } });
    }
  };

  const label = 'mb-1 block text-xs font-semibold text-slate-500';
  const field = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm';
  const row = 'flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <Card className="max-h-[90vh] w-full max-w-2xl space-y-6 overflow-y-auto">
        <div onClick={(e) => e.stopPropagation()} className="space-y-6">
          <h2 className="text-lg font-bold">{isEdit ? '계정 수정' : '계정 추가'}</h2>
          {user && (user.primaryOf.groups.length > 0 || user.primaryOf.teams.length > 0) && (
            <p className="text-sm text-amber-700">
              대표:{' '}
              {[
                ...user.primaryOf.groups.map((g) => `${g.name} (GROUP_ADMIN)`),
                ...user.primaryOf.teams.map((t) => `${t.group.name} / ${t.name} (TEAM_ADMIN)`),
              ].join(', ')}
            </p>
          )}

          <form
            id="account-form"
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              setError(undefined);
              save.mutate();
            }}
          >
            <div className="sm:col-span-2">
              <span className={label}>아이디 (이메일)</span>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <span className={label}>이름</span>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <span className={label}>비밀번호 {isEdit && '(변경 시에만 입력)'}</span>
              <Input
                type="password"
                placeholder={isEdit ? '변경하지 않으려면 비워 두세요' : '8자 이상'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required={!isEdit}
              />
            </div>
            <div>
              <span className={label}>생일</span>
              <Input type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
            </div>
            <div>
              <span className={label}>전화번호</span>
              <Input placeholder="010-0000-0000" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <span className={label}>계정 유형</span>
              <select className={field} value={form.platformRole} onChange={(e) => setForm({ ...form, platformRole: e.target.value as 'USER' | 'MASTER' })}>
                <option value="USER">USER</option>
                <option value="MASTER">MASTER</option>
              </select>
            </div>
            <div>
              <span className={label}>상태</span>
              <select className={field} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Status })} disabled={!isEdit}>
                <option value="ACTIVE">ACTIVE</option>
                <option value="DEACTIVATED">DEACTIVATED</option>
              </select>
            </div>
          </form>

          <section className="space-y-2">
            <h3 className="text-sm font-bold">그룹 소속 (여러 개 가능)</h3>
            {(groups ?? []).length === 0 && <p className="text-sm text-slate-400">등록된 그룹이 없습니다.</p>}
            {(groups ?? []).map((g) => {
              const gp = groupPick[g.id];
              return (
                <div key={g.id} className={row}>
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <input type="checkbox" checked={!!gp?.checked} onChange={(e) => toggleGroup(g.id, e.target.checked)} />
                    {g.name}
                  </label>
                  {gp?.checked && (
                    <select
                      className="w-40 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      value={gp.role}
                      onChange={(e) => setGroupPick({ ...groupPick, [g.id]: { checked: true, role: e.target.value as Role } })}
                    >
                      <option value="USER">USER</option>
                      <option value="ADMIN">GROUP_ADMIN</option>
                    </select>
                  )}
                </div>
              );
            })}
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-bold">팀 소속 (한 개만 가능)</h3>
            <div className={row}>
              <select className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={teamId} onChange={(e) => pickTeam(e.target.value)}>
                <option value="">팀 없음</option>
                {teams?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.group.name} / {t.name}
                  </option>
                ))}
              </select>
              {teamId && (
                <select className="w-40 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={teamRole} onChange={(e) => setTeamRole(e.target.value as Role)}>
                  <option value="USER">USER</option>
                  <option value="ADMIN">TEAM_ADMIN</option>
                </select>
              )}
            </div>
          </section>

          <ErrorText>{error}</ErrorText>
          <div className="flex flex-wrap items-center justify-between gap-2">
            {isEdit ? (
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    const password = prompt('새 비밀번호 (8자 이상)');
                    if (password) resetPassword.mutate(password);
                  }}
                >
                  비번 재설정
                </Button>
                <Button
                  variant="danger"
                  disabled={remove.isPending}
                  onClick={() => {
                    if (confirm(`${user?.name} 계정을 삭제할까요? 되돌릴 수 없습니다.`)) remove.mutate();
                  }}
                >
                  삭제
                </Button>
              </div>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose}>
                취소
              </Button>
              <Button type="submit" form="account-form" disabled={save.isPending}>
                저장
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
