import { HttpStatus, Injectable } from '@nestjs/common';
import {
  BADGES,
  CreatePointAdjustmentInput,
  ErrorCode,
  FeatureKey,
  POINT_RULES,
  UpdatePointConfigInput,
} from '@weplay/shared';
import { AppError } from '../../common/app-error';
import { AuditService } from '../../common/audit.service';
import { AuthUser } from '../../common/decorators';
import { PrismaService, Tx } from '../../common/prisma.service';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { paged, PageQuery } from '../../common/paging';
import { FeaturesService } from '../features/features.service';
import { currentMonthKST } from '../employee-of-the-month/employee-of-the-month.service';

const userSelect = { id: true, name: true, avatarUrl: true } as const;

export const transferSchema = z.object({
  toUserId: z.string().min(1),
  amount: z.number().int().min(1).max(1_000_000),
  memo: z.string().trim().max(100).optional(),
});
export type TransferInput = z.infer<typeof transferSchema>;
const METRICS = Object.keys(POINT_RULES) as (keyof typeof POINT_RULES)[];

type Metric = (typeof METRICS)[number];
type Stats = Record<Metric, number>;

const emptyStats = (): Stats => Object.fromEntries(METRICS.map((m) => [m, 0])) as Stats;

/** 적용 설정 = 그룹 설정 → MASTER 기본값 → 코드 기본값 순 */
export interface EffectiveConfig {
  rules: Record<Metric, number>;
  badges: { key: string; name: string; icon: string; description: string; metric: Metric; repeatable: boolean; target: number; enabled: boolean; customized: boolean }[];
  customized: boolean;
}

