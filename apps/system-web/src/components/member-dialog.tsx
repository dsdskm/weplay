'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Badge, Button, Card, ErrorText } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import type { GroupMember, TeamRow } from '@/lib/types';

type Role = 'ADMIN' | 'USER';
const selectCls = 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm';

/** 구성원 수정 팝업. 역할·대표 지정은 임시로 고르고 [저장]을 눌러야 반영 */
export function MemberDialog({ member, groupId, teams, onClose }: { member: GroupMember; groupId: string; teams: TeamRow[]; onClose: () => void }) {
  const qc = useQueryClient();
  const memberTeams = teams.filter((t) => member.teams.some((mt) => mt.id === t.id));

  const [groupRole, setGroupRole] = useState<Role>(member.role);
  const [groupPrimary, setGroupPrimary] = useState(member.isPrimaryAdmin);
  const [teamRoles, setTeamRoles] = useState<Record<string, Role>>(
    Object.fromEntries(memberTeams.map((t) => [t.id, member.teams.find((mt) => mt.id === t.id)?.role ?? 'USER'])),
  );
  const [teamPrimary, setTeamPrimary] = useState<Record<string, boolean>>(
    Object.fromEntries(memberTeams.map((t) => [t.id, t.primaryAdminId === member.id])),
  );
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    setError(undefined);
    try {
      if (!member.isPrimaryAdmin && groupRole !== member.role) {
        await api(`/admin/groups/${groupId}/members/${member.id}/role`, { method: 'PATCH', body: { role: groupRole } });
      }
      if (groupPrimary && !member.isPrimaryAdmin) {
        await api(`/admin/groups/${groupId}/primary-admin`, { method: 'PUT', body: { userId: member.id } });
      }
      for (const t of memberTeams) {
        const currentRole = member.teams.find((mt) => mt.id === t.id)?.role ?? 'USER';
        const isPrimary = t.primaryAdminId === member.id;
        if (!isPrimary && teamRoles[t.id] !== currentRole) {
          await api(`/admin/users/${member.id}/team-admin`, { method: 'PUT', body: { teamId: t.id, role: teamRoles[t.id] } });
        }
        if (teamPrimary[t.id] && !isPrimary) {
          await api(`/admin/teams/${t.id}/primary-admin`, { method: 'PUT', body: { userId: member.id } });
        }
      }
      await qc.invalidateQueries();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <Card className="max-h-[90vh] w-full max-w-lg space-y-5 overflow-y-auto">
        <div onClick={(e) => e.stopPropagation()} className="space-y-5">
          <div>
            <h2 className="text-lg font-bold">{member.name}</h2>
            <p className="text-sm text-slate-500">{member.email}</p>
          </div>

          <section className="space-y-2">
            <h3 className="text-sm font-bold">그룹 역할</h3>
            {member.isPrimaryAdmin ? (
              <Badge tone="brand">대표 ADMIN</Badge>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <select className={selectCls} value={groupRole} onChange={(e) => setGroupRole(e.target.value as Role)}>
                  <option value="USER">USER</option>
                  <option value="ADMIN">그룹 ADMIN</option>
                </select>
                {groupRole === 'ADMIN' && (
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={groupPrimary} onChange={(e) => setGroupPrimary(e.target.checked)} />
                    대표 ADMIN으로 지정
                  </label>
                )}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-bold">팀</h3>
            {memberTeams.length === 0 && <p className="text-sm text-slate-400">소속 팀이 없습니다.</p>}
            {memberTeams.map((t) => {
              const isPrimary = t.primaryAdminId === member.id;
              return (
                <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 p-3 text-sm">
                  <span className="font-semibold">{t.name}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {isPrimary ? (
                      <Badge tone="brand">대표 팀 ADMIN</Badge>
                    ) : (
                      <select
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                        value={teamRoles[t.id]}
                        onChange={(e) => setTeamRoles({ ...teamRoles, [t.id]: e.target.value as Role })}
                      >
                        <option value="USER">USER</option>
                        <option value="ADMIN">팀 ADMIN</option>
                      </select>
                    )}
                    {teamRoles[t.id] === 'ADMIN' && !isPrimary && (
                      <label className="flex items-center gap-1 text-xs">
                        <input type="checkbox" checked={!!teamPrimary[t.id]} onChange={(e) => setTeamPrimary({ ...teamPrimary, [t.id]: e.target.checked })} />
                        대표
                      </label>
                    )}
                  </div>
                </div>
              );
            })}
          </section>

          <ErrorText>{error}</ErrorText>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              취소
            </Button>
            <Button onClick={save} disabled={saving}>
              저장
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
