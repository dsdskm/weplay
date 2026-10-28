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
    const u = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    return { ...toPublicUser(u), hasPassword: !!u.passwordHash, status: u.status };
  }

  @Patch()
  async update(@CurrentUser() user: AuthUser, @Body(new ZodPipe(updateProfileSchema)) body: UpdateProfileInput) {
    return toPublicUser(await this.prisma.user.update({ where: { id: user.id }, data: body }));
  }

  /** 소속/대기/거절/차단 그룹 목록 (통합 joinStatus) */
  @Get('groups')
  async groups(@CurrentUser() user: AuthUser) {
    const [groupMemberships, requests] = await Promise.all([
      this.prisma.groupMembership.findMany({
        where: { userId: user.id, status: { in: ['APPROVED', 'BLOCKED'] }, group: { deletedAt: null } },
        include: { group: true },
      }),
      this.prisma.groupMembershipRequest.findMany({
        where: { userId: user.id, type: 'GROUP_JOIN', status: { in: ['PENDING', 'REJECTED'] } },
        include: { group: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    const result = new Map<string, any>();
    for (const m of groupMemberships) {
      result.set(m.groupId, {
        group: { id: m.group.id, name: m.group.name, description: m.group.description },
        joinStatus: m.status === 'BLOCKED' ? JoinStatus.BLOCKED : JoinStatus.APPROVED,
        role: m.role,
        isPrimaryAdmin: m.group.primaryAdminId === user.id,
        joinedAt: m.joinedAt,
      });
    }
    for (const r of requests) {
      if (result.has(r.groupId)) continue;
      result.set(r.groupId, {
        group: { id: r.group.id, name: r.group.name, description: r.group.description },
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
    return this.prisma.groupMembershipRequest.findMany({
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