@Injectable()
export class PointsBadgeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly features: FeaturesService,
  ) {}

  /** 적용 중인 포인트·배지 설정 (그룹 설정이 없으면 MASTER 기본값) */
  async effectiveConfig(groupId: string): Promise<EffectiveConfig> {
    const [ruleDefaults, badgeDefaults, groupRules, groupBadges] = await Promise.all([
      this.prisma.pointRuleDefault.findMany(),
      this.prisma.badgeDefault.findMany(),
      this.prisma.groupPointRule.findMany({ where: { groupId } }),
      this.prisma.groupBadgeRule.findMany({ where: { groupId } }),
    ]);
    const rules = { ...POINT_RULES } as Record<Metric, number>;
    for (const r of ruleDefaults) if (METRICS.includes(r.metric as Metric)) rules[r.metric as Metric] = r.points;
    for (const r of groupRules) rules[r.metric as Metric] = r.points;

    const defaultBadge = new Map(badgeDefaults.map((b) => [b.key, b]));
    const groupBadge = new Map(groupBadges.map((b) => [b.key, b]));
    const badges = BADGES.map((b) => {
      const g = groupBadge.get(b.key);
      const d = defaultBadge.get(b.key);
      return {
        key: b.key,
        name: b.name,
        icon: b.icon,
        description: b.description,
        metric: b.metric,
        repeatable: !!b.repeatable,
        target: g?.target ?? d?.target ?? b.target,
        enabled: g?.enabled ?? d?.enabled ?? true,
        customized: !!g,
      };
    });
    return { rules, badges, customized: groupRules.length > 0 || groupBadges.length > 0 };
  }

  /** 그룹 구성원별 활동 집계 (승인된 활성 구성원만) */
  private async statsByUser(groupId: string) {
    const month = currentMonthKST();
    const [sent, received, noms, wins, comments, adjustments, members, paperNotes, subs, hosts, bests, dinnerVotes, surveyResp, surveys, snackJoins, snackWins, posts, boardComments, gameDays, ledger] =
      await Promise.all([
        this.prisma.complimentCard.groupBy({ by: ['senderId'], where: { groupId, hiddenAt: null }, _count: { _all: true } }),
        this.prisma.complimentCard.groupBy({ by: ['receiverId'], where: { groupId, hiddenAt: null }, _count: { _all: true } }),
        this.prisma.employeeOfTheMonthNomination.groupBy({ by: ['nominatorId'], where: { groupId }, _count: { _all: true } }),
        this.prisma.employeeOfTheMonth.groupBy({ by: ['userId'], where: { groupId, month: { lt: month } }, _count: { _all: true } }),
        this.prisma.employeeOfTheMonthComment.groupBy({ by: ['authorId'], where: { groupId }, _count: { _all: true } }),
        this.prisma.pointAdjustment.groupBy({ by: ['userId'], where: { groupId }, _sum: { amount: true } }),
        this.prisma.groupMembership.findMany({
          where: { groupId, status: 'APPROVED', user: { status: 'ACTIVE' } },
          select: { user: { select: userSelect } },
        }),
        this.prisma.rollingPaperNote.groupBy({ by: ['authorId'], where: { paper: { groupId } }, _count: { _all: true } }),
        this.prisma.photoSubmission.groupBy({ by: ['authorId'], where: { mission: { groupId } }, _count: { _all: true } }),
        this.prisma.photoMission.groupBy({ by: ['hostId'], where: { groupId }, _count: { _all: true } }),
        this.prisma.photoSubmission.groupBy({ by: ['authorId'], where: { mission: { groupId }, isBest: true }, _count: { _all: true } }),
        this.prisma.dinnerVote.groupBy({ by: ['userId', 'pollId'], where: { poll: { groupId } } }),
        this.prisma.surveyResponse.groupBy({ by: ['userId'], where: { survey: { groupId } }, _count: { _all: true } }),
        this.prisma.survey.groupBy({ by: ['authorId'], where: { groupId, status: { in: ['QUEUED', 'ACTIVE', 'CLOSED'] } }, _count: { _all: true } }),
        this.prisma.snackParticipant.groupBy({ by: ['userId'], where: { game: { groupId, status: { not: 'CANCELED' } } }, _count: { _all: true } }),
        this.prisma.snackSlot.groupBy({ by: ['drawnById'], where: { game: { groupId }, isWinner: true, drawnById: { not: null } }, _count: { _all: true } }),
        this.prisma.boardPost.groupBy({ by: ['authorId'], where: { groupId, hiddenAt: null }, _count: { _all: true } }),
        this.prisma.boardComment.groupBy({ by: ['authorId'], where: { post: { groupId } }, _count: { _all: true } }),
        this.prisma.gameScore.groupBy({ by: ['userId', 'playedOn'], where: { groupId } }),
        this.prisma.pointLedger.groupBy({ by: ['userId'], where: { groupId }, _sum: { amount: true } }),
      ]);
    const stats = new Map<string, Stats>();
    const adjust = new Map<string, number>();
    const get = (id: string) => {
      if (!stats.has(id)) stats.set(id, emptyStats());
      return stats.get(id)!;
    };
    for (const r of sent) get(r.senderId).sentCard = r._count._all;
    for (const r of received) get(r.receiverId).receivedCard = r._count._all;
    for (const r of noms) get(r.nominatorId).nomination = r._count._all;
    for (const r of wins) get(r.userId).win = r._count._all;
    for (const r of comments) get(r.authorId).comment = r._count._all;
    for (const r of paperNotes) get(r.authorId).rollingPaperNote = r._count._all;
    for (const r of subs) get(r.authorId).missionSubmission = r._count._all;
    for (const r of hosts) get(r.hostId).missionHost = r._count._all;
    for (const r of bests) get(r.authorId).missionBest = r._count._all;
    for (const r of dinnerVotes) get(r.userId).dinnerVote += 1; // 투표(pollId) 단위로 1회
    for (const r of surveyResp) get(r.userId).surveyResponse = r._count._all;
    for (const r of surveys) get(r.authorId).surveyCreate = r._count._all;
    for (const r of snackJoins) get(r.userId).snackJoin = r._count._all;
    for (const r of snackWins) if (r.drawnById) get(r.drawnById).snackTreat = r._count._all;
    for (const r of posts) get(r.authorId).boardPost = r._count._all;
    for (const r of boardComments) get(r.authorId).boardComment = r._count._all;
    for (const r of gameDays) get(r.userId).gameDay += 1; // 하루 1회
    for (const r of adjustments) adjust.set(r.userId, r._sum.amount ?? 0);
    // 게임 참가비·보상, 포인트 전달은 관리자 조정과 함께 합산
    for (const r of ledger) adjust.set(r.userId, (adjust.get(r.userId) ?? 0) + (r._sum.amount ?? 0));
    return { stats, adjust, users: members.map((m) => m.user) };
  }

  private pointsOf(s: Stats, rules: Record<Metric, number>, adjustment: number) {
    return METRICS.reduce((sum, m) => sum + s[m] * rules[m], 0) + adjustment;
  }

  /** 내 포인트·배지 */
  async me(groupId: string, userId: string) {
    if (!(await this.features.isEnabled(groupId, FeatureKey.POINTS_BADGE))) return { enabled: false as const };
    const [config, { stats, adjust }] = await Promise.all([this.effectiveConfig(groupId), this.statsByUser(groupId)]);
    const mine = stats.get(userId) ?? emptyStats();
    const adjustment = adjust.get(userId) ?? 0;
    return {
      enabled: true as const,
      points: this.pointsOf(mine, config.rules, adjustment),
      breakdown: {
        ...Object.fromEntries(METRICS.map((m) => [m, { count: mine[m], points: mine[m] * config.rules[m] }])),
        adjustment: { count: 0, points: adjustment },
      },
      badges: config.badges
        .filter((b) => b.enabled)
        .map((b) => {
          const value = mine[b.metric];
          return {
            key: b.key,
            name: b.name,
            icon: b.icon,
            description: b.description,
            value,
            target: b.target,
            earned: value >= b.target,
            // 여러 번 받을 수 있는 배지는 획득 횟수를 함께 보여 줌
            count: b.repeatable && value >= b.target ? value : undefined,
          };
        }),
    };
  }

  /** 구성원별 포인트와 획득 배지 (구성원 목록 표시용). 기능이 꺼져 있으면 빈 맵 */
  async profilesByUser(groupId: string) {
    const result = new Map<string, { points: number; badges: { key: string; name: string; icon: string; count?: number }[] }>();
    if (!(await this.features.isEnabled(groupId, FeatureKey.POINTS_BADGE))) return result;
    const [config, { stats, adjust }] = await Promise.all([this.effectiveConfig(groupId), this.statsByUser(groupId)]);
    for (const [userId, s] of stats) {
      const badges = config.badges
        .filter((b) => b.enabled && s[b.metric] >= b.target)
        .map((b) => ({ key: b.key, name: b.name, icon: b.icon, count: b.repeatable ? s[b.metric] : undefined }));
      result.set(userId, { points: this.pointsOf(s, config.rules, adjust.get(userId) ?? 0), badges });
    }
    for (const [userId, adjustment] of adjust) {
      if (!result.has(userId)) result.set(userId, { points: this.pointsOf(emptyStats(), config.rules, adjustment), badges: [] });
    }
    return result;
  }

  /** 새 활동(롤링페이퍼·미션·투표·설문·간식·게시판)의 포인트 이벤트 */
  private async extraHistory(groupId: string, userId: string, take: number, rules: Record<Metric, number>) {
    const order = { createdAt: 'desc' as const };
    const [notes, subs, hosts, bests, votes, resp, surveys, joins, wins, posts, cmts, games] = await Promise.all([
      this.prisma.rollingPaperNote.findMany({ where: { authorId: userId, paper: { groupId } }, select: { id: true, createdAt: true, paper: { select: { target: { select: { name: true } } } } }, orderBy: order, take }),
      this.prisma.photoSubmission.findMany({ where: { authorId: userId, mission: { groupId } }, select: { id: true, createdAt: true, mission: { select: { theme: true } } }, orderBy: order, take }),
      this.prisma.photoMission.findMany({ where: { hostId: userId, groupId }, select: { id: true, createdAt: true, theme: true }, orderBy: order, take }),
      this.prisma.photoSubmission.findMany({ where: { authorId: userId, mission: { groupId }, isBest: true }, select: { id: true, createdAt: true, mission: { select: { theme: true } } }, orderBy: order, take }),
      this.prisma.dinnerVote.findMany({ where: { userId, poll: { groupId } }, distinct: ['pollId'], select: { id: true, createdAt: true, poll: { select: { title: true } } }, orderBy: order, take }),
      this.prisma.surveyResponse.findMany({ where: { userId, survey: { groupId } }, select: { id: true, createdAt: true, survey: { select: { title: true } } }, orderBy: order, take }),
      this.prisma.survey.findMany({ where: { authorId: userId, groupId, status: { in: ['QUEUED', 'ACTIVE', 'CLOSED'] } }, select: { id: true, createdAt: true, title: true }, orderBy: order, take }),
      this.prisma.snackParticipant.findMany({ where: { userId, game: { groupId, status: { not: 'CANCELED' } } }, select: { id: true, joinedAt: true, game: { select: { title: true } } }, orderBy: { joinedAt: 'desc' }, take }),
      this.prisma.snackSlot.findMany({ where: { drawnById: userId, isWinner: true, game: { groupId } }, select: { id: true, drawnAt: true, game: { select: { title: true } } }, orderBy: { drawnAt: 'desc' }, take }),
      this.prisma.boardPost.findMany({ where: { authorId: userId, groupId, hiddenAt: null }, select: { id: true, createdAt: true, title: true }, orderBy: order, take }),
      this.prisma.boardComment.findMany({ where: { authorId: userId, post: { groupId } }, select: { id: true, createdAt: true }, orderBy: order, take }),
      this.prisma.gameScore.findMany({ where: { userId, groupId }, distinct: ['playedOn'], select: { id: true, createdAt: true, playedOn: true }, orderBy: [{ playedOn: 'desc' }, { createdAt: 'asc' }], take }),
    ]);
    return [
      ...notes.map((r) => ({ id: `paper-${r.id}`, label: `${r.paper.target.name}님 롤링페이퍼 작성`, points: rules.rollingPaperNote, at: r.createdAt })),
      ...subs.map((r) => ({ id: `msub-${r.id}`, label: `미션 제출: ${r.mission.theme}`, points: rules.missionSubmission, at: r.createdAt })),
      ...hosts.map((r) => ({ id: `mhost-${r.id}`, label: `미션 주최: ${r.theme}`, points: rules.missionHost, at: r.createdAt })),
      ...bests.map((r) => ({ id: `mbest-${r.id}`, label: `베스트 컷 선정: ${r.mission.theme}`, points: rules.missionBest, at: r.createdAt })),
      ...votes.map((r) => ({ id: `dvote-${r.id}`, label: `회식 투표: ${r.poll.title}`, points: rules.dinnerVote, at: r.createdAt })),
      ...resp.map((r) => ({ id: `sresp-${r.id}`, label: `설문 응답: ${r.survey.title}`, points: rules.surveyResponse, at: r.createdAt })),
      ...surveys.map((r) => ({ id: `screate-${r.id}`, label: `설문 등록: ${r.title}`, points: rules.surveyCreate, at: r.createdAt })),
      ...joins.map((r) => ({ id: `snjoin-${r.id}`, label: `간식 쏘기 참여: ${r.game.title}`, points: rules.snackJoin, at: r.joinedAt })),
      ...wins.filter((r) => r.drawnAt).map((r) => ({ id: `sntreat-${r.id}`, label: `간식 쏘기 당첨: ${r.game.title}`, points: rules.snackTreat, at: r.drawnAt as Date })),
      ...posts.map((r) => ({ id: `bpost-${r.id}`, label: `게시글 작성: ${r.title}`, points: rules.boardPost, at: r.createdAt })),
      ...cmts.map((r) => ({ id: `bcmt-${r.id}`, label: '게시판 댓글 작성', points: rules.boardComment, at: r.createdAt })),
      ...games.map((r) => ({ id: `game-${r.id}`, label: `미니게임 플레이 (${r.playedOn})`, points: rules.gameDay, at: r.createdAt })),
    ];
  }

  /** 내가 포인트를 얻은(잃은) 기록, 최신순. 활동별 점수는 현재 적용 중인 기준으로 계산 */
  async history(groupId: string, userId: string, q: PageQuery) {
    const take = q.page * q.pageSize;
    const month = currentMonthKST();
    const [config, cards, received, noms, wins, comments, adjustments] = await Promise.all([
      this.effectiveConfig(groupId),
      this.prisma.complimentCard.findMany({
        where: { groupId, senderId: userId, hiddenAt: null },
        select: { id: true, createdAt: true, receiver: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take,
      }),
      this.prisma.complimentCard.findMany({
        where: { groupId, receiverId: userId, hiddenAt: null },
        select: { id: true, createdAt: true, anonymous: true, sender: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take,
      }),
      this.prisma.employeeOfTheMonthNomination.findMany({
        where: { groupId, nominatorId: userId },
        select: { id: true, createdAt: true, nominee: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take,
      }),
      this.prisma.employeeOfTheMonth.findMany({
        where: { groupId, userId, month: { lt: month } },
        select: { id: true, month: true, createdAt: true },
        orderBy: { month: 'desc' },
        take,
      }),
      this.prisma.employeeOfTheMonthComment.findMany({
        where: { groupId, authorId: userId },
        select: { id: true, createdAt: true, body: true },
        orderBy: { createdAt: 'desc' },
        take,
      }),
      this.prisma.pointAdjustment.findMany({
        where: { groupId, userId },
        select: { id: true, createdAt: true, amount: true, reason: true },
        orderBy: { createdAt: 'desc' },
        take,
      }),
    ]);

    const events = [
      ...cards.map((c) => ({ id: `sent-${c.id}`, label: `${c.receiver.name}님에게 칭찬 카드 보냄`, points: config.rules.sentCard, at: c.createdAt })),
      ...received.map((c) => ({
        id: `received-${c.id}`,
        label: `${c.anonymous ? '익명' : c.sender.name}님에게 칭찬 카드를 받음`,
        points: config.rules.receivedCard,
        at: c.createdAt,
      })),
      ...noms.map((n) => ({ id: `nomination-${n.id}`, label: `${n.nominee.name}님 이달의 사원 추천`, points: config.rules.nomination, at: n.createdAt })),
      ...wins.map((w) => ({ id: `win-${w.id}`, label: `${w.month} 이달의 사원 선정`, points: config.rules.win, at: w.createdAt })),
      ...comments.map((c) => ({ id: `comment-${c.id}`, label: `댓글 작성: ${c.body.slice(0, 20)}`, points: config.rules.comment, at: c.createdAt })),
      ...adjustments.map((a) => ({ id: `adjust-${a.id}`, label: `관리자 조정: ${a.reason}`, points: a.amount, at: a.createdAt })),
    ].sort((x, y) => y.at.getTime() - x.at.getTime());

    const [extra, ledger, ledgerTotal] = await Promise.all([
      this.extraHistory(groupId, userId, take, config.rules),
      this.prisma.pointLedger.findMany({ where: { groupId, userId }, orderBy: { createdAt: 'desc' }, take }),
      this.prisma.pointLedger.count({ where: { groupId, userId } }),
    ]);
    events.push(...extra, ...ledger.map((r) => ({ id: `ledger-${r.id}`, label: r.memo, points: r.amount, at: r.createdAt })));
    events.sort((x, y) => y.at.getTime() - x.at.getTime());
    const { stats } = await this.statsByUser(groupId);
    const mine = stats.get(userId) ?? emptyStats();
    const adjTotal = await this.prisma.pointAdjustment.count({ where: { groupId, userId } });
    const total = METRICS.reduce((sum, m) => sum + mine[m], 0) + adjTotal + ledgerTotal;
    return paged(events.slice(q.skip, q.skip + q.pageSize), total, q);
  }

  /** 현재 포인트 잔액 (활동 + 조정 + 원장). 음수일 수 있음 */
  async balance(groupId: string, userId: string) {
    const [config, { stats, adjust }] = await Promise.all([this.effectiveConfig(groupId), this.statsByUser(groupId)]);
    return this.pointsOf(stats.get(userId) ?? emptyStats(), config.rules, adjust.get(userId) ?? 0);
  }

  /** 원장 기록. 같은 (사람, 종류, refId)는 한 번만 들어감 → 보상 중복 지급 방지. 0점은 건너뜀 */
  async addLedger(groupId: string, entries: { userId: string; amount: number; kind: string; refId: string; memo: string; counterpartId?: string | null }[], tx?: Tx) {
    const data = entries.filter((e) => e.amount !== 0).map((e) => ({ groupId, ...e, counterpartId: e.counterpartId ?? null }));
    if (data.length === 0) return 0;
    const res = await (tx ?? this.prisma).pointLedger.createMany({ data, skipDuplicates: true });
    return res.count;
  }

  /** 내 포인트를 다른 구성원에게 전달 (잔액 안에서만) */
  async transfer(actor: AuthUser, groupId: string, input: TransferInput) {
    await this.features.assertEnabled(groupId, FeatureKey.POINTS_BADGE);
    if (input.toUserId === actor.id) throw new AppError(ErrorCode.VALIDATION_FAILED, '나에게는 보낼 수 없어요', HttpStatus.BAD_REQUEST);
    const target = await this.prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId: input.toUserId, groupId } },
      include: { user: { select: { status: true, name: true } } },
    });
    if (target?.status !== 'APPROVED' || target.user.status !== 'ACTIVE') {
      throw new AppError(ErrorCode.NOT_GROUP_MEMBER, '활성 구성원에게만 보낼 수 있어요', HttpStatus.BAD_REQUEST);
    }
    const balance = await this.balance(groupId, actor.id);
    if (input.amount > balance) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, `보낼 수 있는 포인트는 ${Math.max(0, balance)}점이에요`, HttpStatus.BAD_REQUEST);
    }
    const refId = randomUUID();
    const memo = input.memo?.trim();
    await this.prisma.$transaction(async (tx) => {
      await this.addLedger(
        groupId,
        [
          { userId: actor.id, amount: -input.amount, kind: 'TRANSFER_OUT', refId, memo: `${target.user.name}님에게 포인트 보냄${memo ? `: ${memo}` : ''}`, counterpartId: input.toUserId },
          { userId: input.toUserId, amount: input.amount, kind: 'TRANSFER_IN', refId, memo: `${actor.name}님에게 포인트 받음${memo ? `: ${memo}` : ''}`, counterpartId: actor.id },
        ],
        tx,
      );
      await this.audit.log(tx, { groupId, actorId: actor.id, action: 'points.transfer', targetType: 'PointLedger', targetId: refId, after: { to: input.toUserId, amount: input.amount, memo } });
    });
    return { ok: true, balance: balance - input.amount };
  }

  /** 관리자: 그룹 설정 조회 (규칙·배지, 기본값 대비 변경 여부) */
  async getConfig(groupId: string) {
    return this.effectiveConfig(groupId);
  }

  /** 관리자: 그룹 설정 저장 */
  async updateConfig(actor: AuthUser, groupId: string, input: UpdatePointConfigInput) {
    await this.features.assertEnabled(groupId, FeatureKey.POINTS_BADGE);
    const before = await this.effectiveConfig(groupId);
    await this.prisma.$transaction(async (tx) => {
      for (const m of METRICS) {
        await tx.groupPointRule.upsert({
          where: { groupId_metric: { groupId, metric: m } },
          create: { groupId, metric: m, points: input.rules[m], updatedById: actor.id },
          update: { points: input.rules[m], updatedById: actor.id },
        });
      }
      for (const b of input.badges) {
        await tx.groupBadgeRule.upsert({
          where: { groupId_key: { groupId, key: b.key } },
          create: { groupId, key: b.key, target: b.target, enabled: b.enabled, updatedById: actor.id },
          update: { target: b.target, enabled: b.enabled, updatedById: actor.id },
        });
      }
      await this.audit.log(tx, {
        groupId,
        actorId: actor.id,
        action: 'points.config',
        targetType: 'PointConfig',
        targetId: groupId,
        before: { rules: before.rules, badges: before.badges.map((b) => ({ key: b.key, target: b.target, enabled: b.enabled })) },
        after: input,
      });
    });
    return this.effectiveConfig(groupId);
  }

  /** 관리자: 그룹 설정 초기화 → MASTER 기본값 적용 */
  async resetConfig(actor: AuthUser, groupId: string) {
    await this.features.assertEnabled(groupId, FeatureKey.POINTS_BADGE);
    await this.prisma.$transaction(async (tx) => {
      await tx.groupPointRule.deleteMany({ where: { groupId } });
      await tx.groupBadgeRule.deleteMany({ where: { groupId } });
      await this.audit.log(tx, { groupId, actorId: actor.id, action: 'points.config_reset', targetType: 'PointConfig', targetId: groupId });
    });
    return this.effectiveConfig(groupId);
  }

  /** 관리자: 수동 포인트 부여(+)/차감(-) */
  async adjust(actor: AuthUser, groupId: string, input: CreatePointAdjustmentInput) {
    await this.features.assertEnabled(groupId, FeatureKey.POINTS_BADGE);
    const membership = await this.prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId: input.userId, groupId } },
      include: { user: { select: { status: true } } },
    });
    if (membership?.status !== 'APPROVED' || membership.user.status !== 'ACTIVE') {
      throw new AppError(ErrorCode.NOT_GROUP_MEMBER, '활성 구성원에게만 부여할 수 있습니다', HttpStatus.BAD_REQUEST);
    }
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.pointAdjustment.create({
        data: { groupId, userId: input.userId, amount: input.amount, reason: input.reason, actorId: actor.id },
      });
      await this.audit.log(tx, {
        groupId,
        actorId: actor.id,
        action: 'points.adjust',
        targetType: 'PointAdjustment',
        targetId: row.id,
        after: { userId: input.userId, amount: input.amount, reason: input.reason },
      });
      return { id: row.id, amount: row.amount };
    });
  }

  /** 관리자: 수동 부여·차감 내역 (페이지네이션) */
  async adjustments(groupId: string, q: PageQuery) {
    const [rows, total] = await Promise.all([
      this.prisma.pointAdjustment.findMany({
        where: { groupId },
        include: { user: { select: userSelect } },
        orderBy: { createdAt: 'desc' },
        skip: q.skip,
        take: q.pageSize,
      }),
      this.prisma.pointAdjustment.count({ where: { groupId } }),
    ]);
    const actorIds = [...new Set(rows.map((r) => r.actorId))];
    const actors = actorIds.length ? await this.prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } }) : [];
    const actorName = new Map(actors.map((a) => [a.id, a.name]));
    return paged(
      rows.map((r) => ({ id: r.id, amount: r.amount, reason: r.reason, createdAt: r.createdAt, user: r.user, actorName: actorName.get(r.actorId) ?? '' })),
      total,
      q,
    );
  }

  /** MASTER: 기본값 조회 */
  async getDefaults() {
    const [rules, badges] = await Promise.all([this.prisma.pointRuleDefault.findMany(), this.prisma.badgeDefault.findMany()]);
    const ruleMap = new Map(rules.map((r) => [r.metric, r.points]));
    const badgeMap = new Map(badges.map((b) => [b.key, b]));
    return {
      rules: Object.fromEntries(METRICS.map((m) => [m, ruleMap.get(m) ?? POINT_RULES[m]])),
      badges: BADGES.map((b) => ({
        key: b.key,
        name: b.name,
        icon: b.icon,
        description: b.description,
        target: badgeMap.get(b.key)?.target ?? b.target,
        enabled: badgeMap.get(b.key)?.enabled ?? true,
      })),
    };
  }

  /** MASTER: 기본값 저장 (모든 그룹에 적용되는 값) */
  async updateDefaults(actor: AuthUser, input: UpdatePointConfigInput) {
    const before = await this.getDefaults();
    await this.prisma.$transaction(async (tx) => {
      for (const m of METRICS) {
        await tx.pointRuleDefault.upsert({ where: { metric: m }, create: { metric: m, points: input.rules[m] }, update: { points: input.rules[m] } });
      }
      for (const b of input.badges) {
        await tx.badgeDefault.upsert({
          where: { key: b.key },
          create: { key: b.key, target: b.target, enabled: b.enabled },
          update: { target: b.target, enabled: b.enabled },
        });
      }
      await this.audit.log(tx, { actorId: actor.id, action: 'points.defaults', targetType: 'PointDefaults', targetId: 'default', before, after: input });
    });
    return this.getDefaults();
  }
}
