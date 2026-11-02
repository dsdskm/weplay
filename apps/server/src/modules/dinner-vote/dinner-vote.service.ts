import { HttpStatus, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { ErrorCode, FeatureKey } from '@weplay/shared';
import { AppError } from '../../common/app-error';
import { AuditService } from '../../common/audit.service';
import { AuthUser } from '../../common/decorators';
import { paged, PageQuery } from '../../common/paging';
import { PrismaService } from '../../common/prisma.service';
import { FeatureSettingsService } from '../features/feature-settings.service';
import { FeaturesService } from '../features/features.service';

const FEATURE = FeatureKey.DINNER_VOTE;

export const createPlaceSchema = z.object({
  name: z.string().trim().min(1).max(80),
  address: z.string().trim().max(200).nullable().optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  category: z.string().trim().max(60).nullable().optional(),
  link: z.string().trim().url().max(300).nullable().optional(),
  note: z.string().trim().max(200).nullable().optional(),
  teamId: z.string().min(1).nullable().optional(),
});
export type CreatePlaceInput = z.infer<typeof createPlaceSchema>;

export const createPollSchema = z.object({
  title: z.string().trim().min(1).max(80),
  teamId: z.string().min(1).nullable().optional(),
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1).max(14),
  placeIds: z.array(z.string().min(1)).min(1).max(10),
  closesAt: z.string().datetime().nullable().optional(),
});
export type CreatePollInput = z.infer<typeof createPollSchema>;

export const voteSchema = z.object({
  dateIds: z.array(z.string().min(1)).max(14),
  placeIds: z.array(z.string().min(1)).max(10),
});
export type VoteInput = z.infer<typeof voteSchema>;

const isOpen = (p: { status: string; closesAt: Date | null }) => p.status === 'OPEN' && (!p.closesAt || p.closesAt.getTime() > Date.now());

