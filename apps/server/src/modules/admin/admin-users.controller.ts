import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import type { Prisma } from '@weplay/db';
import {
  adminCreateUserSchema,
  AdminCreateUserInput,
  updateUserSchema,
  UpdateUserInput,
  userMembershipsSchema,
  UserMembershipsInput,
  CreateMasterInput,
  createMasterSchema,
  ErrorCode,
  ResetPasswordInput,
  resetPasswordSchema,
  SetUserStatusInput,
  setUserStatusSchema,
  userStatusSchema,
} from '@weplay/shared';
import { z } from 'zod';
import { AppError } from '../../common/app-error';
import { AuditService } from '../../common/audit.service';
import { AuthUser, CurrentUser } from '../../common/decorators';
import { MasterGuard } from '../../common/master.guard';
import { PrismaService, Tx } from '../../common/prisma.service';
import { ZodPipe } from '../../common/zod.pipe';
import { ensureGroupPrimary, ensureTeamPrimary, primaryAdminProtected } from '../../common/primary-admin';
import { assertOneGroup, assertOneTeam } from '../../common/team-rule';

const teamAdminSchema = z.object({ teamId: z.string().min(1), role: z.enum(['ADMIN', 'USER']) });
const grantGroupMembershipSchema = z.object({ groupId: z.string().min(1), role: z.enum(['ADMIN', 'USER']) });
const bulkSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1).max(500),
  action: z.discriminatedUnion('type', [
    z.object({ type: z.literal('status'), status: userStatusSchema }),
    z.object({ type: z.literal('group'), groupId: z.string().min(1), role: z.enum(['ADMIN', 'USER']) }),
    z.object({ type: z.literal('team'), teamId: z.string().min(1) }),
    z.object({ type: z.literal('delete') }),
  ]),
});
type BulkInput = z.infer<typeof bulkSchema>;

const listSelect = {
  id: true,
  name: true,
  email: true,
  username: true,
  birthDate: true,
  phone: true,
  platformRole: true,
  status: true,
  googleSub: true,
  lastLoginAt: true,
  createdAt: true,
  groupMemberships: {
    where: { status: 'APPROVED' },
    orderBy: { joinedAt: 'asc' },
    select: { role: true, group: { select: { id: true, name: true } } },
  },
  teamMembers: {
    where: { team: { deletedAt: null } },
    orderBy: { joinedAt: 'asc' },
    select: { role: true, team: { select: { id: true, name: true, group: { select: { id: true, name: true } } } } },
  },
} satisfies Prisma.UserSelect;

const detailSelect = {
  ...listSelect,
  groupMemberships: {
    orderBy: { joinedAt: 'asc' },
    select: { role: true, status: true, joinedAt: true, group: { select: { id: true, name: true } } },
  },
  teamMembers: {
    orderBy: { joinedAt: 'asc' },
    select: { role: true, joinedAt: true, team: { select: { id: true, name: true, group: { select: { id: true, name: true } } } } },
  },
} satisfies Prisma.UserSelect;

