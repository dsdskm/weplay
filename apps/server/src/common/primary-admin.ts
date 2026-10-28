import { ErrorCode } from '@weplay/shared';
import { AppError } from './app-error';
import { Tx } from './prisma.service';

/** 대표 ADMIN(그룹/팀)은 강등·제외·삭제 전에 대표를 먼저 바꿔야 함 */
export const primaryAdminProtected = () =>
  new AppError(ErrorCode.PRIMARY_ADMIN_PROTECTED, '대표 ADMIN은 강등·제외·삭제할 수 없습니다. 먼저 대표를 변경하세요');

/** 그룹에 ADMIN이 있는데 대표가 없으면 가장 먼저 지정된 ADMIN을 대표로 설정 */
export async function ensureGroupPrimary(tx: Tx, groupId: string) {
  const group = await tx.group.findUnique({ where: { id: groupId }, select: { primaryAdminId: true } });
  if (!group || group.primaryAdminId) return;
  const first = await tx.groupMembership.findFirst({ where: { groupId, role: 'ADMIN', status: 'APPROVED' }, orderBy: { joinedAt: 'asc' } });
  if (first) await tx.group.update({ where: { id: groupId }, data: { primaryAdminId: first.userId } });
}

/** 팀에 ADMIN이 있는데 대표가 없으면 가장 먼저 지정된 ADMIN을 대표로 설정 */
export async function ensureTeamPrimary(tx: Tx, teamId: string) {
  const team = await tx.team.findUnique({ where: { id: teamId }, select: { primaryAdminId: true } });
  if (!team || team.primaryAdminId) return;
  const first = await tx.teamMember.findFirst({ where: { teamId, role: 'ADMIN' }, orderBy: { joinedAt: 'asc' } });
  if (first) await tx.team.update({ where: { id: teamId }, data: { primaryAdminId: first.userId } });
}
