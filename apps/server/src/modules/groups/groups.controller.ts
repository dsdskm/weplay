import { Body, Controller, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import type { Prisma } from '@weplay/db';
import {
  ApproveRequestInput,
  approveRequestSchema,
  formatJoinCode,
  RejectRequestInput,
  rejectRequestSchema,
} from '@weplay/shared';
import { AppError } from '../../common/app-error';
import { resetTeamMembers } from '../../common/team-rule';
import { AuditService } from '../../common/audit.service';
import { JoinCodeService } from '../../common/join-code.service';
import { primaryAdminProtected } from '../../common/primary-admin';
import { GroupMemberGuard } from '../../common/group-member.guard';
import { AuthUser, CurrentGroupMembership, CurrentUser, GroupMembershipContext } from '../../common/decorators';
import { PrismaService } from '../../common/prisma.service';
import { ZodPipe } from '../../common/zod.pipe';
import { RequestsService } from '../requests/requests.service';
import { parseStatus } from '../admin/admin-requests.controller';

const userSelect = { id: true, name: true, email: true, avatarUrl: true } as const;
const groupInfoSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().max(1000).nullable().optional(),
});
const teamSettingsSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().max(1000).nullable().optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
  requireApproval: z.boolean().optional(),
  joinCodeEnabled: z.boolean().optional(),
});
const teamRoleSchema = z.object({ role: z.enum(['ADMIN', 'USER']) });