@UseGuards(MasterGuard)
@Controller('admin')
export class AdminUsersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get('dashboard')
  async dashboard() {
    const [users, masters, groups, teams, pendingRequests] = await Promise.all([
      this.prisma.user.count({ where: { platformRole: 'USER' } }),
      this.prisma.user.count({ where: { platformRole: 'MASTER' } }),
      this.prisma.group.count({ where: { deletedAt: null } }),
      this.prisma.team.count({ where: { deletedAt: null } }),
      this.prisma.groupMembershipRequest.count({ where: { status: 'PENDING' } }),
    ]);
    // 그룹별 집계: 구성원, 팀, 그룹 ADMIN, 팀 ADMIN, 대기 요청
    const groupRows = await this.prisma.group.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        primaryAdminId: true,
        _count: {
          select: {
            groupMemberships: { where: { status: 'APPROVED' } },
            teams: { where: { deletedAt: null } },
            requests: { where: { status: 'PENDING' } },
          },
        },
        groupMemberships: { where: { status: 'APPROVED', role: 'ADMIN' }, select: { userId: true } },
        teams: { where: { deletedAt: null }, select: { members: { where: { role: 'ADMIN' }, select: { userId: true } } } },
      },
    });
    const groupStats = groupRows.map((g) => ({
      id: g.id,
      name: g.name,
      memberCount: g._count.groupMemberships,
      teamCount: g._count.teams,
      pendingCount: g._count.requests,
      groupAdminCount: g.groupMemberships.length,
      teamAdminCount: new Set(g.teams.flatMap((t) => t.members.map((m) => m.userId))).size,
      hasPrimary: !!g.primaryAdminId,
    }));
    return { users, masters, groups, teams, pendingRequests, groupStats };
  }

  @Get('users')
  async users(
    @Query('q') q?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('adminScope') adminScope?: string,
    @Query('groupId') groupId?: string,
    @Query('teamId') teamId?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('sort') sort?: string,
    @Query('dir') dir?: string,
  ) {
    const size = Math.min(Math.max(Number(pageSize) || 20, 1), 100);
    const sortable = ['name', 'email', 'status', 'lastLoginAt', 'createdAt'] as const;
    type SortField = (typeof sortable)[number];
    const field = sortable.find((f) => f === sort) as SortField | undefined;
    const orderBy: Prisma.UserOrderByWithRelationInput = field
      ? { [field]: dir === 'asc' ? 'asc' : 'desc' }
      : { createdAt: 'desc' };
    const current = Math.max(Number(page) || 1, 1);
    const where: Prisma.UserWhereInput = {
      platformRole: role === 'MASTER' ? 'MASTER' : 'USER', // 기본은 일반 계정(USER), MASTER는 별도 조회
      ...(status && userStatusSchema.safeParse(status).success ? { status: status as Prisma.EnumUserStatusFilter['equals'] } : {}),
      ...(groupId ? { groupMemberships: { some: { groupId, status: 'APPROVED' } } } : {}),
      ...(teamId ? { teamMembers: { some: { teamId } } } : {}),
      ...(adminScope === 'GROUP' ? { groupMemberships: { some: { role: 'ADMIN', status: 'APPROVED' } } } : {}),
      ...(adminScope === 'TEAM' ? { teamMembers: { some: { role: 'ADMIN', team: { deletedAt: null } } } } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
              { username: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({ where, select: listSelect, orderBy, skip: (current - 1) * size, take: size }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page: current, pageSize: size };
  }

  @Get('users/:id')
  async user(@Param('id') id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: detailSelect });
    if (!user) throw AppError.notFound('계정을 찾을 수 없습니다');
    // 대표 여부: 이 계정이 대표인 그룹/팀
    const [groups, teams] = await Promise.all([
      this.prisma.group.findMany({ where: { primaryAdminId: id, deletedAt: null }, select: { id: true, name: true } }),
      this.prisma.team.findMany({ where: { primaryAdminId: id, deletedAt: null }, select: { id: true, name: true, group: { select: { name: true } } } }),
    ]);
    return { ...user, primaryOf: { groups, teams } };
  }

  @Get('teams')
  teams() {
    return this.prisma.team.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, group: { select: { id: true, name: true } } },
      orderBy: [{ group: { name: 'asc' } }, { name: 'asc' }],
    });
  }

  @Patch('users/:id/status')
  async setStatus(@CurrentUser() actor: AuthUser, @Param('id') id: string, @Body(new ZodPipe(setUserStatusSchema)) body: SetUserStatusInput) {
    if (actor.id === id) throw new AppError(ErrorCode.CANNOT_MODIFY_SELF, '자기 자신은 변경할 수 없습니다');
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.user.findUniqueOrThrow({ where: { id } });
      const user = await tx.user.update({ where: { id }, data: { status: body.status } });
      await this.audit.log(tx, {
        actorId: actor.id,
        action: body.status === 'DEACTIVATED' ? 'user.deactivated' : 'user.activated',
        targetType: 'User',
        targetId: id,
        before: { status: before.status },
        after: { status: user.status },
      });
      return { id: user.id, status: user.status };
    });
  }

  /** 계정 일괄 적용: 상태 변경 / 그룹 역할 부여 / 팀 가입 */
  @Post('users/bulk')
  async bulk(@CurrentUser() actor: AuthUser, @Body(new ZodPipe(bulkSchema)) body: BulkInput) {
    const action = body.action;
    const ids = [...new Set(body.userIds)].filter((id) => (action.type !== 'status' && action.type !== 'delete') || id !== actor.id);
    const found = await this.prisma.user.count({ where: { id: { in: ids } } });
    if (found !== ids.length) throw AppError.notFound('존재하지 않는 계정이 포함되어 있습니다');

    if (action.type === 'delete') {
    }
    if (action.type === 'group') {
      const group = await this.prisma.group.findUnique({ where: { id: action.groupId } });
      if (!group || group.deletedAt) throw AppError.notFound('그룹을 찾을 수 없습니다');
      if (action.role === 'USER' && group.primaryAdminId && ids.includes(group.primaryAdminId)) throw primaryAdminProtected();
    }
    const team = action.type === 'team' ? await this.prisma.team.findUnique({ where: { id: action.teamId } }) : null;
    if (action.type === 'team' && (!team || team.deletedAt)) throw AppError.notFound('팀을 찾을 수 없습니다');

    await this.prisma.$transaction(
      async (tx) => {
        for (const userId of ids) {
          if (action.type === 'status') {
            const before = await tx.user.findUniqueOrThrow({ where: { id: userId } });
            const user = await tx.user.update({ where: { id: userId }, data: { status: action.status } });
            await this.audit.log(tx, {
              actorId: actor.id,
              action: action.status === 'DEACTIVATED' ? 'user.deactivated' : 'user.activated',
              targetType: 'User',
              targetId: userId,
              before: { status: before.status },
              after: { status: user.status },
            });
          } else if (action.type === 'delete') {
            await this.removeUser(tx, actor.id, userId);
          } else if (action.type === 'group') {
            await this.grantGroupRole(tx, actor.id, userId, action.groupId, action.role);
          } else if (team) {
            const existing = await tx.groupMembership.findUnique({ where: { userId_groupId: { userId, groupId: team.groupId } } });
            if (existing?.status !== 'APPROVED') {
              await this.grantGroupRole(tx, actor.id, userId, team.groupId, existing?.role ?? 'USER');
            }
            await assertOneTeam(tx, userId, team.id);
            await tx.teamMember.upsert({
              where: { teamId_userId: { teamId: team.id, userId } },
              create: { teamId: team.id, userId, groupId: team.groupId, role: 'USER' },
              update: {},
            });
            await this.audit.log(tx, {
              groupId: team.groupId,
              actorId: actor.id,
              action: 'team.member.added',
              targetType: 'Team',
              targetId: team.id,
              after: { userId },
            });
          }
        }
        if (action.type === 'group') await ensureGroupPrimary(tx, action.groupId);
        if (team) await ensureTeamPrimary(tx, team.id);
      },
      { timeout: 60_000 },
    );
    return { updated: ids.length };
  }

  @Delete('users/:id')
  async deleteUser(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    if (actor.id === id) throw new AppError(ErrorCode.CANNOT_MODIFY_SELF, '자기 자신은 삭제할 수 없습니다');
    await this.prisma.$transaction((tx) => this.removeUser(tx, actor.id, id));
    return { ok: true };
  }

  /** 팀 역할 지정 (팀당 ADMIN 1명). 그룹 역할은 변경하지 않음 */
  @Put('users/:id/team-admin')
  async setTeamRole(@CurrentUser() actor: AuthUser, @Param('id') id: string, @Body(new ZodPipe(teamAdminSchema)) body: { teamId: string; role: 'ADMIN' | 'USER' }) {
    const team = await this.prisma.team.findUnique({ where: { id: body.teamId } });
    if (!team || team.deletedAt) throw AppError.notFound('팀을 찾을 수 없습니다');
    if (!(await this.prisma.user.findUnique({ where: { id } }))) throw AppError.notFound('계정을 찾을 수 없습니다');
    if (body.role === 'USER' && team.primaryAdminId === id) throw primaryAdminProtected();
    return this.prisma.$transaction(async (tx) => {
      if (body.role === 'USER') {
        await tx.teamMember.updateMany({ where: { teamId: team.id, userId: id }, data: { role: 'USER' } });
      } else {
        const groupMembership = await tx.groupMembership.findUnique({ where: { userId_groupId: { userId: id, groupId: team.groupId } } });
        if (groupMembership?.status !== 'APPROVED') {
          await this.grantGroupRole(tx, actor.id, id, team.groupId, groupMembership?.role ?? 'USER');
        }
        await assertOneTeam(tx, id, team.id);
        await tx.teamMember.upsert({
          where: { teamId_userId: { teamId: team.id, userId: id } },
          create: { teamId: team.id, userId: id, groupId: team.groupId, role: 'ADMIN' },
          update: { role: 'ADMIN' },
        });
        await this.audit.log(tx, {
          groupId: team.groupId,
          actorId: actor.id,
          action: 'team.admin.changed',
          targetType: 'Team',
          targetId: team.id,
          after: { userId: id, role: 'ADMIN' },
        });
        await ensureTeamPrimary(tx, team.id);
        return { ok: true };
      }
      await this.audit.log(tx, { groupId: team.groupId, actorId: actor.id, action: 'team.role.changed', targetType: 'Team', targetId: team.id, after: { userId: id, role: 'USER' } });
      return { ok: true };
    });
  }

  /** 임의 그룹에 구성원으로 승인 후 역할 지정 (가입 요청 없이 부여) */
  @Post('users/:id/groupMemberships')
  async grantGroupMembership(@CurrentUser() actor: AuthUser, @Param('id') id: string, @Body(new ZodPipe(grantGroupMembershipSchema)) body: { groupId: string; role: 'ADMIN' | 'USER' }) {
    const [user, group] = await Promise.all([
      this.prisma.user.findUnique({ where: { id } }),
      this.prisma.group.findUnique({ where: { id: body.groupId } }),
    ]);
    if (!user) throw AppError.notFound('사용자를 찾을 수 없습니다');
    if (!group || group.deletedAt) throw AppError.notFound('그룹을 찾을 수 없습니다');
    if (body.role === 'USER' && group.primaryAdminId === id) {
      throw new AppError(ErrorCode.PRIMARY_ADMIN_PROTECTED, '대표 ADMIN은 강등할 수 없습니다. 먼저 대표를 변경하세요');
    }
    return this.prisma.$transaction((tx) => this.grantGroupRole(tx, actor.id, id, body.groupId, body.role));
  }

  /** 계정 생성 (아이디 = 이메일, USER 또는 MASTER) */
  @Post('users')
  async createUser(@CurrentUser() actor: AuthUser, @Body(new ZodPipe(adminCreateUserSchema)) body: AdminCreateUserInput) {
    if (await this.prisma.user.findFirst({ where: { OR: [{ username: body.email }, { email: body.email }] } })) {
      throw new AppError(ErrorCode.USERNAME_TAKEN, '이미 사용 중인 아이디(이메일)입니다', 409);
    }
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: body.email,
          email: body.email,
          name: body.name,
          birthDate: body.birthDate ? new Date(body.birthDate) : null,
          phone: body.phone ?? null,
          platformRole: body.platformRole,
          passwordHash: await bcrypt.hash(body.password, 10),
        },
      });
      await this.audit.log(tx, { actorId: actor.id, action: 'user.created', targetType: 'User', targetId: user.id, after: { platformRole: user.platformRole } });
      return { id: user.id, name: user.name, email: user.email, platformRole: user.platformRole };
    });
  }

  /** 계정 정보 수정. 비밀번호/계정 유형/상태는 값이 있을 때만 변경 */
  @Patch('users/:id')
  async updateUser(@CurrentUser() actor: AuthUser, @Param('id') id: string, @Body(new ZodPipe(updateUserSchema)) body: UpdateUserInput) {
    const before = await this.prisma.user.findUnique({ where: { id } });
    if (!before) throw AppError.notFound('계정을 찾을 수 없습니다');
    if (body.email && body.email !== before.email) {
      const taken = await this.prisma.user.findFirst({ where: { id: { not: id }, OR: [{ username: body.email }, { email: body.email }] } });
      if (taken) throw new AppError(ErrorCode.USERNAME_TAKEN, '이미 사용 중인 아이디(이메일)입니다', 409);
    }
    if (actor.id === id && (body.status && body.status !== 'ACTIVE' || body.platformRole && body.platformRole !== 'MASTER')) {
      throw new AppError(ErrorCode.CANNOT_MODIFY_SELF, '자기 자신의 상태/계정 유형은 변경할 수 없습니다');
    }
    const data: Prisma.UserUpdateInput = {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.email !== undefined ? { email: body.email, username: body.email } : {}),
      ...(body.birthDate !== undefined ? { birthDate: body.birthDate ? new Date(body.birthDate) : null } : {}),
      ...(body.phone !== undefined ? { phone: body.phone ?? null } : {}),
      ...(body.platformRole ? { platformRole: body.platformRole } : {}),
      ...(body.status ? { status: body.status } : {}),
      ...(body.password ? { passwordHash: await bcrypt.hash(body.password, 10) } : {}),
    };
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({ where: { id }, data });
      await this.audit.log(tx, {
        actorId: actor.id,
        action: 'user.updated',
        targetType: 'User',
        targetId: id,
        before: { name: before.name, email: before.email, platformRole: before.platformRole, status: before.status },
        after: { name: user.name, email: user.email, platformRole: user.platformRole, status: user.status, passwordChanged: !!body.password },
      });
      return { id: user.id };
    });
  }

  /** 그룹/팀 소속을 전달된 값으로 맞춤. 목록에 없는 그룹/팀은 제거, 팀의 그룹은 자동 포함 */
  @Put('users/:id/memberships')
  async setMemberships(@CurrentUser() actor: AuthUser, @Param('id') id: string, @Body(new ZodPipe(userMembershipsSchema)) body: UserMembershipsInput) {
    if (!(await this.prisma.user.findUnique({ where: { id } }))) throw AppError.notFound('계정을 찾을 수 없습니다');
    const teamIds = body.teams.map((t) => t.teamId);
    const teams = await this.prisma.team.findMany({ where: { id: { in: teamIds }, deletedAt: null }, select: { id: true, groupId: true } });
    if (teams.length !== new Set(teamIds).size) throw AppError.notFound('팀을 찾을 수 없습니다');
    const groupIds = [...new Set([...body.groups.map((g) => g.groupId), ...teams.map((t) => t.groupId)])];
    if (groupIds.length > 1) throw new AppError(ErrorCode.ONE_GROUP_ONLY, '계정은 하나의 그룹에만 속할 수 있습니다', 409);
    const groups = await this.prisma.group.findMany({ where: { id: { in: groupIds }, deletedAt: null }, select: { id: true } });
    if (groups.length !== groupIds.length) throw AppError.notFound('그룹을 찾을 수 없습니다');

    const groupRole = new Map(body.groups.map((g) => [g.groupId, g.role]));
    const teamRole = new Map(body.teams.map((t) => [t.teamId, t.role]));
    // 대표 ADMIN은 제외 또는 USER 강등 불가 (그룹/팀 모두)
    const removedGroupPrimary = await this.prisma.group.count({ where: { primaryAdminId: id, deletedAt: null, id: { notIn: groupIds } } });
    const demotedGroupPrimary = await this.prisma.group.count({ where: { primaryAdminId: id, deletedAt: null, id: { in: body.groups.filter((g) => g.role === 'USER').map((g) => g.groupId) } } });
    const removedTeamPrimary = await this.prisma.team.count({ where: { primaryAdminId: id, deletedAt: null, id: { notIn: teamIds } } });
    const demotedTeamPrimary = await this.prisma.team.count({ where: { primaryAdminId: id, deletedAt: null, id: { in: body.teams.filter((t) => t.role === 'USER').map((t) => t.teamId) } } });
    if (removedGroupPrimary + demotedGroupPrimary + removedTeamPrimary + demotedTeamPrimary > 0) throw primaryAdminProtected();

    const teamGroup = new Map(teams.map((t) => [t.id, t.groupId]));

    return this.prisma.$transaction(async (tx) => {
      await tx.groupMembership.deleteMany({ where: { userId: id, groupId: { notIn: groupIds } } });
      await tx.teamMember.deleteMany({ where: { userId: id, teamId: { notIn: teamIds } } });
      for (const groupId of groupIds) {
        const key = { userId_groupId: { userId: id, groupId } };
        const role = groupRole.get(groupId);
        await assertOneGroup(tx, id, groupId);
        await tx.groupMembership.upsert({
          where: key,
          create: { userId: id, groupId, role: role ?? 'USER', status: 'APPROVED' },
          update: { status: 'APPROVED', leftAt: null, ...(role ? { role } : {}) },
        });
      }
      for (const teamId of teamIds) {
        const role = teamRole.get(teamId);
        await assertOneTeam(tx, id, teamId);
        await tx.teamMember.upsert({
          where: { teamId_userId: { teamId, userId: id } },
          create: { teamId, userId: id, groupId: teamGroup.get(teamId)!, role: role ?? 'USER' },
          update: { ...(role ? { role } : {}) },
        });
      }
      await this.audit.log(tx, {
        actorId: actor.id,
        action: 'user.memberships.updated',
        targetType: 'User',
        targetId: id,
        after: { groups: body.groups, teams: body.teams },
      });
      for (const groupId of groupIds) await ensureGroupPrimary(tx, groupId);
      for (const teamId of teamIds) await ensureTeamPrimary(tx, teamId);
      return { ok: true };
    });
  }

  @Post('masters')
  async createMaster(@CurrentUser() actor: AuthUser, @Body(new ZodPipe(createMasterSchema)) body: CreateMasterInput) {
    if (await this.prisma.user.findUnique({ where: { username: body.username } })) {
      throw new AppError(ErrorCode.USERNAME_TAKEN, '이미 사용 중인 아이디입니다', 409);
    }
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { username: body.username, name: body.name, platformRole: 'MASTER', passwordHash: await bcrypt.hash(body.password, 10) },
      });
      await this.audit.log(tx, { actorId: actor.id, action: 'user.master.created', targetType: 'User', targetId: user.id });
      return { id: user.id, username: user.username, name: user.name };
    });
  }

  @Post('users/:id/reset-password')
  async resetPassword(@CurrentUser() actor: AuthUser, @Param('id') id: string, @Body(new ZodPipe(resetPasswordSchema)) body: ResetPasswordInput) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw AppError.notFound('계정을 찾을 수 없습니다');
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(body.password, 10) } });
      await this.audit.log(tx, { actorId: actor.id, action: 'user.password_reset', targetType: 'User', targetId: id });
    });
    return { ok: true };
  }

  @Get('audit-logs')
  async auditLogs(@Query('groupId') groupId?: string, @Query('action') action?: string, @Query('page') page = '1', @Query('pageSize') pageSize = '20') {
    const size = Math.min(Math.max(Number(pageSize) || 20, 1), 100);
    const current = Math.max(Number(page) || 1, 1);
    const where: Prisma.AuditLogWhereInput = {
      ...(groupId ? { groupId } : {}),
      ...(action ? { action: { contains: action, mode: 'insensitive' } } : {}),
    };
    const [logs, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (current - 1) * size, take: size }),
      this.prisma.auditLog.count({ where }),
    ]);
    const actorIds = [...new Set(logs.map((l) => l.actorId).filter((x): x is string => !!x))];
    const actors = await this.prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } });
    const names = new Map(actors.map((u) => [u.id, u.name]));
    const items = logs.map((l) => ({ ...l, actorName: l.actorId ? (names.get(l.actorId) ?? null) : null }));
    return { items, total, page: current, pageSize: size };
  }

  /** 계정 삭제: 그룹/팀 소속과 가입 요청을 함께 정리. 감사 로그는 삭제 전 정보를 남김 */
  private async removeUser(tx: Tx, actorId: string, userId: string) {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    await tx.groupMembershipRequest.updateMany({ where: { reviewerId: userId }, data: { reviewerId: null } });
    await tx.groupMembershipRequest.deleteMany({ where: { userId } });
    await tx.teamMember.deleteMany({ where: { userId } });
    await tx.groupMembership.deleteMany({ where: { userId } });
    // 대표 ADMIN이면 대표를 비운 뒤, 남은 ADMIN 중 가장 먼저 지정된 사람으로 다시 채움
    const primaryGroups = await tx.group.findMany({ where: { primaryAdminId: userId }, select: { id: true } });
    const primaryTeams = await tx.team.findMany({ where: { primaryAdminId: userId }, select: { id: true } });
    await tx.group.updateMany({ where: { primaryAdminId: userId }, data: { primaryAdminId: null } });
    await tx.team.updateMany({ where: { primaryAdminId: userId }, data: { primaryAdminId: null } });
    for (const g of primaryGroups) await ensureGroupPrimary(tx, g.id);
    for (const t of primaryTeams) await ensureTeamPrimary(tx, t.id);
    await tx.user.delete({ where: { id: userId } });
    await this.audit.log(tx, {
      actorId,
      action: 'user.deleted',
      targetType: 'User',
      targetId: userId,
      before: { username: user.username, email: user.email, name: user.name, platformRole: user.platformRole },
    });
  }

  private async grantGroupRole(tx: Tx, actorId: string, userId: string, groupId: string, role: 'ADMIN' | 'USER') {
    const key = { userId_groupId: { userId, groupId } };
    const before = await tx.groupMembership.findUnique({ where: key });
    await assertOneGroup(tx, userId, groupId);
    const m = await tx.groupMembership.upsert({
      where: key,
      create: { userId, groupId, role, status: 'APPROVED' },
      update: { role, status: 'APPROVED', leftAt: null },
    });
    await this.audit.log(tx, {
      groupId,
      actorId,
      action: 'groupMembership.granted',
      targetType: 'GroupMembership',
      targetId: m.id,
      before: before ? { role: before.role, status: before.status } : undefined,
      after: { role: m.role, status: m.status },
    });
    return { ok: true };
  }
}
