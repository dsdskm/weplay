import { ErrorCode } from '@weplay/shared';
import { AppError } from './app-error';
import { PrismaService, Tx } from './prisma.service';

/** 계정은 하나의 팀에만 속할 수 있음. 다른 팀 소속이 있으면 거부 */
export async function assertOneTeam(db: Tx | PrismaService, userId: string, teamId: string) {
  const others = await db.teamMember.count({ where: { userId, NOT: { teamId } } });
  if (others > 0) throw new AppError(ErrorCode.ONE_TEAM_ONLY, '계정은 하나의 팀에만 속할 수 있습니다', 409);
}

/** 계정은 하나의 그룹에만 승인 소속될 수 있음. 다른 그룹에 승인 소속이 있으면 거부 */
export async function assertOneGroup(db: Tx | PrismaService, userId: string, groupId: string) {
  const others = await db.groupMembership.count({ where: { userId, status: 'APPROVED', NOT: { groupId } } });
  if (others > 0) throw new AppError(ErrorCode.ONE_GROUP_ONLY, '계정은 하나의 그룹에만 속할 수 있습니다', 409);
}

/** 그룹 코드 재발급 시: 그룹의 모든 계정의 그룹/팀 소속과 대표 지정을 초기화 */
export async function resetGroupMembers(tx: Tx, groupId: string) {
  const removedTeams = await tx.teamMember.deleteMany({ where: { groupId } });
  const removedGroups = await tx.groupMembership.deleteMany({ where: { groupId } });
  await tx.team.updateMany({ where: { groupId }, data: { primaryAdminId: null } });
  await tx.group.update({ where: { id: groupId }, data: { primaryAdminId: null } });
  return { groupMemberships: removedGroups.count, teamMembers: removedTeams.count };
}

/** 팀 코드 재발급 시: 팀의 모든 계정의 팀 소속과 대표 지정을 초기화 (그룹 소속은 유지) */
export async function resetTeamMembers(tx: Tx, teamId: string) {
  const removed = await tx.teamMember.deleteMany({ where: { teamId } });
  await tx.team.update({ where: { id: teamId }, data: { primaryAdminId: null } });
  return { teamMembers: removed.count };
}
