import { HttpStatus, Injectable } from '@nestjs/common';
import {
  ErrorCode,
  FeatureKey,
  NominateEmployeeOfTheMonthInput,
  CreateEmployeeOfTheMonthCommentInput,
  UpdateEmployeeOfTheMonthCommentInput,
  SetEmployeeOfTheMonthWinnersInput,
  UpdateEmployeeOfTheMonthSettingInput,
} from '@weplay/shared';
import { AppError } from '../../common/app-error';
import { AuditService } from '../../common/audit.service';
import { AuthUser } from '../../common/decorators';
import { PrismaService } from '../../common/prisma.service';
import { FeaturesService } from '../features/features.service';
import { paged, PageQuery } from '../../common/paging';

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const DEFAULT_PUBLISH_DAY = 1;
const DEFAULT_WINNER_COUNT = 1;
const DASHBOARD_MONTHS = 6;
const AUTO_SELECTOR = 'AUTO';

/** 범위(scope)가 있으면 해당 사용자 필드를 범위 안으로 제한 */
const inScope = (field: string, scope: Set<string> | null) => (scope ? { [field]: { in: [...scope] } } : {});
const TOP_NOMINEES = 3;

const userSelect = { id: true, name: true, avatarUrl: true } as const;
const winnerInclude = { user: { select: userSelect } } as const;
const nominationInclude = { nominator: { select: userSelect }, nominee: { select: userSelect } } as const;

/** 오늘 날짜 (KST) YYYY-MM-DD */
export function todayKST(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(now);
}

/** 현재 월 (KST) YYYY-MM */
export function currentMonthKST(now = new Date()) {
  return todayKST(now).slice(0, 7);
}

/** 해당 월의 결과 공개 여부. 과거 월은 항상 공개, 이번 달은 공개일부터 공개 */
export function isPublished(month: string, publishDay: number, now = new Date()) {
  const today = todayKST(now);
  const thisMonth = today.slice(0, 7);
  if (month < thisMonth) return true;
  if (month > thisMonth) return false;
  return Number(today.slice(8, 10)) >= publishDay;
}

/** 'YYYY-MM'을 delta개월 이동 */
function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

type WinnerRow = { month: string; note: string | null; updatedAt: Date; user: { id: string; name: string; avatarUrl: string | null } };
type NominationRow = {
  id: string;
  month: string;
  reason: string;
  updatedAt: Date;
  nominator: { id: string; name: string; avatarUrl: string | null };
  nominee: { id: string; name: string; avatarUrl: string | null };
};

type CommentView = {
  id: string;
  body: string;
  createdAt: Date;
  author: { id: string; name: string; avatarUrl: string | null };
  canDelete: boolean;
};

/** 공개된 달의 선정자 전체 (명예의 전당 집계용) */
const publishedWinnersOf = (months: string[], byMonth: Map<string, WinnerRow[]>) => months.flatMap((m) => byMonth.get(m) ?? []);

/** 최다 횟수 항목 전부 (0이면 없음) */
function topOf(rows: { user: { id: string; name: string; avatarUrl: string | null }; count: number }[]) {
  const max = Math.max(0, ...rows.map((r) => r.count));
  if (max === 0) return null;
  return { count: max, users: rows.filter((r) => r.count === max).map((r) => r.user) };
}

const toWinnerView = (r: WinnerRow) => ({
  month: r.month,
  note: r.note,
  updatedAt: r.updatedAt,
  user: r.user,
});
const toNominationView = (r: NominationRow) => ({
  id: r.id,
  month: r.month,
  reason: r.reason,
  updatedAt: r.updatedAt,
  nominator: r.nominator,
  nominee: r.nominee,
});

