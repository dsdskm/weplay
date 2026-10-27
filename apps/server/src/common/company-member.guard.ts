import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ErrorCode } from '@weplay/shared';
import { AppError } from './app-error';
import { PrismaService } from './prisma.service';

/** 라우트 :companyId 에 대해 APPROVED 멤버십을 검증하고 req.membership 주입 */
@Injectable()
export class CompanyMemberGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const companyId: string | undefined = req.params.companyId;
    if (!companyId) return false;
    const membership = await this.prisma.membership.findUnique({
      where: { userId_companyId: { userId: req.user.id, companyId } },
      include: { company: { select: { primaryAdminId: true, status: true, deletedAt: true } } },
    });
    if (!membership || membership.status !== 'APPROVED' || membership.company.deletedAt) {
      throw new AppError(ErrorCode.NOT_COMPANY_MEMBER, '회사 구성원이 아닙니다', 403);
    }
    const { company, ...rest } = membership;
    req.membership = { ...rest, isPrimaryAdmin: company.primaryAdminId === req.user.id };
    return true;
  }
}
