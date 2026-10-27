import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import {
  CreateCompanyInput,
  createCompanySchema,
  CreateGroupInput,
  createGroupSchema,
  formatJoinCode,
  SetMemberRoleInput,
  setMemberRoleSchema,
  SetUserIdInput,
  setUserIdSchema,
  UpdateCompanyInput,
  updateCompanySchema,
  UpdateGroupInput,
  updateGroupSchema,
} from '@weplay/shared';
import { AppError } from '../../common/app-error';
import { AuditService } from '../../common/audit.service';
import { AuthUser, CurrentUser } from '../../common/decorators';
import { JoinCodeService } from '../../common/join-code.service';
import { MasterGuard } from '../../common/master.guard';
import { PrismaService } from '../../common/prisma.service';
import { ZodPipe } from '../../common/zod.pipe';
import { MembershipsService } from '../requests/memberships.service';

const userSelect = { id: true, name: true, email: true } as const;

/** MASTER: 고객사·그룹·코드 관리 (system-web) */
@UseGuards(MasterGuard)
@Controller('admin')
export class AdminCompaniesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly codes: JoinCodeService,
    private readonly memberships: MembershipsService,
  ) {}

  @Get('companies')
  async list() {
    const companies = await this.prisma.company.findMany({
      where: { deletedAt: null },
      include: {
        _count: { select: { memberships: { where: { status: 'APPROVED' } }, groups: { where: { deletedAt: null } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const pending = await this.prisma.membershipRequest.groupBy({ by: ['companyId'], where: { status: 'PENDING' }, _count: true });
    const pendingMap = new Map(pending.map((p) => [p.companyId, p._count]));
    return companies.map(({ _count, ...c }) => ({
      ...c,
      joinCode: formatJoinCode(c.joinCode),
      memberCount: _count.memberships,
      groupCount: _count.groups,
      pendingCount: pendingMap.get(c.id) ?? 0,
    }));
  }

  @Post('companies')
  async create(@CurrentUser() actor: AuthUser, @Body(new ZodPipe(createCompanySchema)) body: CreateCompanyInput) {
    const joinCode = await this.codes.generate();
    return this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({ data: { ...body, joinCode, createdById: actor.id } });
      await this.audit.log(tx, { companyId: company.id, actorId: actor.id, action: 'company.created', targetType: 'Company', targetId: company.id, after: body });
      return { ...company, joinCode: formatJoinCode(company.joinCode) };
    });
  }

  @Get('companies/:id')
  async detail(@Param('id') id: string) {
    const company = await this.prisma.company.findFirst({ where: { id, deletedAt: null } });
    if (!company) throw AppError.notFound('회사를 찾을 수 없습니다');
    const [groups, members] = await Promise.all([
      this.prisma.group.findMany({
        where: { companyId: id, deletedAt: null },
        include: {
          _count: { select: { members: true } },
          members: { where: { role: 'ADMIN' }, include: { user: { select: userSelect } } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.membership.findMany({
        where: { companyId: id, status: { in: ['APPROVED', 'BLOCKED'] } },
        include: { user: { select: userSelect } },
        orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
      }),
    ]);
    return {
      ...company,
      joinCode: formatJoinCode(company.joinCode),
      groups: groups.map(({ _count, members: admins, ...g }) => ({
        ...g,
        joinCode: formatJoinCode(g.joinCode),
        memberCount: _count.members,
        admin: admins[0]?.user ?? null,
      })),
      members: members.map((m) => ({
        ...m.user,
        role: m.role,
        status: m.status,
        joinedAt: m.joinedAt,
        isPrimaryAdmin: company.primaryAdminId === m.userId,
      })),
    };
  }

  @Patch('companies/:id')
  async update(@CurrentUser() actor: AuthUser, @Param('id') id: string, @Body(new ZodPipe(updateCompanySchema)) body: UpdateCompanyInput) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.company.findUniqueOrThrow({ where: { id } });
      const company = await tx.company.update({ where: { id }, data: body });
      await this.audit.log(tx, {
        companyId: id,
        actorId: actor.id,
        action: 'company.updated',
        targetType: 'Company',
        targetId: id,
        before: { name: before.name, description: before.description, joinCodeEnabled: before.joinCodeEnabled, status: before.status },
        after: body,
      });
      return { ...company, joinCode: formatJoinCode(company.joinCode) };
    });
  }

  @Delete('companies/:id')
  async remove(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.company.update({ where: { id }, data: { deletedAt: new Date() } });
      await this.audit.log(tx, { companyId: id, actorId: actor.id, action: 'company.deleted', targetType: 'Company', targetId: id });
    });
    return { ok: true };
  }

  @Post('companies/:id/join-code/rotate')
  async rotateCompanyCode(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    const joinCode = await this.codes.generate();
    return this.prisma.$transaction(async (tx) => {
      const company = await tx.company.update({ where: { id }, data: { joinCode, joinCodeRotatedAt: new Date() } });
      await this.audit.log(tx, { companyId: id, actorId: actor.id, action: 'company.code.rotated', targetType: 'Company', targetId: id });
      return { joinCode: formatJoinCode(company.joinCode) };
    });
  }

  @Put('companies/:id/primary-admin')
  setPrimaryAdmin(@CurrentUser() actor: AuthUser, @Param('id') id: string, @Body(new ZodPipe(setUserIdSchema)) body: SetUserIdInput) {
    return this.memberships.setPrimaryAdmin(actor.id, id, body.userId);
  }

  @Patch('companies/:id/members/:userId/role')
  setRole(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body(new ZodPipe(setMemberRoleSchema)) body: SetMemberRoleInput,
  ) {
    return this.memberships.setRole(actor.id, id, userId, body.role);
  }

  @Post('companies/:id/groups')
  async createGroup(@CurrentUser() actor: AuthUser, @Param('id') companyId: string, @Body(new ZodPipe(createGroupSchema)) body: CreateGroupInput) {
    const company = await this.prisma.company.findFirst({ where: { id: companyId, deletedAt: null } });
    if (!company) throw AppError.notFound('회사를 찾을 수 없습니다');
    const joinCode = await this.codes.generate();
    return this.prisma.$transaction(async (tx) => {
      const group = await tx.group.create({ data: { ...body, companyId, joinCode, createdById: actor.id } });
      await this.audit.log(tx, { companyId, actorId: actor.id, action: 'group.created', targetType: 'Group', targetId: group.id, after: body });
      return { ...group, joinCode: formatJoinCode(group.joinCode) };
    });
  }

  @Patch('groups/:groupId')
  async updateGroup(@CurrentUser() actor: AuthUser, @Param('groupId') groupId: string, @Body(new ZodPipe(updateGroupSchema)) body: UpdateGroupInput) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.group.findUniqueOrThrow({ where: { id: groupId } });
      const group = await tx.group.update({ where: { id: groupId }, data: body });
      await this.audit.log(tx, {
        companyId: group.companyId,
        actorId: actor.id,
        action: 'group.updated',
        targetType: 'Group',
        targetId: groupId,
        before: { name: before.name, description: before.description, joinCodeEnabled: before.joinCodeEnabled },
        after: body,
      });
      return { ...group, joinCode: formatJoinCode(group.joinCode) };
    });
  }

  @Delete('groups/:groupId')
  async deleteGroup(@CurrentUser() actor: AuthUser, @Param('groupId') groupId: string) {
    await this.prisma.$transaction(async (tx) => {
      const group = await tx.group.update({ where: { id: groupId }, data: { deletedAt: new Date() } });
      await this.audit.log(tx, { companyId: group.companyId, actorId: actor.id, action: 'group.deleted', targetType: 'Group', targetId: groupId });
    });
    return { ok: true };
  }

  @Post('groups/:groupId/join-code/rotate')
  async rotateGroupCode(@CurrentUser() actor: AuthUser, @Param('groupId') groupId: string) {
    const joinCode = await this.codes.generate();
    return this.prisma.$transaction(async (tx) => {
      const group = await tx.group.update({ where: { id: groupId }, data: { joinCode, joinCodeRotatedAt: new Date() } });
      await this.audit.log(tx, { companyId: group.companyId, actorId: actor.id, action: 'group.code.rotated', targetType: 'Group', targetId: groupId });
      return { joinCode: formatJoinCode(group.joinCode) };
    });
  }

  @Put('groups/:groupId/admin')
  setGroupAdmin(@CurrentUser() actor: AuthUser, @Param('groupId') groupId: string, @Body(new ZodPipe(setUserIdSchema)) body: SetUserIdInput) {
    return this.memberships.setGroupAdmin(actor.id, groupId, body.userId);
  }
}