@Injectable()
export class EmployeeOfTheMonthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly features: FeaturesService,
  ) {}

  private async settingOf(groupId: string) {
    const setting = await this.prisma.employeeOfTheMonthSetting.findUnique({ where: { groupId } });
    return {
      publishDay: setting?.publishDay ?? DEFAULT_PUBLISH_DAY,
      winnerCount: setting?.winnerCount ?? DEFAULT_WINNER_COUNT,
    };
  }

  /** 이달의 사원 내역: 구성원별 선정 횟수 (공개된 달 기준, 많은 순, 페이지네이션) */
  async hallList(groupId: string, q: PageQuery) {
    if (!(await this.features.isEnabled(groupId, FeatureKey.EMPLOYEE_OF_THE_MONTH))) {
      return { enabled: false as const, items: [], total: 0, page: q.page, pageSize: q.pageSize };
    }
    const { publishDay } = await this.settingOf(groupId);
    const winners = await this.prisma.employeeOfTheMonth.findMany({
      where: { groupId, month: { lte: currentMonthKST() } },
      select: { month: true, userId: true, user: { select: userSelect } },
    });
    const counts = new Map<string, { user: (typeof winners)[number]['user']; count: number }>();
    for (const w of winners) {
      if (!isPublished(w.month, publishDay)) continue;
      const entry = counts.get(w.userId) ?? { user: w.user, count: 0 };
      entry.count += 1;
      counts.set(w.userId, entry);
    }
    const sorted = [...counts.values()].sort((a, b) => b.count - a.count || a.user.name.localeCompare(b.user.name, 'ko'));
    return { enabled: true as const, ...paged(sorted.slice(q.skip, q.skip + q.pageSize), sorted.length, q) };
  }

  /** 명예의 전당 요약: 공개된 달 기준 최다 선정·최다 추천 (동점은 모두 표시) */
  private async hallOfFame(groupId: string, publishedWinners: WinnerRow[], publishedMonths: string[]) {
    const selectCounts = new Map<string, { user: WinnerRow['user']; count: number }>();
    for (const w of publishedWinners) {
      const entry = selectCounts.get(w.user.id) ?? { user: w.user, count: 0 };
      entry.count += 1;
      selectCounts.set(w.user.id, entry);
    }

    const nominationCounts = publishedMonths.length
      ? await this.prisma.employeeOfTheMonthNomination.groupBy({
          by: ['nomineeId'],
          where: { groupId, month: { in: publishedMonths } },
          _count: { _all: true },
        })
      : [];
    const countById = new Map<string, number>(nominationCounts.map((c) => [c.nomineeId, c._count._all] as [string, number]));
    const nominees = nominationCounts.length
      ? await this.prisma.user.findMany({ where: { id: { in: [...countById.keys()] } }, select: userSelect })
      : [];

    return {
      mostSelected: topOf([...selectCounts.values()]),
      mostNominated: topOf(nominees.map((u) => ({ user: u, count: countById.get(u.id) ?? 0 }))),
    };
  }

  /** 공개일이 지났는데 선정자가 없는 달은 추천 상위 N명(활성 구성원)을 자동 선정 */
  private async autoSelectMissing(groupId: string, publishDay: number, winnerCount: number) {
    const nominatedMonths = await this.prisma.employeeOfTheMonthNomination.groupBy({
      by: ['month'],
      where: { groupId, month: { lte: currentMonthKST() } },
    });
    const published = nominatedMonths.map((r) => r.month).filter((m) => isPublished(m, publishDay));
    if (published.length === 0) return;

    const decided = await this.prisma.employeeOfTheMonth.groupBy({ by: ['month'], where: { groupId, month: { in: published } } });
    const decidedMonths = new Set(decided.map((d) => d.month));
    const targets = published.filter((m) => !decidedMonths.has(m));
    if (targets.length === 0) return;

    const counts = await this.prisma.employeeOfTheMonthNomination.groupBy({
      by: ['month', 'nomineeId'],
      where: { groupId, month: { in: targets } },
      _count: { _all: true },
    });
    const eligible = await this.prisma.user.findMany({
      where: { id: { in: [...new Set(counts.map((c) => c.nomineeId))] }, status: 'ACTIVE', groupMemberships: { some: { groupId, status: 'APPROVED' } } },
      select: { id: true },
    });
    const eligibleIds = new Set(eligible.map((u) => u.id));

    const picks = targets.flatMap((month) =>
      counts
        .filter((c) => c.month === month && eligibleIds.has(c.nomineeId))
        .sort((a, b) => b._count._all - a._count._all)
        .slice(0, winnerCount)
        .map((c) => ({ month, userId: c.nomineeId })),
    );
    if (picks.length === 0) return;

    await this.prisma.$transaction(async (tx) => {
      await tx.employeeOfTheMonth.createMany({
        data: picks.map((p) => ({ groupId, month: p.month, userId: p.userId, note: null, selectedById: AUTO_SELECTOR })),
      });
      await this.audit.log(tx, {
        groupId,
        actorId: null,
        action: 'employee_of_the_month.auto_select',
        targetType: 'EmployeeOfTheMonth',
        targetId: groupId,
        after: { picks },
      });
    });
  }

  /** 구성원 화면: 선택한 월의 이달의 사원(공개된 경우만), 공개 예정, 내 추천, 명예의 전당 요약 */
  async overview(groupId: string, userId: string, monthParam: string | undefined, isAdmin = false) {
    const month = currentMonthKST();
    const requested = monthParam && MONTH_PATTERN.test(monthParam) && monthParam <= month ? monthParam : undefined;
    if (!(await this.features.isEnabled(groupId, FeatureKey.EMPLOYEE_OF_THE_MONTH))) {
      return {
        enabled: false as const,
        month,
        publishDay: DEFAULT_PUBLISH_DAY,
        winnerCount: DEFAULT_WINNER_COUNT,
        selectedMonth: requested ?? month,
        selectedPublished: false,
        selectedWinners: [],
        publishedMonth: null,
        publishedWinners: [],
        pendingPublishDate: null,
        nextPublishDate: null,
        nominationMonth: month,
        myNomination: null,
        hallOfFame: { mostSelected: null, mostNominated: null },
      };
    }
    const { publishDay, winnerCount } = await this.settingOf(groupId);
    await this.autoSelectMissing(groupId, publishDay, winnerCount);
    const nominationMonth = await this.nominationMonthOf(groupId);
    const [winners, myNomination] = await Promise.all([
      this.prisma.employeeOfTheMonth.findMany({
        where: { groupId, month: { lte: month } },
        include: winnerInclude,
        orderBy: [{ month: 'desc' }, { createdAt: 'asc' }],
      }),
      this.prisma.employeeOfTheMonthNomination.findUnique({
        where: { groupId_month_nominatorId: { groupId, month: nominationMonth, nominatorId: userId } },
        include: nominationInclude,
      }),
    ]);

    const byMonth = new Map<string, WinnerRow[]>();
    for (const w of winners) byMonth.set(w.month, [...(byMonth.get(w.month) ?? []), w]);
    const publishedMonths = [...byMonth.keys()].filter((m) => isPublished(m, publishDay));
    const publishedMonth = publishedMonths[0] ?? null;
    const selectedMonth = requested ?? publishedMonth ?? month;
    const selectedPublished = isPublished(selectedMonth, publishDay);
    // 이번 달 결과가 있어도 공개일 전이면 직전달 결과를 보여줌
    const pendingThisMonth = byMonth.has(month) && !isPublished(month, publishDay);

    const view = (w: WinnerRow) => toWinnerView(w);
    const publishedWinners = publishedWinnersOf(publishedMonths, byMonth);

    return {
      enabled: true as const,
      month,
      publishDay,
      winnerCount,
      selectedMonth,
      selectedPublished,
      selectedWinners: selectedPublished ? (byMonth.get(selectedMonth) ?? []).map(view) : [],
      publishedMonth,
      publishedWinners: publishedMonth ? (byMonth.get(publishedMonth) ?? []).map(view) : [],
      pendingPublishDate: pendingThisMonth ? `${month}-${String(publishDay).padStart(2, '0')}` : null,
      // 다음 공개일: 이번 달 공개일이 지났으면 다음 달 공개일
      nextPublishDate: `${isPublished(month, publishDay) ? shiftMonth(month, 1) : month}-${String(publishDay).padStart(2, '0')}`,
      nominationMonth,
      myNomination: myNomination ? toNominationView(myNomination) : null,
      hallOfFame: await this.hallOfFame(groupId, publishedWinners, publishedMonths),
    };
  }

  /** 관리자 조회 범위: 그룹 ADMIN은 전체(null), 팀 ADMIN은 담당 팀 구성원만 */
  async managerScope(groupId: string, viewerId: string, isGroupAdmin: boolean): Promise<Set<string> | null> {
    if (isGroupAdmin) return null;
    const managed = await this.prisma.teamMember.findMany({
      where: { groupId, userId: viewerId, role: 'ADMIN', team: { deletedAt: null } },
      select: { teamId: true },
    });
    if (managed.length === 0) return new Set();
    const members = await this.prisma.teamMember.findMany({
      where: { groupId, teamId: { in: managed.map((m) => m.teamId) } },
      select: { userId: true },
    });
    return new Set(members.map((m) => m.userId));
  }

  /** 추천 대상 달: 항상 아직 공개되지 않은 달 (이번 달이 공개됐으면 다음 달) */
  private async nominationMonthOf(groupId: string) {
    const { publishDay } = await this.settingOf(groupId);
    const current = currentMonthKST();
    return isPublished(current, publishDay) ? shiftMonth(current, 1) : current;
  }

  /** 이번 달 추천 (같은 달에는 덮어쓰기) */
  async nominate(actor: AuthUser, groupId: string, input: NominateEmployeeOfTheMonthInput) {
    await this.features.assertEnabled(groupId, FeatureKey.EMPLOYEE_OF_THE_MONTH);
    if (input.nomineeId === actor.id) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, '본인은 추천할 수 없습니다', HttpStatus.BAD_REQUEST);
    }
    await this.assertApprovedMember(groupId, input.nomineeId);

    const month = await this.nominationMonthOf(groupId);
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.employeeOfTheMonthNomination.upsert({
        where: { groupId_month_nominatorId: { groupId, month, nominatorId: actor.id } },
        create: { groupId, month, nominatorId: actor.id, nomineeId: input.nomineeId, reason: input.reason },
        update: { nomineeId: input.nomineeId, reason: input.reason },
        include: nominationInclude,
      });
      await this.audit.log(tx, {
        groupId,
        actorId: actor.id,
        action: 'employee_of_the_month.nominate',
        targetType: 'EmployeeOfTheMonthNomination',
        targetId: row.id,
        after: { month, nomineeId: input.nomineeId },
      });
      return toNominationView(row);
    });
  }

  /** 이번 달 내 추천 취소 */
  async withdraw(actor: AuthUser, groupId: string) {
    await this.features.assertEnabled(groupId, FeatureKey.EMPLOYEE_OF_THE_MONTH);
    const month = await this.nominationMonthOf(groupId);
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.employeeOfTheMonthNomination.findUnique({
        where: { groupId_month_nominatorId: { groupId, month, nominatorId: actor.id } },
      });
      if (!row) throw AppError.notFound('이번 달 추천 내역이 없습니다');
      await tx.employeeOfTheMonthNomination.delete({ where: { id: row.id } });
      await this.audit.log(tx, {
        groupId,
        actorId: actor.id,
        action: 'employee_of_the_month.withdraw',
        targetType: 'EmployeeOfTheMonthNomination',
        targetId: row.id,
        before: { month, nomineeId: row.nomineeId },
      });
      return { ok: true };
    });
  }

  /** 명예의 전당 댓글 작성: 공개된 선정자에게만 */
  async createComment(actor: AuthUser, groupId: string, input: CreateEmployeeOfTheMonthCommentInput) {
    await this.features.assertEnabled(groupId, FeatureKey.EMPLOYEE_OF_THE_MONTH);
    this.assertMonth(input.month);
    const { publishDay } = await this.settingOf(groupId);
    if (!isPublished(input.month, publishDay)) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, '아직 공개되지 않은 달입니다', HttpStatus.BAD_REQUEST);
    }
    const winner = await this.prisma.employeeOfTheMonth.findFirst({
      where: { groupId, month: input.month, userId: input.targetUserId },
    });
    if (!winner) throw AppError.notFound('해당 월의 선정자가 아닙니다');

    return this.prisma.$transaction(async (tx) => {
      const row = await tx.employeeOfTheMonthComment.create({
        data: { groupId, month: input.month, targetUserId: input.targetUserId, authorId: actor.id, body: input.body },
        include: { author: { select: userSelect } },
      });
      await this.audit.log(tx, {
        groupId,
        actorId: actor.id,
        action: 'employee_of_the_month.comment',
        targetType: 'EmployeeOfTheMonthComment',
        targetId: row.id,
        after: { month: input.month, targetUserId: input.targetUserId },
      });
      return { id: row.id, body: row.body, createdAt: row.createdAt, author: row.author, canDelete: true };
    });
  }

  /** 댓글 수정: 작성자 본인만 (관리자는 삭제로 관리) */
  async updateComment(actor: AuthUser, groupId: string, commentId: string, input: UpdateEmployeeOfTheMonthCommentInput) {
    await this.features.assertEnabled(groupId, FeatureKey.EMPLOYEE_OF_THE_MONTH);
    const row = await this.prisma.employeeOfTheMonthComment.findFirst({ where: { id: commentId, groupId } });
    if (!row) throw AppError.notFound('댓글을 찾을 수 없습니다');
    if (row.authorId !== actor.id) throw AppError.forbidden('본인 댓글만 수정할 수 있습니다');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.employeeOfTheMonthComment.update({
        where: { id: row.id },
        data: { body: input.body },
        include: { author: { select: userSelect } },
      });
      await this.audit.log(tx, {
        groupId,
        actorId: actor.id,
        action: 'employee_of_the_month.comment_edit',
        targetType: 'EmployeeOfTheMonthComment',
        targetId: row.id,
        before: { body: row.body },
        after: { body: input.body },
      });
      return { id: updated.id, body: updated.body, createdAt: updated.createdAt, author: updated.author, canDelete: true, canEdit: true };
    });
  }

  /** 댓글 삭제: 작성자 본인 또는 그룹 ADMIN */
  async removeComment(actor: AuthUser, groupId: string, commentId: string, isAdmin: boolean) {
    const row = await this.prisma.employeeOfTheMonthComment.findFirst({ where: { id: commentId, groupId } });
    if (!row) throw AppError.notFound('댓글을 찾을 수 없습니다');
    if (!isAdmin && row.authorId !== actor.id) throw AppError.forbidden('본인 댓글만 삭제할 수 있습니다');

    return this.prisma.$transaction(async (tx) => {
      await tx.employeeOfTheMonthComment.delete({ where: { id: row.id } });
      await this.audit.log(tx, {
        groupId,
        actorId: actor.id,
        action: 'employee_of_the_month.comment_delete',
        targetType: 'EmployeeOfTheMonthComment',
        targetId: row.id,
        before: { month: row.month, targetUserId: row.targetUserId, body: row.body },
      });
      return { ok: true };
    });
  }

  /** 관리자: 부적절한 추천 삭제 (감사 로그에 내용 보존) */
  async deleteNomination(actor: AuthUser, groupId: string, nominationId: string) {
    const row = await this.prisma.employeeOfTheMonthNomination.findFirst({ where: { id: nominationId, groupId } });
    if (!row) throw AppError.notFound('추천을 찾을 수 없습니다');
    return this.prisma.$transaction(async (tx) => {
      await tx.employeeOfTheMonthNomination.delete({ where: { id: row.id } });
      await this.audit.log(tx, {
        groupId,
        actorId: actor.id,
        action: 'employee_of_the_month.nomination_delete',
        targetType: 'EmployeeOfTheMonthNomination',
        targetId: row.id,
        before: { month: row.month, nominatorId: row.nominatorId, nomineeId: row.nomineeId, reason: row.reason },
      });
      return { ok: true };
    });
  }

  /** ADMIN 대시보드: 최근 6개월 월별 추천 집계와 선정 결과 */
  async dashboard(groupId: string, scope: Set<string> | null) {
    const enabled = await this.features.isEnabled(groupId, FeatureKey.EMPLOYEE_OF_THE_MONTH);
    const months = Array.from({ length: DASHBOARD_MONTHS }, (_, i) => shiftMonth(currentMonthKST(), -i));
    if (!enabled) return { enabled: false as const, months: [] };

    const [counts, winners, { publishDay }] = await Promise.all([
      this.prisma.employeeOfTheMonthNomination.groupBy({
        by: ['month', 'nomineeId'],
        where: { groupId, month: { in: months }, ...inScope('nomineeId', scope) },
        _count: { _all: true },
      }),
      this.prisma.employeeOfTheMonth.findMany({
        where: { groupId, month: { in: months }, ...inScope('userId', scope) },
        include: winnerInclude,
        orderBy: { createdAt: 'asc' },
      }),
      this.settingOf(groupId),
    ]);
    const nomineeIds = [...new Set(counts.map((c) => c.nomineeId))];
    const users = await this.prisma.user.findMany({ where: { id: { in: nomineeIds } }, select: userSelect });
    const userById = new Map(users.map((u) => [u.id, u]));

    return {
      enabled: true as const,
      months: months.map((month) => {
        const rows = counts
          .filter((c) => c.month === month)
          .map((c) => ({ user: userById.get(c.nomineeId)!, count: c._count._all }))
          .sort((a, b) => b.count - a.count);
        return {
          month,
          total: rows.reduce((sum, r) => sum + r.count, 0),
          top: rows.slice(0, TOP_NOMINEES),
          winners: winners.filter((w) => w.month === month).map((w) => toWinnerView(w)),
          published: isPublished(month, publishDay),
        };
      }),
    };
  }

  /** ADMIN 월별 요약: 공개 여부, 선정 결과, 추천 참여 인원 (목록은 아래 페이지네이션 API) */
  async monthDetail(groupId: string, month: string, scope: Set<string> | null) {
    this.assertMonth(month);
    await this.features.assertEnabled(groupId, FeatureKey.EMPLOYEE_OF_THE_MONTH);
    const [nominators, winners, setting, members] = await Promise.all([
      this.prisma.employeeOfTheMonthNomination.findMany({
        where: { groupId, month, ...inScope('nominatorId', scope) },
        select: { nominatorId: true },
        distinct: ['nominatorId'],
      }),
      this.prisma.employeeOfTheMonth.findMany({ where: { groupId, month, ...inScope('userId', scope) }, include: winnerInclude, orderBy: { createdAt: 'asc' } }),
      this.settingOf(groupId),
      this.prisma.groupMembership.count({ where: { groupId, status: 'APPROVED', user: { status: 'ACTIVE' }, ...inScope('userId', scope) } }),
    ]);
    return {
      month,
      publishDay: setting.publishDay,
      winnerCount: setting.winnerCount,
      published: isPublished(month, setting.publishDay),
      winners: winners.map((w) => toWinnerView(w)),
      participation: { total: members, nominated: nominators.length },
    };
  }

  /** 페이지 목록 공통: 추천 내역 */
  async adminNominations(groupId: string, month: string, q: PageQuery, scope: Set<string> | null) {
    this.assertMonth(month);
    // 팀 ADMIN은 담당 팀 구성원이 후보인 추천만 (범위 밖 후보 이름 노출 방지)
    const where = { groupId, month, ...inScope('nomineeId', scope) };
    const [rows, total] = await Promise.all([
      this.prisma.employeeOfTheMonthNomination.findMany({ where, include: nominationInclude, orderBy: { createdAt: 'asc' }, skip: q.skip, take: q.pageSize }),
      this.prisma.employeeOfTheMonthNomination.count({ where }),
    ]);
    return paged(rows.map(toNominationView), total, q);
  }

  /** 선정 후보: 추천 받은 수 + 칭찬 카드 받은 수 (추천 많은 순) */
  async adminCandidates(groupId: string, month: string, q: PageQuery, scope: Set<string> | null) {
    this.assertMonth(month);
    const [counts, compliments] = await Promise.all([
      this.prisma.employeeOfTheMonthNomination.groupBy({ by: ['nomineeId'], where: { groupId, month, ...inScope('nomineeId', scope) }, _count: { _all: true } }),
      this.prisma.complimentCard.groupBy({ by: ['receiverId'], where: { groupId, month, ...inScope('receiverId', scope) }, _count: { _all: true } }),
    ]);
    const complimentById = new Map(compliments.map((c) => [c.receiverId, c._count._all]));
    const sorted = [...counts].sort((a, b) => b._count._all - a._count._all);
    const slice = sorted.slice(q.skip, q.skip + q.pageSize);
    const users = slice.length
      ? await this.prisma.user.findMany({ where: { id: { in: slice.map((c) => c.nomineeId) } }, select: userSelect })
      : [];
    const userById = new Map(users.map((u) => [u.id, u]));
    return paged(
      slice.map((c) => ({
        user: userById.get(c.nomineeId)!,
        count: c._count._all,
        complimentCount: complimentById.get(c.nomineeId) ?? 0,
      })),
      counts.length,
      q,
    );
  }

  /** 관리자: 월별 댓글 목록 */
  async adminComments(groupId: string, month: string, q: PageQuery, scope: Set<string> | null) {
    this.assertMonth(month);
    // 팀 ADMIN은 담당 팀 구성원에게 달린 댓글만
    const where = { groupId, month, ...inScope('targetUserId', scope) };
    const [rows, total] = await Promise.all([
      this.prisma.employeeOfTheMonthComment.findMany({
        where,
        include: { author: { select: userSelect }, target: { select: userSelect } },
        orderBy: { createdAt: 'asc' },
        skip: q.skip,
        take: q.pageSize,
      }),
      this.prisma.employeeOfTheMonthComment.count({ where }),
    ]);
    return paged(rows.map((c) => ({ id: c.id, body: c.body, createdAt: c.createdAt, author: c.author, target: c.target })), total, q);
  }

  /** 관리자: 칭찬 카드 받은 수 순위 (같은 달) */
  async adminCompliments(groupId: string, month: string, q: PageQuery, scope: Set<string> | null) {
    this.assertMonth(month);
    const counts = await this.prisma.complimentCard.groupBy({
      by: ['receiverId'],
      where: { groupId, month, ...inScope('receiverId', scope) },
      _count: { _all: true },
      orderBy: { _count: { receiverId: 'desc' } },
    });
    const slice = counts.slice(q.skip, q.skip + q.pageSize);
    const users = slice.length
      ? await this.prisma.user.findMany({ where: { id: { in: slice.map((c) => c.receiverId) } }, select: userSelect })
      : [];
    const userById = new Map(users.map((u) => [u.id, u]));
    return paged(slice.map((c) => ({ user: userById.get(c.receiverId)!, count: c._count._all })), counts.length, q);
  }

  /** 관리자: 이번 달 추천을 하지 않은 활성 구성원 */
  async adminMissing(groupId: string, month: string, q: PageQuery, scope: Set<string> | null) {
    this.assertMonth(month);
    const [nominators, members] = await Promise.all([
      this.prisma.employeeOfTheMonthNomination.findMany({ where: { groupId, month }, select: { nominatorId: true }, distinct: ['nominatorId'] }),
      this.prisma.groupMembership.findMany({
        where: { groupId, status: 'APPROVED', user: { status: 'ACTIVE' } },
        select: { user: { select: userSelect } },
        orderBy: { joinedAt: 'asc' },
      }),
    ]);
    const nominated = new Set(nominators.map((n) => n.nominatorId));
    const missing = members.map((m) => m.user).filter((u) => !nominated.has(u.id) && (!scope || scope.has(u.id)));
    return paged(missing.slice(q.skip, q.skip + q.pageSize), missing.length, q);
  }

  /** 선정자 상세 목록: 추천 사유(익명, 내용만) 또는 댓글 (페이지네이션) */
  async winnerList(viewerId: string, isAdmin: boolean, groupId: string, month: string, userId: string, kind: 'reasons' | 'comments', q: PageQuery) {
    this.assertMonth(month);
    if (kind === 'reasons') {
      const where = { groupId, month, nomineeId: userId };
      const [rows, total] = await Promise.all([
        this.prisma.employeeOfTheMonthNomination.findMany({ where, select: { id: true, reason: true, createdAt: true }, orderBy: { createdAt: 'asc' }, skip: q.skip, take: q.pageSize }),
        this.prisma.employeeOfTheMonthNomination.count({ where }),
      ]);
      return paged(rows.map((r) => ({ id: r.id, reason: r.reason, createdAt: r.createdAt })), total, q);
    }
    const where = { groupId, month, targetUserId: userId };
    const [rows, total] = await Promise.all([
      this.prisma.employeeOfTheMonthComment.findMany({ where, include: { author: { select: userSelect } }, orderBy: { createdAt: 'asc' }, skip: q.skip, take: q.pageSize }),
      this.prisma.employeeOfTheMonthComment.count({ where }),
    ]);
    return paged(
      rows.map((c) => ({
        id: c.id,
        body: c.body,
        createdAt: c.createdAt,
        author: c.author,
        canDelete: isAdmin || c.authorId === viewerId,
        canEdit: c.authorId === viewerId,
      })),
      total,
      q,
    );
  }

  /** ADMIN 선정: 해당 월의 선정 목록을 통째로 교체. 인원은 그룹 설정(winnerCount)을 넘을 수 없음 */
  async selectWinners(actor: AuthUser, groupId: string, month: string, input: SetEmployeeOfTheMonthWinnersInput, scope: Set<string> | null) {
    this.assertMonth(month);
    await this.features.assertEnabled(groupId, FeatureKey.EMPLOYEE_OF_THE_MONTH);

    const userIds = input.winners.map((w) => w.userId);
    if (new Set(userIds).size !== userIds.length) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, '같은 구성원을 두 번 선정할 수 없습니다', HttpStatus.BAD_REQUEST);
    }
    const { winnerCount } = await this.settingOf(groupId);
    if (userIds.length > winnerCount) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, `선정 인원은 최대 ${winnerCount}명입니다`, HttpStatus.BAD_REQUEST);
    }
    for (const userId of userIds) {
      if (scope && !scope.has(userId)) throw AppError.forbidden('담당 팀 구성원만 선정할 수 있어요');
      await this.assertApprovedMember(groupId, userId);
    }

    return this.prisma.$transaction(async (tx) => {
      const before = await tx.employeeOfTheMonth.findMany({ where: { groupId, month }, select: { userId: true } });
      await tx.employeeOfTheMonth.deleteMany({ where: { groupId, month } });
      if (input.winners.length > 0) {
        await tx.employeeOfTheMonth.createMany({
          data: input.winners.map((w) => ({ groupId, month, userId: w.userId, note: w.note ?? null, selectedById: actor.id })),
        });
      }
      const rows = await tx.employeeOfTheMonth.findMany({ where: { groupId, month }, include: winnerInclude, orderBy: { createdAt: 'asc' } });
      await this.audit.log(tx, {
        groupId,
        actorId: actor.id,
        action: 'employee_of_the_month.select',
        targetType: 'EmployeeOfTheMonth',
        targetId: groupId,
        before: { month, userIds: before.map((b) => b.userId) },
        after: { month, userIds },
      });
      return rows.map((w) => toWinnerView(w));
    });
  }

  /** 공개일(1~28일), 선정 인원(1~5명) 설정. 보낸 값만 변경 */
  async updateSettings(actor: AuthUser, groupId: string, input: UpdateEmployeeOfTheMonthSettingInput) {
    await this.features.assertEnabled(groupId, FeatureKey.EMPLOYEE_OF_THE_MONTH);
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.employeeOfTheMonthSetting.findUnique({ where: { groupId } });
      const row = await tx.employeeOfTheMonthSetting.upsert({
        where: { groupId },
        create: {
          groupId,
          publishDay: input.publishDay ?? DEFAULT_PUBLISH_DAY,
          winnerCount: input.winnerCount ?? DEFAULT_WINNER_COUNT,
          updatedById: actor.id,
        },
        update: { ...input, updatedById: actor.id },
      });
      await this.audit.log(tx, {
        groupId,
        actorId: actor.id,
        action: 'employee_of_the_month.settings',
        targetType: 'EmployeeOfTheMonthSetting',
        targetId: groupId,
        before: { publishDay: before?.publishDay ?? DEFAULT_PUBLISH_DAY, winnerCount: before?.winnerCount ?? DEFAULT_WINNER_COUNT },
        after: { publishDay: row.publishDay, winnerCount: row.winnerCount },
      });
      return { publishDay: row.publishDay, winnerCount: row.winnerCount };
    });
  }

  private assertMonth(month: string) {
    if (!MONTH_PATTERN.test(month) || month > shiftMonth(currentMonthKST(), 1)) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, '유효하지 않은 월입니다', HttpStatus.BAD_REQUEST);
    }
  }

  /** 추천·선정 대상: 승인된 구성원이면서 활성 계정 */
  private async assertApprovedMember(groupId: string, userId: string) {
    const membership = await this.prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId, groupId } },
      include: { user: { select: { status: true } } },
    });
    if (membership?.status !== 'APPROVED' || membership.user.status !== 'ACTIVE') {
      throw new AppError(ErrorCode.NOT_GROUP_MEMBER, '활성 구성원만 선택할 수 있습니다', HttpStatus.BAD_REQUEST);
    }
  }
}
