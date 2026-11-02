import { HttpStatus, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { addDays, bossOfWeek, dailyGameKey, ErrorCode, FeatureKey, gameByKey, GAMES, kstDate, TEAM_METHODS, teamMedian, teamScore, weeklyGameKey, weekStart } from '@weplay/shared';
import { AppError } from '../../common/app-error';
import { AuthUser } from '../../common/decorators';
import { paged, PageQuery } from '../../common/paging';
import { PrismaService } from '../../common/prisma.service';
import { FeatureSettingsService } from '../features/feature-settings.service';
import { FeaturesService } from '../features/features.service';
import { PointsBadgeService } from '../points-badge/points-badge.service';
import { SocialGamesService } from './social-games.service';

const FEATURE = FeatureKey.MINI_GAMES;
const userSelect = { id: true, name: true, avatarUrl: true } as const;
const DAY = 86_400_000;
/** 종합 점수에 쓰는 게임 수 */
const ALL_TOP = 5;

export const playSchema = z.object({ value: z.number().finite() });
export type PlayInput = z.infer<typeof playSchema>;

type Week = 'this' | 'last' | 'month';
const parseWeek = (w?: string): Week => (w === 'last' || w === 'month' ? w : 'this');
type User = { id: string; name: string; avatarUrl: string | null };

/**
 * 미니게임: 한 판 기록 저장, 주간 개인 랭킹(팀 안·그룹 전체), 주간 팀 대결.
 * 랭킹은 주(월~일, KST) 단위로 사람마다 가장 좋은 기록만 반영. 'ALL'은 게임별 최고 점수 평균(안 한 게임은 0점)
 */
@Injectable()
export class MiniGamesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly features: FeaturesService,
    private readonly settings: FeatureSettingsService,
    private readonly points: PointsBadgeService,
    private readonly social: SocialGamesService,
  ) {}

  /** 기간: 이번 주 / 지난주 / 이번 달(시즌) */
  range(week: Week) {
    const today = kstDate();
    if (week === 'month') {
      const from = `${today.slice(0, 8)}01`;
      const next = new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 1));
      return { from, to: addDays(next.toISOString().slice(0, 10), -1) };
    }
    const start = weekStart(today);
    return week === 'last' ? { from: addDays(start, -7), to: addDays(start, -1) } : { from: start, to: addDays(start, 6) };
  }

  /** 활성 구성원과 소속 팀 */
  private async roster(groupId: string) {
    const [members, teams] = await Promise.all([
      this.prisma.groupMembership.findMany({ where: { groupId, status: 'APPROVED', user: { status: 'ACTIVE' } }, select: { user: { select: userSelect } } }),
      this.prisma.team.findMany({ where: { groupId, deletedAt: null }, select: { id: true, name: true, members: { select: { userId: true } } }, orderBy: { createdAt: 'asc' } }),
    ]);
    const users = new Map<string, User>(members.map((m) => [m.user.id, m.user]));
    const teamOf = new Map<string, { id: string; name: string }>();
    const teamList = teams.map((t) => {
      const ids = t.members.map((m) => m.userId).filter((id) => users.has(id));
      for (const id of ids) teamOf.set(id, { id: t.id, name: t.name });
      return { id: t.id, name: t.name, memberIds: ids };
    });
    return { users, teamOf, teams: teamList };
  }

  /** 사람별 점수: 특정 게임이면 주간 최고점, ALL이면 게임별 최고점 평균 */
  private async bests(groupId: string, game: string, week: Week, userIds: Set<string>) {
    const { from, to } = this.range(week);
    const rows = await this.prisma.gameScore.groupBy({
      by: ['userId', 'game'],
      where: { groupId, playedOn: { gte: from, lte: to }, ...(game === 'ALL' ? {} : { game }) },
      _max: { score: true },
    });
    const per = new Map<string, number[]>();
    for (const r of rows) {
      if (!userIds.has(r.userId)) continue;
      per.set(r.userId, [...(per.get(r.userId) ?? []), r._max.score ?? 0]);
    }
    // ALL(종합) = 게임별 최고점 중 상위 5개 평균 (5개 미만이면 빈 자리 0점) → 여러 게임을 고루 할수록 유리
    const result = new Map<string, number>();
    for (const [id, list] of per) {
      if (game !== 'ALL') result.set(id, list[0]);
      else result.set(id, Math.round((list.sort((a, b) => b - a).slice(0, ALL_TOP).reduce((a, b) => a + b, 0) / ALL_TOP) * 100) / 100);
    }
    return result;
  }

  private rankOf(scores: Map<string, number>, userId: string, filter?: (id: string) => boolean) {
    const list = [...scores.entries()].filter(([id]) => !filter || filter(id));
    const mine = scores.get(userId);
    if (mine === undefined || (filter && !filter(userId))) return { rank: null as number | null, total: list.length };
    return { rank: list.filter(([, s]) => s > mine).length + 1, total: list.length };
  }

  private parseGame(key: string) {
    if (key === 'ALL') return 'ALL';
    if (!gameByKey(key)) throw AppError.notFound('없는 게임입니다');
    return key;
  }

  /** 팀별 점수. method 에 따라 계산 방식이 다름 (shared TEAM_METHODS 참고) */
  private async teamRanking(
    groupId: string,
    roster: Awaited<ReturnType<MiniGamesService['roster']>>,
    scores: Map<string, number>,
    cfg: Record<string, unknown>,
    method: string,
    week: Week,
  ) {
    const [days, boss] = await Promise.all([
      method === 'GOAL' ? this.memberDays(groupId, week) : Promise.resolve(new Map<string, number>()),
      method === 'BOSS' ? this.bossDamage(groupId, week) : Promise.resolve(new Map<string, number>()),
    ]);
    return roster.teams
      .filter((t) => t.memberIds.length > 0)
      .map((t) => {
        const size = t.memberIds.length;
        const played = t.memberIds.filter((id) => scores.has(id));
        const bests = played.map((id) => scores.get(id) as number);
        const calc = teamScore(bests, size, Number(cfg.topN), Number(cfg.participationWeight));
        let score = calc.score;
        let detail = '';
        if (method === 'MEDIAN') {
          const m = teamMedian(bests, size, Number(cfg.topN));
          score = m.median;
          detail = `상위 ${m.k}명 중앙값`;
        } else if (method === 'PARTICIPATION') {
          score = calc.participation;
          detail = `참여 ${played.length}/${size}명`;
        } else if (method === 'GOAL') {
          const goal = size * Number(cfg.goalDaysPerWeek) * (week === 'month' ? 4 : 1);
          const done = t.memberIds.reduce((sum, id) => sum + Math.min(days.get(id) ?? 0, Number(cfg.goalDaysPerWeek) * (week === 'month' ? 4 : 1)), 0);
          score = Math.round((done / goal) * 10000) / 100;
          detail = `플레이 ${done}/${goal}일`;
        } else if (method === 'BOSS') {
          const hp = size * Number(cfg.bossHpPerMember) * (week === 'month' ? 4 : 1);
          const dmg = t.memberIds.reduce((sum, id) => sum + (boss.get(id) ?? 0), 0);
          score = Math.min(100, Math.round((dmg / hp) * 10000) / 100);
          detail = `피해 ${Math.round(dmg).toLocaleString()}/${hp.toLocaleString()}`;
        }
        const top = [...played]
          .sort((a, b) => (scores.get(b) ?? 0) - (scores.get(a) ?? 0))
          .slice(0, 3)
          .map((id) => ({ user: roster.users.get(id) as User, score: scores.get(id) as number }));
        return { team: { id: t.id, name: t.name }, size, participants: played.length, ...calc, score, detail, top };
      })
      .sort((a, b) => b.score - a.score || b.participation - a.participation)
      .map((r, i) => ({ rank: i + 1, ...r }));
  }

  /** 사람별 플레이한 날 수 */
  private async memberDays(groupId: string, week: Week) {
    const { from, to } = this.range(week);
    const rows = await this.prisma.gameScore.groupBy({ by: ['userId', 'playedOn'], where: { groupId, playedOn: { gte: from, lte: to } } });
    const days = new Map<string, number>();
    for (const r of rows) days.set(r.userId, (days.get(r.userId) ?? 0) + 1);
    return days;
  }

  /** 보스 피해: 사람·게임·날짜마다 최고 점수를 합산 (같은 게임 반복으로 몰아치기 방지) */
  private async bossDamage(groupId: string, week: Week) {
    const { from, to } = this.range(week);
    const rows = await this.prisma.gameScore.groupBy({ by: ['userId', 'game', 'playedOn'], where: { groupId, playedOn: { gte: from, lte: to } }, _max: { score: true } });
    const dmg = new Map<string, number>();
    for (const r of rows) dmg.set(r.userId, (dmg.get(r.userId) ?? 0) + (r._max.score ?? 0));
    return dmg;
  }

  /** 팀 보스 레이드: 우리 팀 보스 상태, 팀별 진행률, 최근 공격 기록. 처치하면 참여자에게 보상 (한 번만) */
  async boss(groupId: string, viewer: AuthUser) {
    await this.features.assertEnabled(groupId, FEATURE);
    const cfg = await this.settings.get(groupId, FEATURE);
    const roster = await this.roster(groupId);
    const { from } = this.range('this');
    const dmg = await this.bossDamage(groupId, 'this');
    const def = bossOfWeek(from);
    const myTeam = roster.teamOf.get(viewer.id);
    const teams = roster.teams
      .filter((t) => t.memberIds.length > 0)
      .map((t) => {
        const hp = t.memberIds.length * Number(cfg.bossHpPerMember);
        const damage = Math.round(t.memberIds.reduce((s, id) => s + (dmg.get(id) ?? 0), 0));
        const attackers = t.memberIds.filter((id) => (dmg.get(id) ?? 0) > 0);
        return { team: { id: t.id, name: t.name }, size: t.memberIds.length, hp, damage, percent: Math.min(100, Math.round((damage / hp) * 1000) / 10), defeated: damage >= hp, attackers, isMine: t.id === myTeam?.id };
      })
      .sort((a, b) => b.percent - a.percent);

    // 처치 보상: 피해를 준 팀원에게 주 1회
    for (const t of teams.filter((x) => x.defeated)) {
      await this.points.addLedger(
        groupId,
        t.attackers.map((uid) => ({ userId: uid, amount: Number(cfg.bossReward), kind: 'GAME_REWARD', refId: `boss:${t.team.id}:${from}`, memo: `보스 처치 보상: ${def.name}` })),
      );
    }

    const mine = teams.find((t) => t.isMine) ?? null;
    const recent = mine
      ? await this.prisma.gameScore.findMany({
          where: { groupId, playedOn: { gte: from }, userId: { in: roster.teams.find((t) => t.id === mine.team.id)?.memberIds ?? [] } },
          orderBy: { createdAt: 'desc' },
          take: 12,
          select: { id: true, userId: true, game: true, score: true, createdAt: true },
        })
      : [];
    return {
      boss: def,
      week: this.range('this'),
      reward: Number(cfg.bossReward),
      mine: mine && {
        ...mine,
        attackers: undefined,
        topAttackers: mine.attackers
          .map((id) => ({ user: roster.users.get(id) as User, damage: Math.round(dmg.get(id) ?? 0) }))
          .sort((a, b) => b.damage - a.damage)
          .slice(0, 5),
        recent: recent.map((r) => ({ id: r.id, user: roster.users.get(r.userId) as User, game: r.game, damage: Math.round(r.score), at: r.createdAt })),
      },
      teams: teams.map((t, i) => ({ rank: i + 1, team: t.team, size: t.size, hp: t.hp, damage: t.damage, percent: t.percent, defeated: t.defeated, isMine: t.isMine })),
    };
  }

  /** 동료 사진 게임 한 판: 동료가 올린 사진 5장과 보기 4명 (정답 포함) */
  async photoRound(groupId: string, viewer: AuthUser) {
    await this.features.assertEnabled(groupId, FEATURE);
    const roster = await this.roster(groupId);
    const [subs, cells] = await Promise.all([
      this.prisma.photoSubmission.findMany({ where: { mission: { groupId }, mediaType: 'IMAGE', authorId: { not: viewer.id } }, select: { mediaUrl: true, authorId: true }, take: 300, orderBy: { createdAt: 'desc' } }),
      this.prisma.bingoCell.findMany({ where: { board: { groupId }, mediaType: 'IMAGE', userId: { not: viewer.id } }, select: { mediaUrl: true, userId: true }, take: 300, orderBy: { createdAt: 'desc' } }),
    ]);
    const pool = [...subs.map((s) => ({ url: s.mediaUrl, userId: s.authorId })), ...cells.map((c) => ({ url: c.mediaUrl, userId: c.userId }))].filter((p) => roster.users.has(p.userId));
    const authors = new Set(pool.map((p) => p.userId));
    if (pool.length < 5 || authors.size < 2) return { available: false as const, items: [] };
    const others = [...roster.users.keys()].filter((id) => id !== viewer.id);
    const shuffle = <T>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);
    const items = shuffle(pool)
      .slice(0, 5)
      .map((p) => {
        const choices = shuffle([p.userId, ...shuffle(others.filter((id) => id !== p.userId)).slice(0, 3)]).map((id) => roster.users.get(id) as User);
        return { mediaUrl: p.url, answerId: p.userId, choices, focus: { x: 20 + Math.random() * 60, y: 20 + Math.random() * 60 } };
      });
    return { available: true as const, items };
  }

  /** 게임 홈: 게임 목록과 내 기록, 오늘의 챌린지, 연속 플레이, 팀원 오늘 참여, 지난주 챔피언 */
  async overview(groupId: string, viewer: AuthUser) {
    if (!(await this.features.isEnabled(groupId, FEATURE))) return { enabled: false as const };
    const today = kstDate();
    const cfg = await this.settings.get(groupId, FEATURE);
    const roster = await this.roster(groupId);
    const ids = new Set(roster.users.keys());
    const myTeam = roster.teamOf.get(viewer.id) ?? null;
    const teammates = myTeam ? (roster.teams.find((t) => t.id === myTeam.id)?.memberIds ?? []) : [];

    const [todayMine, allTime, weekly, days, todayTeam, lastAll, balance, boss] = await Promise.all([
      this.prisma.gameScore.groupBy({ by: ['game'], where: { groupId, userId: viewer.id, playedOn: today }, _count: { _all: true } }),
      this.prisma.gameScore.groupBy({ by: ['game'], where: { groupId, userId: viewer.id }, _max: { score: true }, _count: { _all: true } }),
      Promise.all(GAMES.map((g) => this.bests(groupId, g.key, 'this', ids))),
      this.prisma.gameScore.findMany({ where: { groupId, userId: viewer.id }, distinct: ['playedOn'], select: { playedOn: true }, orderBy: { playedOn: 'desc' }, take: 400 }),
      teammates.length
        ? this.prisma.gameScore.findMany({ where: { groupId, playedOn: today, userId: { in: teammates } }, distinct: ['userId'], select: { userId: true } })
        : Promise.resolve([] as { userId: string }[]),
      this.bests(groupId, 'ALL', 'last', ids),
      this.points.balance(groupId, viewer.id),
      this.bossDamage(groupId, 'this'),
    ]);

    // 연속 플레이: 오늘(또는 어제)부터 끊기지 않은 날 수
    const daySet = new Set(days.map((d) => d.playedOn));
    let streak = 0;
    let cursor = daySet.has(today) ? today : addDays(today, -1);
    while (daySet.has(cursor)) {
      streak += 1;
      cursor = addDays(cursor, -1);
    }

    const todayCount = new Map(todayMine.map((r) => [r.game, r._count._all]));
    const best = new Map(allTime.map((r) => [r.game, r._max.score ?? 0]));
    const plays = new Map(allTime.map((r) => [r.game, r._count._all]));
    const playedToday = new Set(todayTeam.map((r) => r.userId));
    const inTeam = (id: string) => teammates.includes(id);

    const lastChampion = [...lastAll.entries()].sort((a, b) => b[1] - a[1])[0];
    const lastTeams = await this.teamRanking(groupId, roster, lastAll, cfg, 'HYBRID', 'last');
    const week = this.range('this');
    const bossDef = bossOfWeek(week.from);
    const bossHp = teammates.length * Number(cfg.bossHpPerMember);
    const bossDmg = Math.round(teammates.reduce((sum, id) => sum + (boss.get(id) ?? 0), 0));

    return {
      enabled: true as const,
      today,
      week,
      dailyLimit: Number(cfg.dailyLimit),
      dailyGame: cfg.dailyChallengeEnabled ? dailyGameKey(today) : null,
      weeklyGame: cfg.dailyChallengeEnabled ? weeklyGameKey(week.from) : null,
      balance,
      economy: { playFee: Number(cfg.playFee), maxPlayReward: Number(cfg.maxPlayReward), challengeReward: Number(cfg.challengeReward) },
      boss: myTeam ? { ...bossDef, hp: bossHp, damage: bossDmg, percent: bossHp ? Math.min(100, Math.round((bossDmg / bossHp) * 1000) / 10) : 0 } : null,
      streak,
      playedToday: daySet.has(today),
      myTeam,
      teamToday: myTeam
        ? {
            played: playedToday.size,
            total: teammates.length,
            notYet: teammates.filter((id) => !playedToday.has(id)).slice(0, 12).map((id) => roster.users.get(id) as User),
          }
        : null,
      lastWeek: {
        champion: lastChampion ? { user: roster.users.get(lastChampion[0]) as User, score: lastChampion[1] } : null,
        team: lastTeams[0] && lastTeams[0].participants > 0 ? { team: lastTeams[0].team, score: lastTeams[0].score } : null,
      },
      games: GAMES.map((g, i) => {
        const scores = weekly[i];
        return {
          key: g.key,
          playsToday: todayCount.get(g.key) ?? 0,
          plays: plays.get(g.key) ?? 0,
          personalBest: best.has(g.key) ? best.get(g.key) : null,
          weekBest: scores.get(viewer.id) ?? null,
          group: this.rankOf(scores, viewer.id),
          team: myTeam ? this.rankOf(scores, viewer.id, inTeam) : null,
        };
      }),
    };
  }

  /** 한 판 기록 저장. 하루 게임별 횟수 제한, 허용 범위를 벗어난 기록은 거절 */
  async play(groupId: string, viewer: AuthUser, key: string, input: PlayInput) {
    await this.features.assertEnabled(groupId, FEATURE);
    const def = gameByKey(key);
    if (!def) throw AppError.notFound('없는 게임입니다');
    if (input.value < def.min || input.value > def.max) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, '기록이 올바르지 않아요', HttpStatus.BAD_REQUEST);
    }
    const cfg = await this.settings.get(groupId, FEATURE);
    const today = kstDate();
    const limit = Number(cfg.dailyLimit);
    const [count, prev] = await Promise.all([
      this.prisma.gameScore.count({ where: { groupId, userId: viewer.id, game: key, playedOn: today } }),
      this.prisma.gameScore.aggregate({ where: { groupId, userId: viewer.id, game: key }, _max: { score: true } }),
    ]);
    if (count >= limit) throw new AppError(ErrorCode.VALIDATION_FAILED, `오늘은 이 게임을 ${limit}번 모두 했어요. 내일 또 만나요!`, HttpStatus.CONFLICT);

    const score = def.toScore(input.value);
    const row = await this.prisma.gameScore.create({ data: { groupId, userId: viewer.id, game: key, value: input.value, score, playedOn: today } });

    // 포인트: 참가비(잔액이 0이어도 차감 → 마이너스 가능) + 점수 비례 보상 + 챌린지 보너스(하루·주 1회)
    const fee = Number(cfg.playFee);
    const reward = Math.round((score / 100) * Number(cfg.maxPlayReward));
    const week = this.range('this');
    const bonus = Number(cfg.challengeReward);
    const isDaily = !!cfg.dailyChallengeEnabled && dailyGameKey(today) === key;
    const isWeekly = !!cfg.dailyChallengeEnabled && weeklyGameKey(week.from) === key;
    await this.points.addLedger(groupId, [
      { userId: viewer.id, amount: -fee, kind: 'GAME_FEE', refId: row.id, memo: `${def.name} 참가비` },
      { userId: viewer.id, amount: reward, kind: 'GAME_REWARD', refId: row.id, memo: `${def.name} ${score.toFixed(1)}점 보상` },
      ...(isDaily ? [{ userId: viewer.id, amount: bonus, kind: 'GAME_REWARD', refId: `daily:${today}`, memo: '오늘의 챌린지 보너스' }] : []),
      ...(isWeekly ? [{ userId: viewer.id, amount: bonus, kind: 'GAME_REWARD', refId: `weekly:${week.from}`, memo: '주간 챌린지 보너스' }] : []),
    ]);
    // 팀 퍼즐: 조각이 16개 모두 열리면 팀원 보상 (한 번만)
    await this.social.settleTeamPuzzle(groupId, viewer.id);
    const balance = await this.points.balance(groupId, viewer.id);

    const roster = await this.roster(groupId);
    const scores = await this.bests(groupId, key, 'this', new Set(roster.users.keys()));
    const myTeam = roster.teamOf.get(viewer.id);
    const mates = myTeam ? (roster.teams.find((t) => t.id === myTeam.id)?.memberIds ?? []) : [];
    const prevBest = prev._max.score;
    return {
      score,
      value: input.value,
      isPersonalBest: prevBest === null || score > prevBest,
      previousBest: prevBest,
      weekBest: scores.get(viewer.id) ?? score,
      group: this.rankOf(scores, viewer.id),
      team: myTeam ? { name: myTeam.name, ...this.rankOf(scores, viewer.id, (id) => mates.includes(id)) } : null,
      remainingToday: Math.max(0, limit - count - 1),
      points: { fee, reward, balance },
    };
  }

  /** 주간 개인 랭킹. scope=team 이면 우리 팀만 */
  async leaderboard(groupId: string, viewer: AuthUser, key: string, scope: string | undefined, week: string | undefined, q: PageQuery) {
    await this.features.assertEnabled(groupId, FEATURE);
    const game = this.parseGame(key);
    const roster = await this.roster(groupId);
    const scores = await this.bests(groupId, game, parseWeek(week), new Set(roster.users.keys()));
    const myTeam = roster.teamOf.get(viewer.id);
    const mates = new Set(myTeam ? (roster.teams.find((t) => t.id === myTeam.id)?.memberIds ?? []) : []);
    const filter = scope === 'team' ? (id: string) => mates.has(id) : () => true;
    const sorted = [...scores.entries()].filter(([id]) => filter(id)).sort((a, b) => b[1] - a[1]);
    const rows = sorted.map(([id, score]) => ({
      rank: sorted.filter(([, s]) => s > score).length + 1,
      user: roster.users.get(id) as User,
      teamName: roster.teamOf.get(id)?.name ?? null,
      score,
      isMe: id === viewer.id,
    }));
    const me = rows.find((r) => r.isMe);
    return {
      ...paged(rows.slice(q.skip, q.skip + q.pageSize), rows.length, q),
      me: me ? { rank: me.rank, score: me.score, total: rows.length, topPercent: Math.max(1, Math.round((me.rank / rows.length) * 1000) / 10) } : null,
    };
  }

  /** 팀 대결: 순위 방식(method)은 설정 기본값 또는 화면에서 고른 값 */
  async teams(groupId: string, viewer: AuthUser, key: string, week: string | undefined, method: string | undefined, q: PageQuery) {
    await this.features.assertEnabled(groupId, FEATURE);
    const game = this.parseGame(key);
    const cfg = await this.settings.get(groupId, FEATURE);
    const m = TEAM_METHODS.some((x) => x.key === method) ? (method as string) : String(cfg.teamMethod);
    const period = parseWeek(week);
    const roster = await this.roster(groupId);
    const scores = await this.bests(groupId, game, period, new Set(roster.users.keys()));
    const myTeamId = roster.teamOf.get(viewer.id)?.id;
    const rows = (await this.teamRanking(groupId, roster, scores, cfg, m, period)).map((r) => ({ ...r, isMine: r.team.id === myTeamId }));
    return {
      ...paged(rows.slice(q.skip, q.skip + q.pageSize), rows.length, q),
      method: m,
      rule: { topN: Number(cfg.topN), participationWeight: Number(cfg.participationWeight), goalDaysPerWeek: Number(cfg.goalDaysPerWeek), bossHpPerMember: Number(cfg.bossHpPerMember) },
      mine: rows.find((r) => r.isMine) ?? null,
    };
  }
}