/** 그룹 구성원용 API (user-web) */
@UseGuards(GroupMemberGuard)
@Controller('groups/:groupId')
export class GroupsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requests: RequestsService,
    private readonly audit: AuditService,
    private readonly codes: JoinCodeService,
  ) {}

  @Get()
  async group(@Param('groupId') groupId: string, @CurrentGroupMembership() m: GroupMembershipContext) {
    const group = await this.prisma.group.findUniqueOrThrow({ where: { id: groupId } });
    const [memberCount, teamCount, pendingCount] = await Promise.all([
      this.prisma.groupMembership.count({ where: { groupId, status: 'APPROVED' } }),
      this.prisma.team.count({ where: { groupId, deletedAt: null } }),
      m.role === 'ADMIN' ? this.prisma.groupMembershipRequest.count({ where: { groupId, status: 'PENDING' } }) : 0,
    ]);
    return {
      id: group.id,
      name: group.name,
      description: group.description,
      joinCode: m.role === 'ADMIN' ? formatJoinCode(group.joinCode) : undefined,
      memberCount,
      teamCount,
      pendingCount,
      me: { role: m.role, isPrimaryAdmin: m.isPrimaryAdmin, joinedAt: m.joinedAt },
    };
  }

  /** 그룹 정보 수정: 그룹 ADMIN(대표 포함) */
  @Patch()
  async updateGroup(@Param('groupId') groupId: string, @CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Body(new ZodPipe(groupInfoSchema)) body: z.infer<typeof groupInfoSchema>) {
    if (m.role !== 'ADMIN' && !m.isPrimaryAdmin) throw AppError.forbidden('그룹 ADMIN만 수정할 수 있습니다');
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.group.findUniqueOrThrow({ where: { id: groupId } });
      await tx.group.update({ where: { id: groupId }, data: body });
      await this.audit.log(tx, { groupId, actorId: user.id, action: 'group.info.updated', targetType: 'Group', targetId: groupId, before: { name: before.name, description: before.description }, after: body });
      return { ok: true };
    });
  }

  /** 팀 목록. page를 주면 페이지네이션(scope: mine = 내 팀+승인 대기 / all = 전체), 없으면 전체 배열 */
  @Get('teams')
  async teams(
    @Param('groupId') groupId: string,
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Query('page') page?: string,
    @Query('pageSize') pageSize = '20',
    @Query('scope') scope = 'all',
  ) {
    // 내가 낸 대기 중 가입 요청에 포함된 팀 = 승인 대기 중
    const pending = await this.prisma.groupMembershipRequest.findMany({
      where: { userId: user.id, groupId, status: 'PENDING' },
      include: { teams: true },
    });
    const pendingTeamIds = new Map(pending.flatMap((r) => r.teams.map((t) => [t.teamId, r.id] as [string, string])));
    const paged = page !== undefined;
    const size = Math.min(Math.max(Number(pageSize) || 20, 1), 100);
    const current = Math.max(Number(page) || 1, 1);
    const where: Prisma.TeamWhereInput = {
      groupId,
      deletedAt: null,
      ...(paged && scope === 'mine' ? { OR: [{ members: { some: { userId: user.id } } }, { id: { in: [...pendingTeamIds.keys()] } }] } : {}),
    };
    const include = (uid: string) => ({
      _count: { select: { members: true } },
      members: { where: { OR: [{ role: 'ADMIN' as const }, { userId: uid }] }, include: { user: { select: userSelect } } },
    });
    const [teams, total] = paged
      ? await this.prisma.$transaction([
          this.prisma.team.findMany({ where, include: include(user.id), orderBy: { name: 'asc' }, skip: (current - 1) * size, take: size }),
          this.prisma.team.count({ where }),
        ])
      : [await this.prisma.team.findMany({ where, include: include(user.id), orderBy: { name: 'asc' } }), 0];
    const items = teams.map((g) => {
      const mine = g.members.find((x) => x.userId === user.id);
      const canManage = m.isPrimaryAdmin || mine?.role === 'ADMIN';
      return {
        id: g.id,
        name: g.name,
        description: g.description,
        memberCount: g._count.members,
        admins: g.members.filter((x) => x.role === 'ADMIN').map((x) => x.user),
        isMine: !!mine,
        myRole: mine?.role ?? null,
        joinStatus: mine ? 'APPROVED' : pendingTeamIds.has(g.id) ? 'PENDING' : 'NONE',
        pendingRequestId: mine ? null : (pendingTeamIds.get(g.id) ?? null),
        joinCode: canManage ? formatJoinCode(g.joinCode) : undefined,
      };
    });
    return paged ? { items, total, page: current, pageSize: size } : items;
  }

  @Get('teams/:teamId/members')
  async teamMembers(
    @Param('groupId') groupId: string,
    @Param('teamId') teamId: string,
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
  ) {
    const team = await this.prisma.team.findFirst({ where: { id: teamId, groupId, deletedAt: null } });
    if (!team) throw AppError.notFound('팀을 찾을 수 없습니다');
    // 팀 구성원만 팀원 목록을 볼 수 있음 (그룹 관리자는 예외)
    const isTeamMember = !!(await this.prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId: user.id } } }));
    const canManage = await this.canManageTeam(m, user.id, teamId);
    if (!isTeamMember && !canManage) {
      return { team: { id: team.id, name: team.name, description: team.description }, members: [], locked: true, canManage: false };
    }
    const members = await this.prisma.teamMember.findMany({
      where: { teamId },
      include: { user: { select: userSelect } },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    });
    return {
      team: {
        id: team.id,
        name: team.name,
        description: team.description,
        primaryAdminId: team.primaryAdminId,
        visibility: team.visibility,
        requireApproval: team.requireApproval,
        joinCodeEnabled: team.joinCodeEnabled,
        joinCode: canManage ? formatJoinCode(team.joinCode) : undefined,
      },
      members: members.map((x) => ({ ...x.user, teamRole: x.role, joinedAt: x.joinedAt })),
      locked: false,
      canManage,
    };
  }

  @Get('members')
  async members(@Param('groupId') groupId: string, @Query('q') q?: string, @Query('page') page = '1', @Query('pageSize') pageSize = '20') {
    const group = await this.prisma.group.findUniqueOrThrow({ where: { id: groupId }, select: { primaryAdminId: true } });
    const size = Math.min(Math.max(Number(pageSize) || 20, 1), 100);
    const current = Math.max(Number(page) || 1, 1);
    const where: Prisma.GroupMembershipWhereInput = {
      groupId,
      status: 'APPROVED',
      ...(q ? { user: { OR: [{ name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] } } : {}),
    };
    const [members, total] = await this.prisma.$transaction([
      this.prisma.groupMembership.findMany({
        where,
      include: {
        user: {
          select: {
            ...userSelect,
            teamMembers: { where: { groupId, team: { deletedAt: null } }, select: { team: { select: { id: true, name: true } } } },
          },
        },
      },
        orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
        skip: (current - 1) * size,
        take: size,
      }),
      this.prisma.groupMembership.count({ where }),
    ]);
    const items = members.map(({ user: { teamMembers, ...u }, ...m }) => ({
      ...u,
      role: m.role,
      isPrimaryAdmin: group.primaryAdminId === u.id,
      joinedAt: m.joinedAt,
      teams: teamMembers.map((g) => g.team),
    }));
    return { items, total, page: current, pageSize: size };
  }

  @Get('requests')
  async requestList(
    @Param('groupId') groupId: string,
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    const statusWhere = status ? { status: parseStatus(status) } : {};
    const p = Number(page) || 1;
    const size = Number(pageSize) || 20;
    // 그룹 ADMIN: 그룹 전체 요청 / 팀 ADMIN: 담당 팀의 팀 가입 요청만
    if (m.role === 'ADMIN' || m.isPrimaryAdmin) return this.requests.list({ groupId, ...statusWhere }, p, size);
    const managed = await this.managedTeamIds(groupId, user.id);
    if (managed.length === 0) throw AppError.forbidden();
    return this.requests.list({ groupId, type: 'TEAM_JOIN', teams: { some: { teamId: { in: managed } } }, ...statusWhere }, p, size);
  }

  /** 팀 설정 변경: 공개/승인 방식/코드 사용 */
  @Patch('teams/:teamId')
  async updateTeam(
    @Param('groupId') groupId: string,
    @Param('teamId') teamId: string,
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Body(new ZodPipe(teamSettingsSchema)) body: z.infer<typeof teamSettingsSchema>,
  ) {
    await this.assertManageTeam(groupId, teamId, user.id, m);
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.team.findUniqueOrThrow({ where: { id: teamId } });
      await tx.team.update({ where: { id: teamId }, data: body });
      await this.audit.log(tx, {
        groupId,
        actorId: user.id,
        action: 'team.updated',
        targetType: 'Team',
        targetId: teamId,
        before: { visibility: before.visibility, requireApproval: before.requireApproval, joinCodeEnabled: before.joinCodeEnabled },
        after: body,
      });
      return { ok: true };
    });
  }

  /** 팀 코드 재발급 */
  @Post('teams/:teamId/join-code/rotate')
  async rotateTeamCode(@Param('groupId') groupId: string, @Param('teamId') teamId: string, @CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext) {
    await this.assertManageTeam(groupId, teamId, user.id, m);
    const joinCode = await this.codes.generate();
    return this.prisma.$transaction(async (tx) => {
      const team = await tx.team.update({ where: { id: teamId }, data: { joinCode, joinCodeRotatedAt: new Date() } });
      const reset = await resetTeamMembers(tx, teamId);
      await this.audit.log(tx, { groupId, actorId: user.id, action: 'team.code.rotated', targetType: 'Team', targetId: teamId, after: reset });
      return { joinCode: formatJoinCode(team.joinCode) };
    });
  }

  /** 팀 구성원 역할 변경 (팀 ADMIN 지정/해제). 대표 TEAM_ADMIN은 강등 불가 */
  @Patch('teams/:teamId/members/:userId/role')
  async setTeamMemberRole(
    @Param('groupId') groupId: string,
    @Param('teamId') teamId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Body(new ZodPipe(teamRoleSchema)) body: z.infer<typeof teamRoleSchema>,
  ) {
    await this.assertManageTeam(groupId, teamId, user.id, m);
    const team = await this.prisma.team.findUniqueOrThrow({ where: { id: teamId } });
    const tm = await this.prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } });
    if (!tm) throw AppError.notFound('팀 구성원이 아닙니다');
    if (body.role === 'USER' && team.primaryAdminId === userId) throw primaryAdminProtected();
    return this.prisma.$transaction(async (tx) => {
      await tx.teamMember.update({ where: { id: tm.id }, data: { role: body.role } });
      await this.audit.log(tx, {
        groupId,
        actorId: user.id,
        action: 'team.role.changed',
        targetType: 'Team',
        targetId: teamId,
        before: { userId, role: tm.role },
        after: { userId, role: body.role },
      });
      return { ok: true };
    });
  }

  /** 팀 관리 권한: 그룹 ADMIN(대표 포함) 또는 해당 팀의 ADMIN */
  private async canManageTeam(m: GroupMembershipContext, userId: string, teamId: string) {
    if (m.role === 'ADMIN' || m.isPrimaryAdmin) return true;
    const tm = await this.prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } });
    return tm?.role === 'ADMIN';
  }

  private async assertManageTeam(groupId: string, teamId: string, userId: string, m: GroupMembershipContext) {
    const team = await this.prisma.team.findFirst({ where: { id: teamId, groupId, deletedAt: null } });
    if (!team) throw AppError.notFound('팀을 찾을 수 없습니다');
    if (!(await this.canManageTeam(m, userId, teamId))) throw AppError.forbidden('팀 관리 권한이 없습니다');
  }

  /** 내가 ADMIN인 팀 ID 목록 */
  private async managedTeamIds(groupId: string, userId: string) {
    const rows = await this.prisma.teamMember.findMany({ where: { groupId, userId, role: 'ADMIN', team: { deletedAt: null } }, select: { teamId: true } });
    return rows.map((r) => r.teamId);
  }

  @Post('requests/:requestId/approve')
  approve(
    @Param('groupId') groupId: string,
    @Param('requestId') requestId: string,
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() groupMembership: GroupMembershipContext,
    @Body(new ZodPipe(approveRequestSchema)) body: ApproveRequestInput,
  ) {
    return this.requests.approve({ user, groupMembership }, requestId, body, groupId);
  }

  @Post('requests/:requestId/reject')
  reject(
    @Param('groupId') groupId: string,
    @Param('requestId') requestId: string,
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() groupMembership: GroupMembershipContext,
    @Body(new ZodPipe(rejectRequestSchema)) body: RejectRequestInput,
  ) {
    return this.requests.reject({ user, groupMembership }, requestId, body.reason, groupId);
  }
}
