import { Injectable } from '@nestjs/common';
import { CompanyRole, ErrorCode } from '@weplay/shared';
import { AppError } from '../../common/app-error';
import { AuditService } from '../../common/audit.service';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class MembershipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async approvedMember(companyId: string, userId: string) {
    const m = await this.prisma.membership.findUnique({ where: { userId_companyId: { userId, companyId } } });
    if (m?.status !== 'APPROVED') throw new AppError(ErrorCode.NOT_COMPANY_MEMBER, '회사 구성원이 아닙니다');
    return m;
  }

  /** 대표 ADMIN 지정: 대상은 ADMIN으로 승격 */
  async setPrimaryAdmin(actorId: string, companyId: string, userId: string) {
    await this.approvedMember(companyId, userId);
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.company.findUniqueOrThrow({ where: { id: companyId } });
      await tx.membership.update({ where: { userId_companyId: { userId, companyId } }, data: { role: 'ADMIN' } });
      const company = await tx.company.update({ where: { id: companyId }, data: { primaryAdminId: userId } });
      await this.audit.log(tx, {
        companyId,
        actorId,
        action: 'company.primary_admin.changed',
        targetType: 'Company',
        targetId: companyId,
        before: { primaryAdminId: before.primaryAdminId },
        after: { primaryAdminId: userId },
      });
      return company;
    });
  }

  /** 그룹 담당 ADMIN 지정 (그룹당 1명). 대상은 그룹에 자동 가입 + 회사 ADMIN 승격 */
  async setGroupAdmin(actorId: string, groupId: string, userId: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group || group.deletedAt) throw AppError.notFound('그룹을 찾을 수 없습니다');
    await this.approvedMember(group.companyId, userId);
    return this.prisma.$transaction(async (tx) => {
      const prev = await tx.groupMember.findFirst({ where: { groupId, role: 'ADMIN' } });
      if (prev && prev.userId !== userId) {
        await tx.groupMember.update({ where: { id: prev.id }, data: { role: 'MEMBER' } });
      }
      await tx.groupMember.upsert({
        where: { groupId_userId: { groupId, userId } },
        create: { groupId, userId, companyId: group.companyId, role: 'ADMIN' },
        update: { role: 'ADMIN' },
      });
      await tx.membership.update({
        where: { userId_companyId: { userId, companyId: group.companyId } },
        data: { role: 'ADMIN' },
      });
      await this.audit.log(tx, {
        companyId: group.companyId,
        actorId,
        action: 'group.admin.changed',
        targetType: 'Group',
        targetId: groupId,
        before: { adminUserId: prev?.userId ?? null },
        after: { adminUserId: userId },
      });
      return { ok: true };
    });
  }

  /** 회사 역할 변경. USER로 강등 시 그룹 담당 해제 */
  async setRole(actorId: string, companyId: string, userId: string, role: CompanyRole) {
    if (actorId === userId) throw new AppError(ErrorCode.CANNOT_MODIFY_SELF, '자기 자신은 변경할 수 없습니다');
    const m = await this.approvedMember(companyId, userId);
    const company = await this.prisma.company.findUniqueOrThrow({ where: { id: companyId } });
    if (role === 'USER' && company.primaryAdminId === userId) {
      throw new AppError(ErrorCode.PRIMARY_ADMIN_PROTECTED, '대표 ADMIN은 강등할 수 없습니다. 먼저 대표를 변경하세요');
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.membership.update({ where: { id: m.id }, data: { role } });
      if (role === 'USER') {
        await tx.groupMember.updateMany({ where: { companyId, userId, role: 'ADMIN' }, data: { role: 'MEMBER' } });
      }
      await this.audit.log(tx, {
        companyId,
        actorId,
        action: 'membership.role.changed',
        targetType: 'Membership',
        targetId: m.id,
        before: { role: m.role },
        after: { role },
      });
      return { ok: true };
    });
  }
}