@Injectable()
export class DinnerVoteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly features: FeaturesService,
    private readonly settings: FeatureSettingsService,
  ) {}

  /** 사용자가 속한(또는 관리하는) 팀 ID 목록. 그룹 ADMIN은 전체 팀 */
  private async myTeams(groupId: string, userId: string, isGroupAdmin: boolean) {
    const rows = await this.prisma.teamMember.findMany({ where: { groupId, userId, team: { deletedAt: null } }, select: { teamId: true, role: true } });
    const teams = await this.prisma.team.findMany({ where: { groupId, deletedAt: null }, select: { id: true, name: true } });
    const memberOf = new Set(rows.map((r) => r.teamId));
    const adminOf = new Set(rows.filter((r) => r.role === 'ADMIN').map((r) => r.teamId));
    return { teams, memberOf, adminOf, canSeeAll: isGroupAdmin };
  }

  /** 후보 장소 목록: 그룹 공통 + 팀별 (내가 볼 수 있는 팀) */
  async places(groupId: string, viewer: AuthUser, isGroupAdmin: boolean, teamId: string | undefined, q: PageQuery) {
    if (!(await this.features.isEnabled(groupId, FEATURE))) return { enabled: false as const, items: [], total: 0, page: q.page, pageSize: q.pageSize, teams: [] };
    const t = await this.myTeams(groupId, viewer.id, isGroupAdmin);
    const visibleTeamIds = t.canSeeAll ? t.teams.map((x) => x.id) : [...t.memberOf];
    const where = teamId === 'group'
      ? { groupId, teamId: null }
      : teamId
        ? { groupId, teamId: visibleTeamIds.includes(teamId) ? teamId : '__none__' }
        : { groupId, OR: [{ teamId: null }, { teamId: { in: visibleTeamIds } }] };
    const [rows, total] = await Promise.all([
      this.prisma.dinnerPlace.findMany({ where, orderBy: { createdAt: 'desc' }, skip: q.skip, take: q.pageSize }),
      this.prisma.dinnerPlace.count({ where }),
    ]);
    const nameOf = new Map(t.teams.map((x) => [x.id, x.name]));
    return {
      enabled: true as const,
      teams: t.teams.filter((x) => t.canSeeAll || t.memberOf.has(x.id)),
      ...paged(rows.map((p) => ({ ...p, teamName: p.teamId ? (nameOf.get(p.teamId) ?? null) : null, canDelete: p.addedById === viewer.id || isGroupAdmin })), total, q),
    };
  }

  async addPlace(actor: AuthUser, groupId: string, isManager: boolean, isGroupAdmin: boolean, input: CreatePlaceInput) {
    await this.features.assertEnabled(groupId, FEATURE);
    const cfg = await this.settings.get(groupId, FEATURE);
    if (!isManager && !cfg.memberCanAddPlace) throw AppError.forbidden('관리자만 장소를 등록할 수 있어요');
    if (input.teamId) {
      const t = await this.myTeams(groupId, actor.id, isGroupAdmin);
      if (!t.canSeeAll && !t.memberOf.has(input.teamId)) throw AppError.forbidden('내 팀의 회식 장소만 등록할 수 있어요');
    }
    const row = await this.prisma.dinnerPlace.create({
      data: {
        groupId,
        teamId: input.teamId ?? null,
        name: input.name,
        address: input.address ?? null,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
        category: input.category ?? null,
        link: input.link ?? null,
        note: input.note ?? null,
        addedById: actor.id,
      },
    });
    return { id: row.id };
  }

  async removePlace(actor: AuthUser, groupId: string, isGroupAdmin: boolean, id: string) {
    const place = await this.prisma.dinnerPlace.findFirst({ where: { id, groupId } });
    if (!place) throw AppError.notFound('장소를 찾을 수 없어요');
    if (place.addedById !== actor.id && !isGroupAdmin) throw AppError.forbidden('등록한 사람이나 관리자만 지울 수 있어요');
    if (await this.prisma.dinnerPollPlace.count({ where: { placeId: id } })) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, '투표에 사용된 장소는 지울 수 없어요', HttpStatus.CONFLICT);
    }
    await this.prisma.dinnerPlace.delete({ where: { id } });
    return { ok: true };
  }

  /** 네이버 지역 검색 (서버 키 필요). 키가 없으면 안내 오류 */
  async searchNaver(query: string) {
    const id = process.env.NAVER_SEARCH_CLIENT_ID;
    const secret = process.env.NAVER_SEARCH_CLIENT_SECRET;
    if (!id || !secret) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, '네이버 검색 키(NAVER_SEARCH_CLIENT_ID/SECRET)가 설정되지 않았어요. 장소를 직접 입력해 주세요', HttpStatus.SERVICE_UNAVAILABLE);
    }
    const res = await fetch(`https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=10`, {
      headers: { 'X-Naver-Client-Id': id, 'X-Naver-Client-Secret': secret },
    });
    if (!res.ok) throw new AppError(ErrorCode.VALIDATION_FAILED, '네이버 장소 검색에 실패했어요', HttpStatus.BAD_GATEWAY);
    const json = (await res.json()) as { items?: { title: string; address: string; roadAddress: string; category: string; link: string; mapx: string; mapy: string }[] };
    return (json.items ?? []).map((i) => ({
      name: i.title.replace(/<[^>]+>/g, ''),
      address: i.roadAddress || i.address,
      category: i.category,
      link: i.link || null,
      // 네이버 좌표는 WGS84 × 1e7 정수 문자열
      lng: Number(i.mapx) / 1e7,
      lat: Number(i.mapy) / 1e7,
    }));
  }

  /** 투표 목록 */
  async polls(groupId: string, viewer: AuthUser, isGroupAdmin: boolean, status: string | undefined, q: PageQuery) {
    if (!(await this.features.isEnabled(groupId, FEATURE))) return { enabled: false as const, items: [], total: 0, page: q.page, pageSize: q.pageSize };
    const t = await this.myTeams(groupId, viewer.id, isGroupAdmin);
    const visible = t.canSeeAll ? undefined : [...t.memberOf];
    const where = {
      groupId,
      ...(status === 'OPEN' || status === 'CLOSED' ? { status } : {}),
      ...(visible ? { OR: [{ teamId: null }, { teamId: { in: visible } }] } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.dinnerPoll.findMany({
        where,
        include: { _count: { select: { dates: true, places: true } } },
        orderBy: [{ status: 'desc' }, { createdAt: 'desc' }],
        skip: q.skip,
        take: q.pageSize,
      }),
      this.prisma.dinnerPoll.count({ where }),
    ]);
    const nameOf = new Map(t.teams.map((x) => [x.id, x.name]));
    const voters = await this.prisma.dinnerVote.groupBy({ by: ['pollId', 'userId'], where: { pollId: { in: rows.map((r) => r.id) } } });
    const voterCount = new Map<string, number>();
    for (const v of voters) voterCount.set(v.pollId, (voterCount.get(v.pollId) ?? 0) + 1);
    const canCreate = await this.canCreatePoll(groupId, viewer.id, isGroupAdmin);
    return {
      enabled: true as const,
      canCreate,
      teams: t.teams.filter((x) => t.canSeeAll || t.memberOf.has(x.id)),
      ...paged(
        rows.map((p) => ({
          id: p.id,
          title: p.title,
          teamId: p.teamId,
          teamName: p.teamId ? (nameOf.get(p.teamId) ?? null) : null,
          open: isOpen(p),
          closesAt: p.closesAt,
          dateCount: p._count.dates,
          placeCount: p._count.places,
          voterCount: voterCount.get(p.id) ?? 0,
          createdAt: p.createdAt,
        })),
        total,
        q,
      ),
    };
  }

  private async canCreatePoll(groupId: string, userId: string, isGroupAdmin: boolean) {
    if (isGroupAdmin) return true;
    const cfg = await this.settings.get(groupId, FEATURE);
    if (cfg.memberCanCreatePoll) return true;
    return (await this.prisma.teamMember.count({ where: { groupId, userId, role: 'ADMIN', team: { deletedAt: null } } })) > 0;
  }

  async createPoll(actor: AuthUser, groupId: string, isGroupAdmin: boolean, input: CreatePollInput) {
    await this.features.assertEnabled(groupId, FEATURE);
    if (!(await this.canCreatePoll(groupId, actor.id, isGroupAdmin))) throw AppError.forbidden('투표를 만들 수 없어요');
    const t = await this.myTeams(groupId, actor.id, isGroupAdmin);
    if (input.teamId) {
      if (!t.teams.some((x) => x.id === input.teamId)) throw AppError.notFound('팀을 찾을 수 없어요');
      if (!isGroupAdmin && !t.memberOf.has(input.teamId)) throw AppError.forbidden('내 팀의 투표만 만들 수 있어요');
    } else if (!isGroupAdmin) {
      const cfg = await this.settings.get(groupId, FEATURE);
      if (!cfg.memberCanCreatePoll) throw AppError.forbidden('그룹 전체 투표는 그룹 관리자만 만들 수 있어요');
    }
    const places = await this.prisma.dinnerPlace.findMany({ where: { groupId, id: { in: input.placeIds } }, select: { id: true, teamId: true } });
    if (places.length !== new Set(input.placeIds).size) throw AppError.notFound('후보 장소를 찾을 수 없어요');
    if (places.some((p) => p.teamId && p.teamId !== (input.teamId ?? null))) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, '다른 팀 전용 장소는 이 투표에 쓸 수 없어요', HttpStatus.BAD_REQUEST);
    }
    const cfg = await this.settings.get(groupId, FEATURE);
    const closesAt = input.closesAt ? new Date(input.closesAt) : new Date(Date.now() + Number(cfg.pollDurationHours) * 3_600_000);
    return this.prisma.$transaction(async (tx) => {
      const poll = await tx.dinnerPoll.create({
        data: {
          groupId,
          teamId: input.teamId ?? null,
          title: input.title,
          closesAt,
          createdById: actor.id,
          dates: { create: [...new Set(input.dates)].sort().map((date) => ({ date })) },
          places: { create: [...new Set(input.placeIds)].map((placeId) => ({ placeId })) },
        },
      });
      await this.audit.log(tx, { groupId, actorId: actor.id, action: 'dinner_poll.create', targetType: 'DinnerPoll', targetId: poll.id, after: { title: input.title, teamId: input.teamId ?? null } });
      return { id: poll.id };
    });
  }

  private async pollFor(groupId: string, viewer: AuthUser, isGroupAdmin: boolean, id: string) {
    const poll = await this.prisma.dinnerPoll.findFirst({
      where: { id, groupId },
      include: { dates: { orderBy: { date: 'asc' } }, places: { include: { place: true } } },
    });
    if (!poll) throw AppError.notFound('투표를 찾을 수 없어요');
    if (poll.teamId && !isGroupAdmin) {
      const member = await this.prisma.teamMember.count({ where: { teamId: poll.teamId, userId: viewer.id } });
      if (!member) throw AppError.forbidden('팀 투표는 팀원만 볼 수 있어요');
    }
    return poll;
  }

  /** 투표 상세: 날짜·장소별 득표수, 내 투표, 지도에 올릴 장소 좌표 */
  async pollDetail(groupId: string, viewer: AuthUser, isGroupAdmin: boolean, id: string) {
    const poll = await this.pollFor(groupId, viewer, isGroupAdmin, id);
    const cfg = await this.settings.get(groupId, FEATURE);
    const votes = await this.prisma.dinnerVote.findMany({ where: { pollId: id }, select: { userId: true, kind: true, optionId: true } });
    const count = (kind: string, optionId: string) => votes.filter((v) => v.kind === kind && v.optionId === optionId).length;
    const mine = votes.filter((v) => v.userId === viewer.id);
    const voters = new Set(votes.map((v) => v.userId)).size;
    const dates = poll.dates.map((d) => ({ id: d.id, date: d.date, votes: count('DATE', d.id), voted: mine.some((v) => v.kind === 'DATE' && v.optionId === d.id) }));
    const places = poll.places.map((pp) => ({
      id: pp.id,
      place: { id: pp.place.id, name: pp.place.name, address: pp.place.address, lat: pp.place.lat, lng: pp.place.lng, category: pp.place.category, link: pp.place.link, note: pp.place.note },
      votes: count('PLACE', pp.id),
      voted: mine.some((v) => v.kind === 'PLACE' && v.optionId === pp.id),
    }));
    return {
      id: poll.id,
      title: poll.title,
      teamId: poll.teamId,
      open: isOpen(poll),
      closesAt: poll.closesAt,
      voters,
      multiDate: !!cfg.multiDateVote,
      multiPlace: !!cfg.multiPlaceVote,
      canClose: poll.createdById === viewer.id || isGroupAdmin,
      dates,
      places,
      topDateId: [...dates].sort((a, b) => b.votes - a.votes)[0]?.votes ? [...dates].sort((a, b) => b.votes - a.votes)[0].id : null,
      topPlaceId: [...places].sort((a, b) => b.votes - a.votes)[0]?.votes ? [...places].sort((a, b) => b.votes - a.votes)[0].id : null,
    };
  }

  /** 내 투표 저장 (이전 투표를 통째로 교체). 설정에 따라 날짜·장소 복수 선택 */
  async vote(actor: AuthUser, groupId: string, isGroupAdmin: boolean, id: string, input: VoteInput) {
    await this.features.assertEnabled(groupId, FEATURE);
    const poll = await this.pollFor(groupId, actor, isGroupAdmin, id);
    if (!isOpen(poll)) throw new AppError(ErrorCode.VALIDATION_FAILED, '마감된 투표예요', HttpStatus.BAD_REQUEST);
    const cfg = await this.settings.get(groupId, FEATURE);
    const dateIds = [...new Set(input.dateIds)];
    const placeIds = [...new Set(input.placeIds)];
    if (!cfg.multiDateVote && dateIds.length > 1) throw new AppError(ErrorCode.VALIDATION_FAILED, '날짜는 하나만 고를 수 있어요', HttpStatus.BAD_REQUEST);
    if (!cfg.multiPlaceVote && placeIds.length > 1) throw new AppError(ErrorCode.VALIDATION_FAILED, '장소는 하나만 고를 수 있어요', HttpStatus.BAD_REQUEST);
    if (dateIds.some((d) => !poll.dates.some((x) => x.id === d)) || placeIds.some((p) => !poll.places.some((x) => x.id === p))) {
      throw AppError.notFound('투표 항목을 찾을 수 없어요');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.dinnerVote.deleteMany({ where: { pollId: id, userId: actor.id } });
      const data = [
        ...dateIds.map((optionId) => ({ pollId: id, userId: actor.id, kind: 'DATE', optionId })),
        ...placeIds.map((optionId) => ({ pollId: id, userId: actor.id, kind: 'PLACE', optionId })),
      ];
      if (data.length) await tx.dinnerVote.createMany({ data });
    });
    return { ok: true };
  }

  async closePoll(actor: AuthUser, groupId: string, isGroupAdmin: boolean, id: string) {
    const poll = await this.pollFor(groupId, actor, isGroupAdmin, id);
    if (poll.createdById !== actor.id && !isGroupAdmin) throw AppError.forbidden('만든 사람이나 관리자만 마감할 수 있어요');
    await this.prisma.dinnerPoll.update({ where: { id }, data: { status: 'CLOSED', closedAt: new Date() } });
    return { ok: true };
  }

  async removePoll(actor: AuthUser, groupId: string, isGroupAdmin: boolean, id: string) {
    const poll = await this.pollFor(groupId, actor, isGroupAdmin, id);
    if (poll.createdById !== actor.id && !isGroupAdmin) throw AppError.forbidden('만든 사람이나 관리자만 지울 수 있어요');
    await this.prisma.$transaction(async (tx) => {
      await tx.dinnerPoll.delete({ where: { id } });
      await this.audit.log(tx, { groupId, actorId: actor.id, action: 'dinner_poll.delete', targetType: 'DinnerPoll', targetId: id, before: { title: poll.title } });
    });
    return { ok: true };
  }
}
