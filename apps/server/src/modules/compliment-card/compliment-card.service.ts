import { HttpStatus, Injectable } from '@nestjs/common';
import type { Prisma } from '@weplay/db';
import {
  SetComplimentReactionInput,
  SetComplimentCardHiddenInput,
  CreateComplimentCardInput,
  ErrorCode,
  FeatureKey,
  UpdateComplimentCardInput,
  UpdateComplimentSettingInput,
} from '@weplay/shared';
import { AppError } from '../../common/app-error';
import { AuditService } from '../../common/audit.service';
import { AuthUser } from '../../common/decorators';
import { PrismaService } from '../../common/prisma.service';
import { paged, PageQuery } from '../../common/paging';
import { FeaturesService } from '../features/features.service';
import { currentMonthKST, todayKST } from '../employee-of-the-month/employee-of-the-month.service';


const DEFAULT_DAILY_LIMIT = 3;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

export interface AdminCardFilter {
  senderId?: string;
  receiverId?: string;
  hidden?: 'all' | 'hidden' | 'visible';
}

export interface FeedFilter {
  q?: string;
  senderId?: string;
  receiverId?: string;
  /** YYYY-MM-DD (KST) */
  from?: string;
  to?: string;
}
const userSelect = { id: true, name: true, avatarUrl: true } as const;
const cardInclude = { sender: { select: userSelect }, receiver: { select: userSelect } } as const;

type CardRow = {
  id: string;
  senderId: string;
  month: string;
  body: string;
  anonymous: boolean;
  createdAt: Date;
  sender: { id: string; name: string; avatarUrl: string | null };
  receiver: { id: string; name: string; avatarUrl: string | null };
};

/** 익명 카드는 보낸 사람 본인과 관리자에게만 보낸 사람을 보여 줌 */
function toCardView(r: CardRow, viewerId: string, isAdmin: boolean) {
  const revealSender = !r.anonymous || r.senderId === viewerId || isAdmin;
  return {
    id: r.id,
    month: r.month,
    body: r.body,
    anonymous: r.anonymous,
    createdAt: r.createdAt,
    sender: revealSender ? r.sender : null,
    receiver: r.receiver,
    // 삭제는 모든 계정 유형에서 불가, 수정은 보낸 사람만, 반응은 보낸 사람 본인 제외
    canEdit: r.senderId === viewerId,
    canReact: r.senderId !== viewerId,
  };
}

