import { Injectable } from '@nestjs/common';
import { GroupRole, ErrorCode } from '@weplay/shared';
import { AppError } from '../../common/app-error';
import { AuditService } from '../../common/audit.service';
import { ensureGroupPrimary, primaryAdminProtected } from '../../common/primary-admin';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class GroupMembershipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async approvedMember(groupId: string, userId: string) {
    const m = await this.prisma.groupMembership.findUnique({ where: { userId_groupId: { userId, groupId } } });
    if (m?.status !== 'APPROVED') throw new AppError(ErrorCode.NOT_GROUP_MEMBER, '그룹 구성원이 아닙니다');
    return m;
  }

  /** 대표 ADMIN 지정: 대상은 ADMIN으로 승격 */
  async setPrimaryAdmin(actorId: string, groupId: string, userId: string) {
    await this.approvedMember(groupId, userId);
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.group.findUniqueOrThrow({ where: { id: groupId } });
      await tx.groupMembership.update({ where: { userId_groupId: { userId, groupId } }, data: { role: 'ADMIN' } });
      const group = await tx.group.update({ where: { id: groupId }, data: { primaryAdminId: userId } });
      await this.audit.log(tx, {
        groupId,
        actorId,
        action: 'group.primary_admin.changed',
        targetType: 'Group',
        targetId: groupId,
        before: { primaryAdminId: before.primaryAdminId },
        after: { primaryAdminId: userId },
      });
      return group;
    });
  }

  /** 그룹 역할 변경. USER로 강등 시 팀 담당 해제 */
  async setRole(actorId: string, groupId: string, userId: string, role: GroupRole) {
    if (actorId === userId) throw new AppError(ErrorCode.CANNOT_MODIFY_SELF, '자기 자신은 변경할 수 없습니다');
    const m = await this.approvedMember(groupId, userId);
    const group = await this.prisma.group.findUniqueOrThrow({ where: { id: groupId } });
    if (role === 'USER' && group.primaryAdminId === userId) throw primaryAdminProtected();
    if (role === 'USER' && (await this.prisma.team.count({ where: { groupId, primaryAdminId: userId, deletedAt: null } })) > 0) {
      throw primaryAdminProtected();
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.groupMembership.update({ where: { id: m.id }, data: { role } });
      if (role === 'USER') {
        await tx.teamMember.updateMany({ where: { groupId, userId, role: 'ADMIN' }, data: { role: 'USER' } });
      } else {
        await ensureGroupPrimary(tx, groupId);
      }
      await this.audit.log(tx, {
        groupId,
        actorId,
        action: 'groupMembership.role.changed',
        targetType: 'GroupMembership',
        targetId: m.id,
        before: { role: m.role },
        after: { role },
      });
      return { ok: true };
    });
  }
}
