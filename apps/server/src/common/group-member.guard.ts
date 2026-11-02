import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ErrorCode } from '@weplay/shared';
import { AppError } from './app-error';
import { PrismaService } from './prisma.service';

/** 라우트 :groupId 에 대해 APPROVED 멤버십을 검증하고 req.groupMembership 주입 */
@Injectable()
export class GroupMemberGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const groupId: string | undefined = req.params.groupId;
    if (!groupId) return false;
    const groupMembership = await this.prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId: req.user.id, groupId } },
      include: { group: { select: { primaryAdminId: true, status: true, deletedAt: true } } },
    });
    if (!groupMembership || groupMembership.status !== 'APPROVED' || groupMembership.group.deletedAt) {
      throw new AppError(ErrorCode.NOT_GROUP_MEMBER, '그룹 구성원이 아닙니다', 403);
    }
    const { group, ...rest } = groupMembership;
    // 팀 ADMIN: 그룹 안 아무 팀에서나 ADMIN이면 관리자로 취급 (이달의 사원·칭찬·기능 신청 등)
    const teamAdmin = await this.prisma.teamMember.findFirst({
      where: { groupId, userId: req.user.id, role: 'ADMIN', team: { deletedAt: null } },
      select: { id: true },
    });
    req.groupMembership = { ...rest, isPrimaryAdmin: group.primaryAdminId === req.user.id, isTeamAdmin: !!teamAdmin };
    return true;
  }
}