@Injectable()
export class ComplimentCardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly features: FeaturesService,
  ) {}

  private async dailyLimitOf(groupId: string) {
    const setting = await this.prisma.complimentSetting.findUnique({ where: { groupId } });
    return setting?.dailyLimit ?? DEFAULT_DAILY_LIMIT;
  }

  /** 오늘(KST 0시 이후) 보낸 칭찬 수 */
  private async sentToday(groupId: string, senderId: string) {
    const startOfDay = new Date(`${todayKST()}T00:00:00+09:00`);
    return this.prisma.complimentCard.count({ where: { groupId, senderId, createdAt: { gte: startOfDay } } });
  }

  /** 칭찬 보내기 상태: 일별 한도와 오늘 남은 수 */
  async overview(groupId: string, viewerId: string) {
    if (!(await this.features.isEnabled(groupId, FeatureKey.COMPLIMENT_CARD))) {
      return { enabled: false as const, dailyLimit: DEFAULT_DAILY_LIMIT, remainingToday: DEFAULT_DAILY_LIMIT, sentTotal: 0, receivedTotal: 0 };
    }
    const [dailyLimit, sent, sentTotal, receivedTotal] = await Promise.all([
      this.dailyLimitOf(groupId),
      this.sentToday(groupId, viewerId),
      this.prisma.complimentCard.count({ where: { groupId, senderId: viewerId } }),
      this.prisma.complimentCard.count({ where: { groupId, receiverId: viewerId } }),
    ]);
    return { enabled: true as const, dailyLimit, remainingToday: Math.max(0, dailyLimit - sent), sentTotal, receivedTotal };
  }

  /** 관리자: 구성원 1명당 하루 칭찬 수 설정 */
  async updateSettings(actor: AuthUser, groupId: string, input: UpdateComplimentSettingInput) {
    await this.features.assertEnabled(groupId, FeatureKey.COMPLIMENT_CARD);
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.complimentSetting.findUnique({ where: { groupId } });
      const row = await tx.complimentSetting.upsert({
        where: { groupId },
        create: { groupId, dailyLimit: input.dailyLimit, updatedById: actor.id },
        update: { dailyLimit: input.dailyLimit, updatedById: actor.id },
      });
      await this.audit.log(tx, {
        groupId,
        actorId: actor.id,
        action: 'compliment_card.settings',
        targetType: 'ComplimentSetting',
        targetId: groupId,
        before: { dailyLimit: before?.dailyLimit ?? DEFAULT_DAILY_LIMIT },
        after: { dailyLimit: row.dailyLimit },
      });
      return { dailyLimit: row.dailyLimit };
    });
  }

  /** 목록 카드에 반응 집계와 내 반응을 붙임 */
  private async withReactions<T extends { id: string }>(items: T[], viewerId: string) {
    const reactions = items.length
      ? await this.prisma.complimentReaction.findMany({ where: { cardId: { in: items.map((i) => i.id) } }, select: { cardId: true, userId: true, emoji: true } })
      : [];
    return items.map((item) => {
      const mine = reactions.filter((r) => r.cardId === item.id);
      const counts = new Map<string, number>();
      for (const r of mine) counts.set(r.emoji, (counts.get(r.emoji) ?? 0) + 1);
      return {
        ...item,
        reactions: [...counts].map(([emoji, count]) => ({ emoji, count })),
        myReaction: mine.find((r) => r.userId === viewerId)?.emoji ?? null,
      };
    });
  }

  /** 검색 조건 → where. 익명 보낸 사람 필터는 본인·관리자만 허용 (익명 노출 방지) */
  private feedWhere(groupId: string, viewerId: string, isAdmin: boolean, f: FeedFilter): Prisma.ComplimentCardWhereInput {
    const and: Prisma.ComplimentCardWhereInput[] = [{ groupId, hiddenAt: null }];
    if (f.q?.trim()) and.push({ body: { contains: f.q.trim(), mode: 'insensitive' } });
    if (f.receiverId) and.push({ receiverId: f.receiverId });
    if (f.senderId) {
      and.push({ senderId: f.senderId });
      if (!isAdmin) and.push({ OR: [{ anonymous: false }, { senderId: viewerId }] });
    }
    if (f.from && DATE_PATTERN.test(f.from)) and.push({ createdAt: { gte: new Date(`${f.from}T00:00:00+09:00`) } });
    if (f.to && DATE_PATTERN.test(f.to)) {
      and.push({ createdAt: { lt: new Date(new Date(`${f.to}T00:00:00+09:00`).getTime() + DAY_MS) } });
    }
    return { AND: and };
  }

  /** 전체 칭찬 피드 (최신순, 검색·필터, 페이지네이션) */
  async feed(groupId: string, viewerId: string, f: FeedFilter, q: PageQuery, isAdmin: boolean) {
    const where = this.feedWhere(groupId, viewerId, isAdmin, f);
    const [rows, total] = await Promise.all([
      this.prisma.complimentCard.findMany({ where, include: cardInclude, orderBy: { createdAt: 'desc' }, skip: q.skip, take: q.pageSize }),
      this.prisma.complimentCard.count({ where }),
    ]);
    return paged(await this.withReactions(rows.map((r) => toCardView(r, viewerId, isAdmin)), viewerId), total, q);
  }

  /** 내가 보낸 칭찬 (페이지네이션, 익명 포함 본인에게는 모두 보임) */
  async sent(groupId: string, viewerId: string, q: PageQuery) {
    const where = { groupId, senderId: viewerId, hiddenAt: null };
    const [rows, total] = await Promise.all([
      this.prisma.complimentCard.findMany({ where, include: cardInclude, orderBy: { createdAt: 'desc' }, skip: q.skip, take: q.pageSize }),
      this.prisma.complimentCard.count({ where }),
    ]);
    return paged(await this.withReactions(rows.map((r) => toCardView(r, viewerId, false)), viewerId), total, q);
  }

  /** 내가 받은 칭찬 (페이지네이션) */
  async received(groupId: string, viewerId: string, q: PageQuery, isAdmin: boolean) {
    const where = { groupId, receiverId: viewerId, hiddenAt: null };
    const [rows, total] = await Promise.all([
      this.prisma.complimentCard.findMany({ where, include: cardInclude, orderBy: { createdAt: 'desc' }, skip: q.skip, take: q.pageSize }),
      this.prisma.complimentCard.count({ where }),
    ]);
    return paged(await this.withReactions(rows.map((r) => toCardView(r, viewerId, isAdmin)), viewerId), total, q);
  }

  /** 칭찬 보내기: 활성 구성원끼리, 본인 제외, 익명 선택 가능 */
  async send(actor: AuthUser, groupId: string, input: CreateComplimentCardInput) {
    await this.features.assertEnabled(groupId, FeatureKey.COMPLIMENT_CARD);
    if (input.receiverId === actor.id) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, '본인에게는 칭찬 카드를 보낼 수 없습니다', HttpStatus.BAD_REQUEST);
    }
    const receiver = await this.prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId: input.receiverId, groupId } },
      include: { user: { select: { status: true } } },
    });
    if (receiver?.status !== 'APPROVED' || receiver.user.status !== 'ACTIVE') {
      throw new AppError(ErrorCode.NOT_GROUP_MEMBER, '활성 구성원에게만 보낼 수 있습니다', HttpStatus.BAD_REQUEST);
    }

    // month 는 이달의 사원에서 월별 참고용으로만 쓰임
    const month = currentMonthKST();
    const limit = await this.dailyLimitOf(groupId);
    if ((await this.sentToday(groupId, actor.id)) >= limit) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, `오늘 보낼 수 있는 칭찬 카드(${limit}장)를 모두 사용했어요`, HttpStatus.BAD_REQUEST);
    }
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.complimentCard.create({
        data: { groupId, senderId: actor.id, receiverId: input.receiverId, month, body: input.body, anonymous: input.anonymous },
        include: cardInclude,
      });
      await this.audit.log(tx, {
        groupId,
        actorId: actor.id,
        action: 'compliment_card.send',
        targetType: 'ComplimentCard',
        targetId: row.id,
        after: { month, receiverId: input.receiverId, anonymous: input.anonymous },
      });
      return toCardView(row, actor.id, false);
    });
  }

  /** 수정: 보낸 사람 본인만, 내용만 변경 */
  async update(actor: AuthUser, groupId: string, cardId: string, input: UpdateComplimentCardInput) {
    await this.features.assertEnabled(groupId, FeatureKey.COMPLIMENT_CARD);
    const row = await this.prisma.complimentCard.findFirst({ where: { id: cardId, groupId } });
    if (!row) throw AppError.notFound('칭찬 카드를 찾을 수 없습니다');
    if (row.senderId !== actor.id) throw AppError.forbidden('본인이 보낸 카드만 수정할 수 있습니다');
    if (row.hiddenAt) throw AppError.forbidden('관리자가 숨긴 칭찬은 수정할 수 없어요');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.complimentCard.update({ where: { id: row.id }, data: { body: input.body }, include: cardInclude });
      await this.audit.log(tx, {
        groupId,
        actorId: actor.id,
        action: 'compliment_card.edit',
        targetType: 'ComplimentCard',
        targetId: row.id,
        before: { body: row.body },
        after: { body: input.body },
      });
      return toCardView(updated, actor.id, false);
    });
  }

  /** 관리자: 하루 단위 전체 칭찬 목록 (익명 포함 보낸 사람 표시, 숨김 여부 포함) */
  async adminDaily(groupId: string, date: string, f: AdminCardFilter, q: PageQuery) {
    const start = new Date(`${date}T00:00:00+09:00`);
    const where: Prisma.ComplimentCardWhereInput = {
      groupId,
      createdAt: { gte: start, lt: new Date(start.getTime() + DAY_MS) },
      ...(f.senderId ? { senderId: f.senderId } : {}),
      ...(f.receiverId ? { receiverId: f.receiverId } : {}),
      ...(f.hidden === 'hidden' ? { hiddenAt: { not: null } } : f.hidden === 'visible' ? { hiddenAt: null } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.complimentCard.findMany({ where, include: cardInclude, orderBy: { createdAt: 'desc' }, skip: q.skip, take: q.pageSize }),
      this.prisma.complimentCard.count({ where }),
    ]);
    return paged(
      rows.map((r) => ({
        id: r.id,
        body: r.body,
        anonymous: r.anonymous,
        createdAt: r.createdAt,
        sender: r.sender,
        receiver: r.receiver,
        hidden: !!r.hiddenAt,
      })),
      total,
      q,
    );
  }

  /** 관리자: 칭찬 숨김/해제. 숨긴 칭찬은 구성원 화면 어디에도 보이지 않음 */
  async setHidden(actor: AuthUser, groupId: string, cardId: string, input: SetComplimentCardHiddenInput) {
    const row = await this.prisma.complimentCard.findFirst({ where: { id: cardId, groupId } });
    if (!row) throw AppError.notFound('칭찬 카드를 찾을 수 없습니다');
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.complimentCard.update({
        where: { id: row.id },
        data: input.hidden ? { hiddenAt: new Date(), hiddenById: actor.id } : { hiddenAt: null, hiddenById: null },
      });
      await this.audit.log(tx, {
        groupId,
        actorId: actor.id,
        action: input.hidden ? 'compliment_card.hide' : 'compliment_card.unhide',
        targetType: 'ComplimentCard',
        targetId: row.id,
        before: { hidden: !!row.hiddenAt },
        after: { hidden: input.hidden },
      });
      return { id: updated.id, hidden: !!updated.hiddenAt };
    });
  }

  /** 칭찬 반응 설정 (같은 카드에 다시 누르면 종류가 바뀜). 보낸 사람 본인과 숨긴 칭찬은 불가 */
  async setReaction(actor: AuthUser, groupId: string, cardId: string, input: SetComplimentReactionInput) {
    await this.features.assertEnabled(groupId, FeatureKey.COMPLIMENT_CARD);
    const card = await this.prisma.complimentCard.findFirst({ where: { id: cardId, groupId, hiddenAt: null } });
    if (!card) throw AppError.notFound('칭찬 카드를 찾을 수 없습니다');
    if (card.senderId === actor.id) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, '본인이 보낸 칭찬에는 반응할 수 없어요', HttpStatus.BAD_REQUEST);
    }
    await this.prisma.complimentReaction.upsert({
      where: { cardId_userId: { cardId, userId: actor.id } },
      create: { cardId, userId: actor.id, emoji: input.emoji },
      update: { emoji: input.emoji },
    });
    return { ok: true };
  }

  /** 칭찬 반응 취소 */
  async removeReaction(actor: AuthUser, groupId: string, cardId: string) {
    const card = await this.prisma.complimentCard.findFirst({ where: { id: cardId, groupId } });
    if (!card) throw AppError.notFound('칭찬 카드를 찾을 수 없습니다');
    await this.prisma.complimentReaction.deleteMany({ where: { cardId, userId: actor.id } });
    return { ok: true };
  }
}
