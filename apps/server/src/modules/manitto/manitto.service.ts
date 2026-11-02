import { HttpStatus, Injectable } from '@nestjs/common';
import { randomInt } from 'crypto';
import { ErrorCode, FeatureKey, ManittoMessageInput, ManittoPeriodInput, StartManittoInput } from '@weplay/shared';
import { AppError } from '../../common/app-error';
import { AuditService } from '../../common/audit.service';
import { AuthUser } from '../../common/decorators';
import { PrismaService } from '../../common/prisma.service';
import { FeaturesService } from '../features/features.service';

const userSelect = { id: true, name: true, avatarUrl: true } as const;

/** 자기 자신이 아닌 무작위 배정 (서로 마니또가 되는 것은 허용). 모든 사람이 정확히 한 명에게 주고 한 명에게 받음 */
function derangement(n: number): number[] {
  for (let attempt = 0; attempt < 1000; attempt++) {
    const p = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [p[i], p[j]] = [p[j], p[i]];
    }
    if (p.every((v, i) => v !== i)) return p;
  }
  throw new Error('마니또 배정에 실패했습니다');
}

@Injectable()
export class ManittoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly features: FeaturesService,
  ) {}

  /** 진행 중인 회차. 종료 시각이 지났으면 종료 처리 후 null */
  private async activeRound(groupId: string) {
    const round = await this.prisma.manittoRound.findFirst({ where: { groupId, status: 'ACTIVE' } });
    if (round && round.endAt && round.endAt.getTime() < Date.now()) {
      await this.prisma.manittoRound.update({ where: { id: round.id }, data: { status: 'ENDED', endedAt: round.endAt } });
      return null;
    }
    return round;
  }

  private windowOpen(round: { startAt: Date; endAt: Date | null }) {
    const now = Date.now();
    return round.startAt.getTime() <= now && (!round.endAt || now <= round.endAt.getTime());
  }

  /** 마니또 상태. 본인의 마니또(giver 쪽)와 본인을 맡은 채팅(receiver 쪽)만 보임. 관리자 화면에도 배정 내용은 없음 */
  async status(groupId: string, userId: string, isManager: boolean) {
    if (!(await this.features.isEnabled(groupId, FeatureKey.MANITTO))) return { enabled: false as const };
    const round = await this.activeRound(groupId);
    if (!round) {
      return { enabled: true as const, isManager, round: null, participantCount: 0, isParticipant: false, canViewAll: false, asGiver: null, asReceiver: null, windowOpen: false };
    }
    const [giver, receiver, participantCount] = await Promise.all([
      this.prisma.manittoAssignment.findFirst({ where: { roundId: round.id, giverId: userId }, include: { receiver: { select: userSelect } } }),
      this.prisma.manittoAssignment.findFirst({ where: { roundId: round.id, receiverId: userId } }),
      this.prisma.manittoAssignment.count({ where: { roundId: round.id } }),
    ]);
    const isParticipant = !!giver || !!receiver;
    return {
      enabled: true as const,
      isManager,
      round: { id: round.id, startAt: round.startAt, endAt: round.endAt },
      participantCount,
      isParticipant,
      // 관리자가 참가하지 않은 회차는 전체 현황을 볼 수 있음
      canViewAll: isManager && !isParticipant,
      // 내 마니또: 나만 상대 이름을 봄
      asGiver: giver ? { assignmentId: giver.id, target: giver.receiver } : null,
      // 나를 맡은 사람과의 채팅: 상대는 익명
      asReceiver: receiver ? { assignmentId: receiver.id } : null,
      windowOpen: this.windowOpen(round),
    };
  }

  /** 관리자 전용 전체 현황: 관리자가 참가하지 않은 회차에서만 (누가 누구의 마니또인지) */
  async overview(groupId: string, userId: string, page: number, pageSize: number) {
    if (!(await this.features.isEnabled(groupId, FeatureKey.MANITTO))) return { enabled: false as const, items: [], total: 0, page, pageSize };
    const round = await this.activeRound(groupId);
    const mine = round
      ? await this.prisma.manittoAssignment.count({ where: { roundId: round.id, OR: [{ giverId: userId }, { receiverId: userId }] } })
      : 0;
    if (!round || mine > 0) throw AppError.forbidden('참가하지 않은 관리자만 전체 현황을 볼 수 있어요');
    const where = { roundId: round.id };
    const [rows, total] = await Promise.all([
      this.prisma.manittoAssignment.findMany({
        where,
        include: { giver: { select: userSelect }, receiver: { select: userSelect } },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.manittoAssignment.count({ where }),
    ]);
    return {
      enabled: true as const,
      items: rows.map((r) => ({ giver: r.giver, receiver: r.receiver })),
      total,
      page,
      pageSize,
    };
  }

  /** 관리자: 회차 시작. 기간은 비워 두면 지금부터 수동 종료까지 */
  async start(actor: AuthUser, groupId: string, input: StartManittoInput) {
    await this.features.assertEnabled(groupId, FeatureKey.MANITTO);
    if (await this.activeRound(groupId)) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, '이미 진행 중인 마니또가 있어요', HttpStatus.CONFLICT);
    }
    const eligible = await this.prisma.groupMembership.findMany({
      where: { groupId, status: 'APPROVED', user: { status: 'ACTIVE' } },
      select: { userId: true },
      orderBy: { joinedAt: 'asc' },
    });
    const eligibleIds = new Set(eligible.map((m) => m.userId));
    const wanted = input.participantIds ? [...new Set(input.participantIds)] : [...eligibleIds];
    if (wanted.some((id) => !eligibleIds.has(id))) {
      throw new AppError(ErrorCode.NOT_GROUP_MEMBER, '참가자는 활성 구성원만 선택할 수 있어요', HttpStatus.BAD_REQUEST);
    }
    const members = wanted.map((userId) => ({ userId }));
    if (members.length < 2) throw new AppError(ErrorCode.VALIDATION_FAILED, '참가자는 2명 이상이어야 해요', HttpStatus.BAD_REQUEST);

    const startAt = input.startAt ? new Date(input.startAt) : new Date();
    const endAt = input.endAt ? new Date(input.endAt) : null;
    if (endAt && endAt.getTime() <= startAt.getTime()) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, '종료 시각은 시작 시각보다 뒤여야 해요', HttpStatus.BAD_REQUEST);
    }

    const perm = derangement(members.length);
    return this.prisma.$transaction(async (tx) => {
      const round = await tx.manittoRound.create({ data: { groupId, status: 'ACTIVE', startAt, endAt, createdById: actor.id } });
      await tx.manittoAssignment.createMany({
        data: members.map((m, i) => ({ roundId: round.id, giverId: m.userId, receiverId: members[perm[i]].userId })),
      });
      // 감사 로그에는 배정 내용을 남기지 않음 (관리자도 볼 수 없도록)
      await this.audit.log(tx, {
        groupId,
        actorId: actor.id,
        action: 'manitto.start',
        targetType: 'ManittoRound',
        targetId: round.id,
        after: { participants: members.length, startAt, endAt },
      });
      return { id: round.id };
    });
  }

  /** 관리자: 회차 종료 */
  async end(actor: AuthUser, groupId: string) {
    await this.features.assertEnabled(groupId, FeatureKey.MANITTO);
    const round = await this.activeRound(groupId);
    if (!round) throw AppError.notFound('진행 중인 마니또가 없어요');
    return this.prisma.$transaction(async (tx) => {
      await tx.manittoRound.update({ where: { id: round.id }, data: { status: 'ENDED', endedAt: new Date() } });
      await this.audit.log(tx, { groupId, actorId: actor.id, action: 'manitto.end', targetType: 'ManittoRound', targetId: round.id });
      return { ok: true };
    });
  }

  /** 관리자: 진행 중 회차의 기간 변경 */
  async period(actor: AuthUser, groupId: string, input: ManittoPeriodInput) {
    await this.features.assertEnabled(groupId, FeatureKey.MANITTO);
    const round = await this.activeRound(groupId);
    if (!round) throw AppError.notFound('진행 중인 마니또가 없어요');
    const startAt = input.startAt ? new Date(input.startAt) : round.startAt;
    const endAt = input.endAt === undefined ? round.endAt : input.endAt ? new Date(input.endAt) : null;
    if (endAt && endAt.getTime() <= startAt.getTime()) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, '종료 시각은 시작 시각보다 뒤여야 해요', HttpStatus.BAD_REQUEST);
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.manittoRound.update({ where: { id: round.id }, data: { startAt, endAt } });
      await this.audit.log(tx, {
        groupId,
        actorId: actor.id,
        action: 'manitto.period',
        targetType: 'ManittoRound',
        targetId: round.id,
        before: { startAt: round.startAt, endAt: round.endAt },
        after: { startAt, endAt },
      });
      return { startAt, endAt };
    });
  }

  /** 채팅방 접근: 배정의 giver 또는 receiver 본인만 */
  private async threadFor(groupId: string, userId: string, assignmentId: string) {
    const a = await this.prisma.manittoAssignment.findFirst({
      where: { id: assignmentId, round: { groupId } },
      include: { round: true },
    });
    if (!a || (a.giverId !== userId && a.receiverId !== userId)) throw AppError.notFound('채팅방을 찾을 수 없어요');
    return a;
  }

  /** 채팅 메시지 (최근 100개, 오래된 순). 내 메시지 여부만 표시하고 상대 신원은 주지 않음 */
  async messages(groupId: string, userId: string, assignmentId: string) {
    if (!(await this.features.isEnabled(groupId, FeatureKey.MANITTO))) throw AppError.notFound('기능이 꺼져 있어요');
    const a = await this.threadFor(groupId, userId, assignmentId);
    const rows = await this.prisma.manittoMessage.findMany({
      where: { assignmentId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return {
      windowOpen: a.round.status === 'ACTIVE' && this.windowOpen(a.round),
      items: rows.reverse().map((m) => ({ id: m.id, body: m.body, createdAt: m.createdAt, mine: m.senderId === userId })),
    };
  }

  /** 채팅 메시지 보내기 (익명: 상대에게 보낸 사람 이름은 보이지 않음) */
  async send(groupId: string, userId: string, assignmentId: string, input: ManittoMessageInput) {
    await this.features.assertEnabled(groupId, FeatureKey.MANITTO);
    const a = await this.threadFor(groupId, userId, assignmentId);
    if (a.round.status !== 'ACTIVE' || !this.windowOpen(a.round)) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, '지금은 메시지를 보낼 수 없어요', HttpStatus.BAD_REQUEST);
    }
    const row = await this.prisma.manittoMessage.create({ data: { assignmentId, senderId: userId, body: input.body } });
    return { id: row.id };
  }
}
