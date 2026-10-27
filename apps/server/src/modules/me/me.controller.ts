import { Body, Controller, Delete, Get, Param, Patch } from '@nestjs/common';
import { JoinStatus, UpdateProfileInput, updateProfileSchema } from '@weplay/shared';
import { AuthUser, CurrentUser } from '../../common/decorators';
import { PrismaService } from '../../common/prisma.service';
import { ZodPipe } from '../../common/zod.pipe';
import { toPublicUser } from '../auth/auth.service';
import { requestInclude, RequestsService } from '../requests/requests.service';

@Controller('me')
export class MeController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requests: RequestsService,
  ) {}

  @Get()
  async me(@CurrentUser() user: AuthUser) {
    return toPublicUser(await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } }));
  }

  @Patch()
  async update(@CurrentUser() user: AuthUser, @Body(new ZodPipe(updateProfileSchema)) body: UpdateProfileInput) {
    return toPublicUser(await this.prisma.user.update({ where: { id: user.id }, data: body }));
  }

  /** 소속/대기/거절/차단 회사 목록 (통합 joinStatus) */
  @Get('companies')
  async companies(@CurrentUser() user: AuthUser) {
    const [memberships, requests] = await Promise.all([
      this.prisma.membership.findMany({
        where: { userId: user.id, status: { in: ['APPROVED', 'BLOCKED'] }, company: { deletedAt: null } },
        include: { company: true },
      }),
      this.prisma.membershipRequest.findMany({
        where: { userId: user.id, type: 'COMPANY_JOIN', status: { in: ['PENDING', 'REJECTED'] } },
        include: { company: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    const result = new Map<string, any>();
    for (const m of memberships) {
      result.set(m.companyId, {
        company: { id: m.company.id, name: m.company.name, description: m.company.description },
        joinStatus: m.status === 'BLOCKED' ? JoinStatus.BLOCKED : JoinStatus.APPROVED,
        role: m.role,
        isPrimaryAdmin: m.company.primaryAdminId === user.id,
        joinedAt: m.joinedAt,
      });
    }
    for (const r of requests) {
      if (result.has(r.companyId)) continue;
      result.set(r.companyId, {
        company: { id: r.company.id, name: r.company.name, description: r.company.description },
        joinStatus: r.status === 'PENDING' ? JoinStatus.PENDING : JoinStatus.REJECTED,
        requestId: r.id,
        reviewNote: r.reviewNote,
        requestedAt: r.createdAt,
      });
    }
    return [...result.values()];
  }

  @Get('requests')
  requestsList(@CurrentUser() user: AuthUser) {
    return this.prisma.membershipRequest.findMany({
      where: { userId: user.id },
      include: requestInclude,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  @Delete('requests/:id')
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.requests.cancel(user, id);
  }
}
