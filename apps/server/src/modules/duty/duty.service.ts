import { HttpStatus, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { DutyPeriod, ErrorCode, FeatureKey, kstDate, nextPeriod, periodIndex, periodStart } from '@weplay/shared';
import { AppError } from '../../common/app-error';
import { AuditService } from '../../common/audit.service';
import { AuthUser } from '../../common/decorators';
import { paged, PageQuery } from '../../common/paging';
import { PrismaService } from '../../common/prisma.service';
import { FeatureSettingsService } from '../features/feature-settings.service';
import { FeaturesService } from '../features/features.service';

import { PointsBadgeService } from '../points-badge/points-badge.service';

const FEATURE = FeatureKey.DUTY_ROSTER;
const userSelect = { id: true, name: true, avatarUrl: true } as const;

export const dutySchema = z.object({
  name: z.string().trim().min(1).max(30),
  icon: z.string().trim().min(1).max(8).default('📌'),
  description: z.string().trim().max(200).nullable().optional(),
  teamId: z.string().min(1).nullable().optional(),
  mode: z.enum(['FIXED', 'ROTATION']).default('ROTATION'),
  period: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY']).default('WEEKLY'),
  memberIds: z.array(z.string().min(1)).min(1).max(100),
  active: z.boolean().optional(),
});
export type DutyInput = z.infer<typeof dutySchema>;

export const doneSchema = z.object({ memo: z.string().trim().max(200).optional() });
export const handoverSchema = z.object({ userId: z.string().min(1) });

type Duty = NonNullable<Awaited<ReturnType<PrismaService['duty']['findUnique']>>>;
type User = { id: string; name: string; avatarUrl: string | null };
const mod = (a: number, n: number) => ((a % n) + n) % n;
const bad = (msg: string, status = HttpStatus.BAD_REQUEST) => new AppError(ErrorCode.VALIDATION_FAILED, msg, status);

/**
 * 공통 업무 담당: 업무마다 담당자 목록과 방식(고정·순번), 주기(매일·매주·2주·매달)를 정함.
 * 순번 담당자 = 목록[(기준일부터 몇 번째 기간 + 건너뛰기 횟수) mod 인원]. 기간별로 대신 맡기·넘기기·완료를 기록
 */
@Injectable()
export class DutyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly features: FeaturesService,
    private readonly settings: FeatureSettingsService,
    private readonly points: PointsBadgeService,
  ) {}

  private async myTeams(groupId: string, userId: string) {
    return this.prisma.teamMember.findMany({ where: { groupId, userId, team: { deletedAt: null } }, select: { teamId: true, role: true } });
  }

  private canManage(duty: { teamId: string | null; createdById: string }, viewerId: string, isGroupAdmin: boolean, teams: { teamId: string; role: string }[], memberCanCreate: boolean) {
    if (isGroupAdmin) return true;
    if (duty.teamId && teams.some((t) => t.teamId === duty.teamId && t.role === 'ADMIN')) return true;
    return memberCanCreate && duty.createdById === viewerId;
  }

  /** 지금 기간과 담당자 */
  private schedule(duty: Duty, today: string, ahead: number) {
    const members = duty.memberIds as string[];
    const period = duty.period as DutyPeriod;
    const key = periodStart(today, period, duty.anchorDate);
    if (duty.mode === 'FIXED' || members.length === 0) return { key, end: nextPeriod(key, period), assignees: members, upcoming: [] as { periodKey: string; userId: string }[] };
    const idx = periodIndex(today, period, duty.anchorDate) + duty.offset;
    const upcoming = [...Array(ahead)].map((_, i) => ({ periodKey: nextPeriod(key, period, i + 1), userId: members[mod(idx + i + 1, members.length)] }));
    return { key, end: nextPeriod(key, period), assignees: [members[mod(idx, members.length)]], upcoming };
  }

  private async view(duty: Duty, viewer: AuthUser, ctx: { isGroupAdmin: boolean; teams: { teamId: string; role: string }[]; cfg: Record<string, unknown>; users: Map<string, User>; teamNames: Map<string, string> }) {
    const today = kstDate();
    const s = this.schedule(duty, today, Number(ctx.cfg.upcomingCount));
    const log = await this.prisma.dutyLog.findUnique({ where: { dutyId_periodKey: { dutyId: duty.id, periodKey: s.key } } });
    // 대신 맡기·넘기기가 있으면 그 사람이 담당
    const assignees = log && duty.mode === 'ROTATION' ? [log.userId] : s.assignees;
    const u = (id: string | null | undefined) => (id ? (ctx.users.get(id) ?? null) : null);
    const isMine = assignees.includes(viewer.id);
    const done = log?.status === 'DONE';
    return {
      id: duty.id,
      name: duty.name,
      icon: duty.icon,
      description: duty.description,
      teamId: duty.teamId,
      teamName: duty.teamId ? (ctx.teamNames.get(duty.teamId) ?? null) : null,
      mode: duty.mode,
      period: duty.period,
      active: duty.active,
      members: (duty.memberIds as string[]).map((id) => u(id)).filter(Boolean),
      current: {
        periodKey: s.key,
        periodEnd: s.end,
        assignees: assignees.map((id) => u(id)).filter(Boolean),
        status: done ? 'DONE' : 'ASSIGNED',
        memo: log?.memo ?? null,
        doneAt: log?.doneAt ?? null,
        doneBy: done ? u(log?.userId) : null,
        original: log?.originalId ? u(log.originalId) : null,
      },
      upcoming: s.upcoming.map((x) => ({ periodKey: x.periodKey, user: u(x.userId) })),
      isMine,
      canDone: duty.active && !done && isMine,
      canVolunteer: duty.active && !done && !isMine && duty.mode === 'ROTATION',
      canManage: this.canManage(duty, viewer.id, ctx.isGroupAdmin, ctx.teams, !!ctx.cfg.memberCanCreate),
    };
  }

  private async context(groupId: string, viewer: AuthUser, isGroupAdmin: boolean, duties: Duty[]) {
    const [teams, cfg, teamRows] = await Promise.all([
      this.myTeams(groupId, viewer.id),
      this.settings.get(groupId, FEATURE),
      this.prisma.team.findMany({ where: { groupId, deletedAt: null }, select: { id: true, name: true } }),
    ]);
    const ids = new Set<string>();
    for (const d of duties) for (const id of d.memberIds as string[]) ids.add(id);
    const logs = await this.prisma.dutyLog.findMany({ where: { dutyId: { in: duties.map((d) => d.id) } }, select: { userId: true, originalId: true } });
    for (const l of logs) {
      ids.add(l.userId);
      if (l.originalId) ids.add(l.originalId);
    }
    const users = await this.prisma.user.findMany({ where: { id: { in: [...ids] } }, select: userSelect });
    return { isGroupAdmin, teams, cfg, users: new Map(users.map((x) => [x.id, x])), teamNames: new Map(teamRows.map((t) => [t.id, t.name])), teamRows };
  }

  /** 목록: scope=mine 이면 지금 내가 담당인 것만 */
  async list(groupId: string, viewer: AuthUser, isGroupAdmin: boolean, isManager: boolean, scope: string | undefined, q: PageQuery) {
    if (!(await this.features.isEnabled(groupId, FEATURE))) return { enabled: false as const, items: [], total: 0, page: q.page, pageSize: q.pageSize };
    const teams = await this.myTeams(groupId, viewer.id);
    const where = { groupId, ...(isGroupAdmin ? {} : { OR: [{ teamId: null }, { teamId: { in: teams.map((t) => t.teamId) } }] }) };
    const rows = await this.prisma.duty.findMany({ where, orderBy: [{ active: 'desc' }, { createdAt: 'asc' }] });
    const ctx = await this.context(groupId, viewer, isGroupAdmin, rows);
    let views = await Promise.all(rows.map((d) => this.view(d, viewer, ctx)));
    if (scope === 'mine') views = views.filter((v) => v.isMine && v.active);
    return {
      enabled: true as const,
      canCreate: isManager || !!ctx.cfg.memberCanCreate,
      teams: ctx.teamRows.filter((t) => isGroupAdmin || teams.some((m) => m.teamId === t.id)),
      doneReward: Number(ctx.cfg.doneReward),
      ...paged(views.slice(q.skip, q.skip + q.pageSize), views.length, q),
    };
  }

  private async dutyFor(groupId: string, viewer: AuthUser, isGroupAdmin: boolean, id: string) {
    const duty = await this.prisma.duty.findFirst({ where: { id, groupId } });
    if (!duty) throw AppError.notFound('업무를 찾을 수 없어요');
    if (duty.teamId && !isGroupAdmin && !(await this.myTeams(groupId, viewer.id)).some((t) => t.teamId === duty.teamId)) throw AppError.forbidden('우리 팀 업무가 아니에요');
    return duty;
  }

  private async assertMembers(groupId: string, teamId: string | null | undefined, ids: string[]) {
    const where = teamId ? { teamId, userId: { in: ids } } : null;
    const count = where
      ? await this.prisma.teamMember.count({ where })
      : await this.prisma.groupMembership.count({ where: { groupId, status: 'APPROVED', userId: { in: ids } } });
    if (count !== new Set(ids).size) throw bad(teamId ? '팀원만 담당자로 정할 수 있어요' : '그룹 구성원만 담당자로 정할 수 있어요');
  }

  async create(actor: AuthUser, groupId: string, isGroupAdmin: boolean, isManager: boolean, input: DutyInput) {
    await this.features.assertEnabled(groupId, FEATURE);
    const cfg = await this.settings.get(groupId, FEATURE);
    const teams = await this.myTeams(groupId, actor.id);
    if (!isManager && !cfg.memberCanCreate) throw AppError.forbidden('관리자만 업무를 만들 수 있어요');
    if (input.teamId && !isGroupAdmin && !teams.some((t) => t.teamId === input.teamId)) throw AppError.forbidden('우리 팀 업무만 만들 수 있어요');
    if (!input.teamId && !isGroupAdmin && !cfg.memberCanCreate) throw AppError.forbidden('그룹 전체 업무는 그룹 관리자만 만들 수 있어요');
    const memberIds = [...new Set(input.memberIds)];
    await this.assertMembers(groupId, input.teamId, memberIds);
    const row = await this.prisma.$transaction(async (tx) => {
      const d = await tx.duty.create({
        data: { groupId, teamId: input.teamId ?? null, name: input.name, icon: input.icon, description: input.description ?? null, mode: input.mode, period: input.period, memberIds, anchorDate: kstDate(), createdById: actor.id },
      });
      await this.audit.log(tx, { groupId, actorId: actor.id, action: 'duty.create', targetType: 'Duty', targetId: d.id, after: { name: d.name, mode: d.mode, period: d.period, members: memberIds.length } });
      return d;
    });
    return { id: row.id };
  }

  async update(actor: AuthUser, groupId: string, isGroupAdmin: boolean, id: string, input: DutyInput) {
    const duty = await this.dutyFor(groupId, actor, isGroupAdmin, id);
    const [teams, cfg] = await Promise.all([this.myTeams(groupId, actor.id), this.settings.get(groupId, FEATURE)]);
    if (!this.canManage(duty, actor.id, isGroupAdmin, teams, !!cfg.memberCanCreate)) throw AppError.forbidden('이 업무를 바꿀 수 없어요');
    const memberIds = [...new Set(input.memberIds)];
    await this.assertMembers(groupId, duty.teamId, memberIds);
    // 순번 대상이나 주기가 바뀌면 오늘부터 처음 순서로 다시 시작
    const reset = JSON.stringify(memberIds) !== JSON.stringify(duty.memberIds) || input.period !== duty.period || input.mode !== duty.mode;
    await this.prisma.$transaction(async (tx) => {
      await tx.duty.update({
        where: { id },
        data: {
          name: input.name,
          icon: input.icon,
          description: input.description ?? null,
          mode: input.mode,
          period: input.period,
          memberIds,
          active: input.active ?? duty.active,
          ...(reset ? { anchorDate: kstDate(), offset: 0 } : {}),
        },
      });
      await this.audit.log(tx, { groupId, actorId: actor.id, action: 'duty.update', targetType: 'Duty', targetId: id, before: { name: duty.name, members: duty.memberIds }, after: { name: input.name, members: memberIds, reset } });
    });
    return { ok: true, reset };
  }

  async remove(actor: AuthUser, groupId: string, isGroupAdmin: boolean, id: string) {
    const duty = await this.dutyFor(groupId, actor, isGroupAdmin, id);
    const [teams, cfg] = await Promise.all([this.myTeams(groupId, actor.id), this.settings.get(groupId, FEATURE)]);
    if (!this.canManage(duty, actor.id, isGroupAdmin, teams, !!cfg.memberCanCreate)) throw AppError.forbidden('이 업무를 지울 수 없어요');
    await this.prisma.$transaction(async (tx) => {
      await tx.duty.delete({ where: { id } });
      await this.audit.log(tx, { groupId, actorId: actor.id, action: 'duty.delete', targetType: 'Duty', targetId: id, before: { name: duty.name } });
    });
    return { ok: true };
  }

  private current(duty: Duty) {
    return this.schedule(duty, kstDate(), 0);
  }

  /** 완료 체크: 이번 기간 담당자가 */
  async done(actor: AuthUser, groupId: string, isGroupAdmin: boolean, id: string, memo?: string) {
    await this.features.assertEnabled(groupId, FEATURE);
    const duty = await this.dutyFor(groupId, actor, isGroupAdmin, id);
    if (!duty.active) throw bad('쉬고 있는 업무예요');
    const s = this.current(duty);
    const log = await this.prisma.dutyLog.findUnique({ where: { dutyId_periodKey: { dutyId: id, periodKey: s.key } } });
    const assignees = log && duty.mode === 'ROTATION' ? [log.userId] : s.assignees;
    if (!assignees.includes(actor.id)) throw AppError.forbidden('이번 담당자만 완료할 수 있어요');
    if (log?.status === 'DONE') throw bad('이미 완료했어요', HttpStatus.CONFLICT);
    await this.prisma.dutyLog.upsert({
      where: { dutyId_periodKey: { dutyId: id, periodKey: s.key } },
      create: { dutyId: id, periodKey: s.key, userId: actor.id, status: 'DONE', memo: memo || null, doneAt: new Date() },
      update: { userId: actor.id, status: 'DONE', memo: memo || null, doneAt: new Date() },
    });
    const cfg = await this.settings.get(groupId, FEATURE);
    const volunteered = !!log?.originalId && log.originalId !== actor.id;
    await this.points.addLedger(groupId, [
      { userId: actor.id, amount: Number(cfg.doneReward), kind: 'DUTY_REWARD', refId: `duty:${id}:${s.key}`, memo: `${duty.icon} ${duty.name} 완료` },
      ...(volunteered ? [{ userId: actor.id, amount: Number(cfg.volunteerReward), kind: 'DUTY_REWARD', refId: `duty-vol:${id}:${s.key}`, memo: `${duty.name} 대신 맡기 보너스` }] : []),
    ]);
    return { ok: true };
  }

  /** 이번 차례 대신 맡기 (순번 업무, 아직 완료 전) */
  async volunteer(actor: AuthUser, groupId: string, isGroupAdmin: boolean, id: string) {
    await this.features.assertEnabled(groupId, FEATURE);
    const duty = await this.dutyFor(groupId, actor, isGroupAdmin, id);
    if (duty.mode !== 'ROTATION') throw bad('순번 업무만 대신 맡을 수 있어요');
    const s = this.current(duty);
    const log = await this.prisma.dutyLog.findUnique({ where: { dutyId_periodKey: { dutyId: id, periodKey: s.key } } });
    if (log?.status === 'DONE') throw bad('이미 완료된 차례예요', HttpStatus.CONFLICT);
    const scheduled = log?.originalId ?? log?.userId ?? s.assignees[0];
    if ((log?.userId ?? scheduled) === actor.id) throw bad('이미 내 차례예요');
    await this.assertMembers(groupId, duty.teamId, [actor.id]);
    await this.prisma.dutyLog.upsert({
      where: { dutyId_periodKey: { dutyId: id, periodKey: s.key } },
      create: { dutyId: id, periodKey: s.key, userId: actor.id, originalId: scheduled },
      update: { userId: actor.id, originalId: scheduled },
    });
    return { ok: true };
  }

  /** 이번 차례 넘기기: 현재 담당자 또는 관리자가 다른 사람에게 */
  async handover(actor: AuthUser, groupId: string, isGroupAdmin: boolean, id: string, userId: string) {
    await this.features.assertEnabled(groupId, FEATURE);
    const duty = await this.dutyFor(groupId, actor, isGroupAdmin, id);
    if (duty.mode !== 'ROTATION') throw bad('순번 업무만 넘길 수 있어요');
    const [teams, cfg] = await Promise.all([this.myTeams(groupId, actor.id), this.settings.get(groupId, FEATURE)]);
    const s = this.current(duty);
    const log = await this.prisma.dutyLog.findUnique({ where: { dutyId_periodKey: { dutyId: id, periodKey: s.key } } });
    const holder = log?.userId ?? s.assignees[0];
    if (holder !== actor.id && !this.canManage(duty, actor.id, isGroupAdmin, teams, !!cfg.memberCanCreate)) throw AppError.forbidden('담당자나 관리자만 넘길 수 있어요');
    if (log?.status === 'DONE') throw bad('이미 완료된 차례예요', HttpStatus.CONFLICT);
    await this.assertMembers(groupId, duty.teamId, [userId]);
    await this.prisma.dutyLog.upsert({
      where: { dutyId_periodKey: { dutyId: id, periodKey: s.key } },
      create: { dutyId: id, periodKey: s.key, userId, originalId: holder },
      update: { userId, originalId: log?.originalId ?? holder },
    });
    return { ok: true };
  }

  /** 순번 건너뛰기 (관리자): 이번 담당자를 다음 사람으로 */
  async skip(actor: AuthUser, groupId: string, isGroupAdmin: boolean, id: string) {
    const duty = await this.dutyFor(groupId, actor, isGroupAdmin, id);
    const [teams, cfg] = await Promise.all([this.myTeams(groupId, actor.id), this.settings.get(groupId, FEATURE)]);
    if (!this.canManage(duty, actor.id, isGroupAdmin, teams, !!cfg.memberCanCreate)) throw AppError.forbidden('관리자만 건너뛸 수 있어요');
    if (duty.mode !== 'ROTATION') throw bad('순번 업무만 건너뛸 수 있어요');
    const s = this.current(duty);
    await this.prisma.$transaction(async (tx) => {
      await tx.duty.update({ where: { id }, data: { offset: { increment: 1 } } });
      await tx.dutyLog.deleteMany({ where: { dutyId: id, periodKey: s.key, status: { not: 'DONE' } } });
      await this.audit.log(tx, { groupId, actorId: actor.id, action: 'duty.skip', targetType: 'Duty', targetId: id, after: { periodKey: s.key } });
    });
    return { ok: true };
  }

  /** 기간별 기록 (완료·대신 맡기) */
  async history(groupId: string, viewer: AuthUser, isGroupAdmin: boolean, id: string, q: PageQuery) {
    await this.dutyFor(groupId, viewer, isGroupAdmin, id);
    const [rows, total] = await Promise.all([
      this.prisma.dutyLog.findMany({ where: { dutyId: id }, orderBy: { periodKey: 'desc' }, skip: q.skip, take: q.pageSize }),
      this.prisma.dutyLog.count({ where: { dutyId: id } }),
    ]);
    const ids = [...new Set(rows.flatMap((r) => [r.userId, r.originalId].filter(Boolean) as string[]))];
    const users = new Map((await this.prisma.user.findMany({ where: { id: { in: ids } }, select: userSelect })).map((u) => [u.id, u]));
    return paged(
      rows.map((r) => ({ id: r.id, periodKey: r.periodKey, status: r.status, memo: r.memo, doneAt: r.doneAt, user: users.get(r.userId) ?? null, original: r.originalId ? (users.get(r.originalId) ?? null) : null })),
      total,
      q,
    );
  }
}
