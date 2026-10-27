import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApproveRequestInput,
  approveRequestSchema,
  formatJoinCode,
  RejectRequestInput,
  rejectRequestSchema,
} from '@weplay/shared';
import { AppError } from '../../common/app-error';
import { CompanyMemberGuard } from '../../common/company-member.guard';
import { AuthUser, CurrentMembership, CurrentUser, MembershipContext } from '../../common/decorators';
import { PrismaService } from '../../common/prisma.service';
import { ZodPipe } from '../../common/zod.pipe';
import { RequestsService } from '../requests/requests.service';

const userSelect = { id: true, name: true, email: true, avatarUrl: true } as const;

/** 회사 구성원용 API (user-web) */
@UseGuards(CompanyMemberGuard)
@Controller('companies/:companyId')
export class CompaniesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requests: RequestsService,
  ) {}

  @Get()
  async company(@Param('companyId') companyId: string, @CurrentMembership() m: MembershipContext) {
    const company = await this.prisma.company.findUniqueOrThrow({ where: { id: companyId } });
    const [memberCount, groupCount, pendingCount] = await Promise.all([
      this.prisma.membership.count({ where: { companyId, status: 'APPROVED' } }),
      this.prisma.group.count({ where: { companyId, deletedAt: null } }),
      m.role === 'ADMIN' ? this.prisma.membershipRequest.count({ where: { companyId, status: 'PENDING' } }) : 0,
    ]);
    return {
      id: company.id,
      name: company.name,
      description: company.description,
      joinCode: m.role === 'ADMIN' ? formatJoinCode(company.joinCode) : undefined,
      memberCount,
      groupCount,
      pendingCount,
      me: { role: m.role, isPrimaryAdmin: m.isPrimaryAdmin, joinedAt: m.joinedAt },
    };
  }

  @Get('groups')
  async groups(@Param('companyId') companyId: string, @CurrentUser() user: AuthUser, @CurrentMembership() m: MembershipContext) {
    const groups = await this.prisma.group.findMany({
      where: { companyId, deletedAt: null },
      include: {
        _count: { select: { members: true } },
        members: { where: { OR: [{ role: 'ADMIN' }, { userId: user.id }] }, include: { user: { select: userSelect } } },
      },
      orderBy: { name: 'asc' },
    });
    return groups.map((g) => {
      const admin = g.members.find((x) => x.role === 'ADMIN');
      const mine = g.members.find((x) => x.userId === user.id);
      const canManage = m.isPrimaryAdmin || mine?.role === 'ADMIN';
      return {
        id: g.id,
        name: g.name,
        description: g.description,
        memberCount: g._count.members,
        admin: admin?.user ?? null,
        isMine: !!mine,
        myRole: mine?.role ?? null,
        joinCode: canManage ? formatJoinCode(g.joinCode) : undefined,
      };
    });
  }

  @Get('groups/:groupId/members')
  async groupMembers(@Param('companyId') companyId: string, @Param('groupId') groupId: string) {
    const group = await this.prisma.group.findFirst({ where: { id: groupId, companyId, deletedAt: null } });
    if (!group) throw AppError.notFound('그룹을 찾을 수 없습니다');
    const members = await this.prisma.groupMember.findMany({
      where: { groupId },
      include: { user: { select: userSelect } },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    });
    return {
      group: { id: group.id, name: group.name, description: group.description },
      members: members.map((x) => ({ ...x.user, groupRole: x.role, joinedAt: x.joinedAt })),
    };
  }

  @Get('members')
  async members(@Param('companyId') companyId: string, @Query('q') q?: string) {
    const company = await this.prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { primaryAdminId: true } });
    const members = await this.prisma.membership.findMany({
      where: {
        companyId,
        status: 'APPROVED',
        ...(q ? { user: { OR: [{ name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] } } : {}),
      },
      include: {
        user: {
          select: {
            ...userSelect,
            groupMembers: { where: { companyId, group: { deletedAt: null } }, select: { group: { select: { id: true, name: true } } } },
          },
        },
      },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    });
    return members.map(({ user: { groupMembers, ...u }, ...m }) => ({
      ...u,
      role: m.role,
      isPrimaryAdmin: company.primaryAdminId === u.id,
      joinedAt: m.joinedAt,
      groups: groupMembers.map((g) => g.group),
    }));
  }

  @Get('requests')
  requestList(@Param('companyId') companyId: string, @CurrentMembership() m: MembershipContext, @Query('status') status?: string) {
    if (m.role !== 'ADMIN') throw AppError.forbidden();
    return this.requests.list({ companyId, ...(status ? { status: status as any } : {}) });
  }

  @Post('requests/:requestId/approve')
  approve(
    @Param('companyId') companyId: string,
    @Param('requestId') requestId: string,
    @CurrentUser() user: AuthUser,
    @CurrentMembership() membership: MembershipContext,
    @Body(new ZodPipe(approveRequestSchema)) body: ApproveRequestInput,
  ) {
    return this.requests.approve({ user, membership }, requestId, body, companyId);
  }

  @Post('requests/:requestId/reject')
  reject(
    @Param('companyId') companyId: string,
    @Param('requestId') requestId: string,
    @CurrentUser() user: AuthUser,
    @CurrentMembership() membership: MembershipContext,
    @Body(new ZodPipe(rejectRequestSchema)) body: RejectRequestInput,
  ) {
    return this.requests.reject({ user, membership }, requestId, body.reason, companyId);
  }
}
