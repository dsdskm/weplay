import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import type { Prisma } from '@weplay/db';
import {
  CreateGroupInput,
  createGroupSchema,
  CreateTeamInput,
  createTeamSchema,
  formatJoinCode,
  SetMemberRoleInput,
  setMemberRoleSchema,
  ErrorCode,
  SetUserIdInput,
  setUserIdSchema,
  UpdateGroupInput,
  updateGroupSchema,
  UpdateTeamInput,
  updateTeamSchema,
} from '@weplay/shared';
import { AppError } from '../../common/app-error';
import { resetGroupMembers, resetTeamMembers } from '../../common/team-rule';
import { assertOneTeam } from '../../common/team-rule';
import { AuditService } from '../../common/audit.service';
import { AuthUser, CurrentUser } from '../../common/decorators';
import { JoinCodeService } from '../../common/join-code.service';
import { MasterGuard } from '../../common/master.guard';
import { PrismaService } from '../../common/prisma.service';
import { ZodPipe } from '../../common/zod.pipe';
import { GroupMembershipsService } from '../requests/group-memberships.service';

const userSelect = { id: true, name: true, email: true } as const;

/** MASTER: 그룹·팀·코드 관리 (system-web) */
@UseGuards(MasterGuard)
@Controller('admin')
export class AdminGroupsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly codes: JoinCodeService,
    private readonly groupMemberships: GroupMembershipsService,
  ) {}

  @Get('groups')
  async list() {
    const groups = await this.prisma.group.findMany({
      where: { deletedAt: null },
      include: {
        _count: { select: { groupMemberships: { where: { status: 'APPROVED' } }, teams: { where: { deletedAt: null } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const pending = await this.prisma.groupMembershipRequest.groupBy({ by: ['groupId'], where: { status: 'PENDING' }, _count: true });
    const pendingMap = new Map(pending.map((p) => [p.groupId, p._count]));
    return groups.map(({ _count, ...c }) => ({
      ...c,
      joinCode: formatJoinCode(c.joinCode),
      memberCount: _count.groupMemberships,
      teamCount: _count.teams,
      pendingCount: pendingMap.get(c.id) ?? 0,
    }));
  }

  @Post('groups')
  async create(@CurrentUser() actor: AuthUser, @Body(new ZodPipe(createGroupSchema)) body: CreateGroupInput) {
    const joinCode = await this.codes.generate();
    return this.prisma.$transaction(async (tx) => {
      const group = await tx.group.create({ data: { ...body, joinCode, createdById: actor.id } });
      await this.audit.log(tx, { groupId: group.id, actorId: actor.id, action: 'group.created', targetType: 'Group', targetId: group.id, after: body });
      return { ...group, joinCode: formatJoinCode(group.joinCode) };
    });
  }

  /** 그룹 상세: 기본 정보, 코드, 팀 목록(전체), 구성원 수. 구성원 목록은 /groups/:id/members (페이지네이션) */
  @Get('groups/:id')
  async detail(@Param('id') id: string) {
    const group = await this.prisma.group.findFirst({ where: { id, deletedAt: null } });
    if (!group) throw AppError.notFound('그룹을 찾을 수 없습니다');
    const [teams, memberCount] = await Promise.all([
      this.prisma.team.findMany({
        where: { groupId: id, deletedAt: null },
        include: {
          _count: { select: { members: true } },
          members: { where: { role: 'ADMIN' }, include: { user: { select: userSelect } } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.groupMembership.count({ where: { groupId: id, status: 'APPROVED' } }),
    ]);
    return {
      ...group,
      joinCode: formatJoinCode(group.joinCode),
      memberCount,
      teams: teams.map(mapTeam),
    };
  }

  /** 팀 목록 (페이지네이션) */
  @Get('groups/:id/teams')
  async teamPage(@Param('id') id: string, @Query('page') page = '1', @Query('pageSize') pageSize = '20') {
    const { size, current } = pageOf(page, pageSize);
    const where = { groupId: id, deletedAt: null };
    const [teams, total] = await this.prisma.$transaction([
      this.prisma.team.findMany({
        where,
        include: {
          _count: { select: { members: true } },
          members: { where: { role: 'ADMIN' }, include: { user: { select: userSelect } } },
        },
        orderBy: { createdAt: 'asc' },
        skip: (current - 1) * size,
        take: size,
      }),
      this.prisma.team.count({ where }),
    ]);
    return { items: teams.map(mapTeam), total, page: current, pageSize: size };
  }

  /** 구성원 목록 (페이지네이션). q: 이름/이메일, teamId: 팀 소속, role: ADMIN/USER */
  @Get('groups/:id/members')
  async memberPage(
    @Param('id') id: string,
    @Query('q') q?: string,
    @Query('teamId') teamId?: string,
    @Query('role') role?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    const { size, current } = pageOf(page, pageSize);
    const group = await this.prisma.group.findUniqueOrThrow({ where: { id }, select: { primaryAdminId: true } });
    const userWhere: Prisma.UserWhereInput = {
      ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] } : {}),
      ...(teamId ? { teamMembers: { some: { teamId } } } : {}),
    };
    const where: Prisma.GroupMembershipWhereInput = {
      groupId: id,
      status: { in: ['APPROVED', 'BLOCKED'] },
      ...(role === 'ADMIN' || role === 'USER' ? { role } : {}),
      ...(Object.keys(userWhere).length ? { user: userWhere } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.groupMembership.findMany({
        where,
        include: { user: { select: userSelect } },
        orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
        skip: (current - 1) * size,
        take: size,
      }),
      this.prisma.groupMembership.count({ where }),
    ]);
    // 구성원별 팀 소속 (이 그룹의 팀만)
    const userIds = rows.map((r) => r.userId);
    const teamRows = await this.prisma.teamMember.findMany({
      where: { groupId: id, userId: { in: userIds }, team: { deletedAt: null } },
      include: { team: { select: { id: true, name: true } } },
    });
    const teamsByUser = new Map<string, { id: string; name: string; role: string }[]>();
    for (const tm of teamRows) {
      const list = teamsByUser.get(tm.userId) ?? [];
      list.push({ id: tm.team.id, name: tm.team.name, role: tm.role });
      teamsByUser.set(tm.userId, list);
    }
    const items = rows.map((m) => ({
      ...m.user,
      role: m.role,
      status: m.status,
      joinedAt: m.joinedAt,
      isPrimaryAdmin: group.primaryAdminId === m.userId,
      teams: teamsByUser.get(m.userId) ?? [],
    }));
    return { items, total, page: current, pageSize: size };
  }

  @Patch('groups/:id')
  async update(@CurrentUser() actor: AuthUser, @Param('id') id: string, @Body(new ZodPipe(updateGroupSchema)) body: UpdateGroupInput) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.group.findUniqueOrThrow({ where: { id } });
      const group = await tx.group.update({ where: { id }, data: body });
      await this.audit.log(tx, {
        groupId: id,
        actorId: actor.id,
        action: 'group.updated',
        targetType: 'Group',
        targetId: id,
        before: { name: before.name, description: before.description, joinCodeEnabled: before.joinCodeEnabled, status: before.status },
        after: body,
      });
      return { ...group, joinCode: formatJoinCode(group.joinCode) };
    });
  }

  @Delete('groups/:id')
  async remove(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.group.update({ where: { id }, data: { deletedAt: new Date() } });
      await this.audit.log(tx, { groupId: id, actorId: actor.id, action: 'group.deleted', targetType: 'Group', targetId: id });
    });
    return { ok: true };
  }

  @Post('groups/:id/join-code/rotate')
  async rotateGroupCode(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    const joinCode = await this.codes.generate();
    return this.prisma.$transaction(async (tx) => {
      const group = await tx.group.update({ where: { id }, data: { joinCode, joinCodeRotatedAt: new Date() } });
      const reset = await resetGroupMembers(tx, id);
      await this.audit.log(tx, { groupId: id, actorId: actor.id, action: 'group.code.rotated', targetType: 'Group', targetId: id, after: reset });
      return { joinCode: formatJoinCode(group.joinCode) };
    });
  }

  @Put('groups/:id/primary-admin')
  setPrimaryAdmin(@CurrentUser() actor: AuthUser, @Param('id') id: string, @Body(new ZodPipe(setUserIdSchema)) body: SetUserIdInput) {
    return this.groupMemberships.setPrimaryAdmin(actor.id, id, body.userId);
  }

  @Patch('groups/:id/members/:userId/role')
  setRole(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body(new ZodPipe(setMemberRoleSchema)) body: SetMemberRoleInput,
  ) {
    return this.groupMemberships.setRole(actor.id, id, userId, body.role);
  }

  @Post('groups/:id/teams')
  async createTeam(@CurrentUser() actor: AuthUser, @Param('id') groupId: string, @Body(new ZodPipe(createTeamSchema)) body: CreateTeamInput) {
    const group = await this.prisma.group.findFirst({ where: { id: groupId, deletedAt: null } });
    if (!group) throw AppError.notFound('그룹을 찾을 수 없습니다');
    const joinCode = await this.codes.generate();
    return this.prisma.$transaction(async (tx) => {
      const team = await tx.team.create({ data: { ...body, groupId, joinCode, createdById: actor.id } });
      await this.audit.log(tx, { groupId, actorId: actor.id, action: 'team.created', targetType: 'Team', targetId: team.id, after: body });
      return { ...team, joinCode: formatJoinCode(team.joinCode) };
    });
  }

  @Patch('teams/:teamId')
  async updateTeam(@CurrentUser() actor: AuthUser, @Param('teamId') teamId: string, @Body(new ZodPipe(updateTeamSchema)) body: UpdateTeamInput) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.team.findUniqueOrThrow({ where: { id: teamId } });
      const team = await tx.team.update({ where: { id: teamId }, data: body });
      await this.audit.log(tx, {
        groupId: team.groupId,
        actorId: actor.id,
        action: 'team.updated',
        targetType: 'Team',
        targetId: teamId,
        before: { name: before.name, description: before.description, joinCodeEnabled: before.joinCodeEnabled },
        after: body,
      });
      return { ...team, joinCode: formatJoinCode(team.joinCode) };
    });
  }

  /** 팀 대표 TEAM_ADMIN 지정. 그룹 구성원이면 팀 ADMIN으로 승격 */
  @Put('teams/:teamId/primary-admin')
  async setTeamPrimary(@CurrentUser() actor: AuthUser, @Param('teamId') teamId: string, @Body(new ZodPipe(setUserIdSchema)) body: SetUserIdInput) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team || team.deletedAt) throw AppError.notFound('팀을 찾을 수 없습니다');
    const membership = await this.prisma.groupMembership.findUnique({ where: { userId_groupId: { userId: body.userId, groupId: team.groupId } } });
    if (membership?.status !== 'APPROVED') throw new AppError(ErrorCode.NOT_GROUP_MEMBER, '그룹 구성원만 팀 대표가 될 수 있습니다');
    return this.prisma.$transaction(async (tx) => {
      await assertOneTeam(tx, body.userId, teamId);
      await tx.teamMember.upsert({
        where: { teamId_userId: { teamId, userId: body.userId } },
        create: { teamId, userId: body.userId, groupId: team.groupId, role: 'ADMIN' },
        update: { role: 'ADMIN' },
      });
      const updated = await tx.team.update({ where: { id: teamId }, data: { primaryAdminId: body.userId } });
      await this.audit.log(tx, {
        groupId: team.groupId,
        actorId: actor.id,
        action: 'team.primary_admin.changed',
        targetType: 'Team',
        targetId: teamId,
        before: { primaryAdminId: team.primaryAdminId },
        after: { primaryAdminId: updated.primaryAdminId },
      });
      return { ok: true };
    });
  }

  @Delete('teams/:teamId')
  async deleteTeam(@CurrentUser() actor: AuthUser, @Param('teamId') teamId: string) {
    await this.prisma.$transaction(async (tx) => {
      const team = await tx.team.update({ where: { id: teamId }, data: { deletedAt: new Date() } });
      await this.audit.log(tx, { groupId: team.groupId, actorId: actor.id, action: 'team.deleted', targetType: 'Team', targetId: teamId });
    });
    return { ok: true };
  }

  @Post('teams/:teamId/join-code/rotate')
  async rotateTeamCode(@CurrentUser() actor: AuthUser, @Param('teamId') teamId: string) {
    const joinCode = await this.codes.generate();
    return this.prisma.$transaction(async (tx) => {
      const team = await tx.team.update({ where: { id: teamId }, data: { joinCode, joinCodeRotatedAt: new Date() } });
      const reset = await resetTeamMembers(tx, teamId);
      await this.audit.log(tx, { groupId: team.groupId, actorId: actor.id, action: 'team.code.rotated', targetType: 'Team', targetId: teamId, after: reset });
      return { joinCode: formatJoinCode(team.joinCode) };
    });
  }

}

/** 팀 응답 형태 (목록/상세 공통) */
function mapTeam({ _count, members: admins, ...t }: { _count: { members: number }; members: { user: { id: string; name: string; email: string | null } }[] } & Record<string, any>) {
  return {
    ...t,
    joinCode: formatJoinCode(t.joinCode),
    memberCount: _count.members,
    admins: admins.map((a) => a.user),
  };
}

/** 페이지 파라미터 정규화 */
function pageOf(page: string, pageSize: string) {
  return {
    size: Math.min(Math.max(Number(pageSize) || 20, 1), 100),
    current: Math.max(Number(page) || 1, 1),
  };
}
