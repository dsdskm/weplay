import { HttpStatus, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { BINGO_MISSIONS, ErrorCode, FeatureKey, kstDate, weekStart } from '@weplay/shared';
import { AppError } from '../../common/app-error';
import { AuthUser } from '../../common/decorators';
import { PrismaService } from '../../common/prisma.service';
import { FeatureSettingsService } from '../features/feature-settings.service';
import { FeaturesService } from '../features/features.service';
import { PointsBadgeService } from '../points-badge/points-badge.service';
import { AiService } from '../ai/ai.service';


const FEATURE = FeatureKey.MINI_GAMES;
const userSelect = { id: true, name: true, avatarUrl: true } as const;

export const bingoCellSchema = z.object({
  index: z.number().int().min(0).max(24),
  mediaUrl: z.string().min(1).max(300),
  mediaType: z.enum(['IMAGE', 'VIDEO']),
  caption: z.string().trim().max(100).optional(),
});
export type BingoCellInput = z.infer<typeof bingoCellSchema>;

/** 가로·세로·대각선 줄 목록 */
function linesOf(size: number) {
  const lines: number[][] = [];
  for (let r = 0; r < size; r++) lines.push([...Array(size)].map((_, c) => r * size + c));
  for (let c = 0; c < size; c++) lines.push([...Array(size)].map((_, r) => r * size + c));
  lines.push([...Array(size)].map((_, i) => i * size + i));
  lines.push([...Array(size)].map((_, i) => i * size + (size - 1 - i)));
  return lines;
}

/**
 * 팀 사진 빙고: 팀·주마다 빙고판 1장. 팀원이 칸 미션에 맞는 사진을 올려 칸을 채움.
 * 공정성: 한 사람이 채울 수 있는 칸 수 = ceil(칸 수 / 팀 인원) → 큰 팀은 여러 사람이, 작은 팀은 한 사람이 여러 칸
 */
@Injectable()
export class BingoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly features: FeaturesService,
    private readonly settings: FeatureSettingsService,
    private readonly points: PointsBadgeService,
    private readonly ai: AiService,
  ) {}

  /** 미션 목록: AI 가 만들기로 설정돼 있으면 AI, 아니면 기본 미션 */
  private async missionsFor(groupId: string, size: number): Promise<string[]> {
    const n = size * size;
    const cfg = await this.settings.get(groupId, FEATURE);
    if (cfg.aiMissions && this.ai.textEnabled) {
      const list = await this.ai.json<string[]>(`사내 팀 사진 빙고 미션 ${n}개를 한국어로 만드세요. 사무실이나 일상에서 찍을 수 있는 짧은 문구(예: "빨간 물건", "창밖 풍경")로, 서로 겹치지 않게. JSON 문자열 배열만 출력하세요.`);
      if (Array.isArray(list) && list.length >= n && list.every((x) => typeof x === 'string' && x.trim().length > 0)) return list.slice(0, n);
    }
    return [...BINGO_MISSIONS].sort(() => Math.random() - 0.5).slice(0, n);
  }

  private async myTeam(groupId: string, userId: string) {
    const tm = await this.prisma.teamMember.findFirst({ where: { groupId, userId, team: { deletedAt: null } }, select: { teamId: true, role: true, team: { select: { name: true } } } });
    return tm;
  }

  private async boardFor(groupId: string, teamId: string) {
    const week = weekStart(kstDate());
    const existing = await this.prisma.bingoBoard.findUnique({ where: { teamId_week: { teamId, week } } });
    if (existing) return existing;
    const cfg = await this.settings.get(groupId, FEATURE);
    const size = Number(cfg.bingoSize) === 4 ? 4 : 3;
    const missions = await this.missionsFor(groupId, size);
    return this.prisma.bingoBoard.upsert({ where: { teamId_week: { teamId, week } }, create: { groupId, teamId, week, size, missions }, update: {} });
  }

  private async state(boardId: string) {
    const board = await this.prisma.bingoBoard.findUniqueOrThrow({ where: { id: boardId }, include: { cells: { orderBy: { index: 'asc' } } } });
    const filled = new Set(board.cells.map((c) => c.index));
    const lines = linesOf(board.size).map((l, i) => ({ index: i, cells: l, done: l.every((x) => filled.has(x)) }));
    return { board, filled, lines };
  }

  /** 우리 팀 이번 주 빙고판 + 팀별 진행 현황 */
  async get(groupId: string, viewer: AuthUser, isManager: boolean) {
    await this.features.assertEnabled(groupId, FEATURE);
    const tm = await this.myTeam(groupId, viewer.id);
    const week = weekStart(kstDate());
    const cfg = await this.settings.get(groupId, FEATURE);
    const [teams, boards] = await Promise.all([
      this.prisma.team.findMany({ where: { groupId, deletedAt: null }, select: { id: true, name: true, _count: { select: { members: true } } } }),
      this.prisma.bingoBoard.findMany({ where: { groupId, week }, include: { cells: { select: { index: true } } } }),
    ]);
    const ranking = teams
      .filter((t) => t._count.members > 0)
      .map((t) => {
        const b = boards.find((x) => x.teamId === t.id);
        const filled = new Set((b?.cells ?? []).map((c) => c.index));
        const size = b?.size ?? (Number(cfg.bingoSize) === 4 ? 4 : 3);
        const lines = linesOf(size).filter((l) => l.every((x) => filled.has(x))).length;
        return { team: { id: t.id, name: t.name }, filled: filled.size, total: size * size, lines, isMine: t.id === tm?.teamId };
      })
      .sort((a, b) => b.lines - a.lines || b.filled / b.total - a.filled / a.total)
      .map((r, i) => ({ rank: i + 1, ...r }));
    if (!tm) return { team: null, board: null, ranking, lineReward: Number(cfg.bingoLineReward) };

    const raw = await this.boardFor(groupId, tm.teamId);
    const { board, lines } = await this.state(raw.id);
    const size = await this.prisma.teamMember.count({ where: { teamId: tm.teamId } });
    const perMember = Math.ceil((board.size * board.size) / Math.max(1, size));
    const users = await this.prisma.user.findMany({ where: { id: { in: board.cells.map((c) => c.userId) } }, select: userSelect });
    const byId = new Map(users.map((u) => [u.id, u]));
    const missions = board.missions as string[];
    return {
      team: { id: tm.teamId, name: tm.team.name },
      board: {
        id: board.id,
        week: board.week,
        size: board.size,
        perMember,
        myCount: board.cells.filter((c) => c.userId === viewer.id).length,
        lines: lines.filter((l) => l.done).map((l) => l.cells),
        cells: missions.map((mission, index) => {
          const c = board.cells.find((x) => x.index === index);
          return {
            index,
            mission,
            photo: c ? { id: c.id, mediaUrl: c.mediaUrl, mediaType: c.mediaType, caption: c.caption, user: byId.get(c.userId) ?? null, canDelete: c.userId === viewer.id || isManager || tm.role === 'ADMIN' } : null,
          };
        }),
      },
      ranking,
      lineReward: Number(cfg.bingoLineReward),
    };
  }

  /** 칸 채우기. 참가비를 내고, 새로 완성된 줄마다 팀원 모두에게 보상 */
  async fill(groupId: string, viewer: AuthUser, input: BingoCellInput) {
    await this.features.assertEnabled(groupId, FEATURE);
    const tm = await this.myTeam(groupId, viewer.id);
    if (!tm) throw AppError.forbidden('팀에 속한 사람만 빙고를 할 수 있어요');
    const cfg = await this.settings.get(groupId, FEATURE);
    const raw = await this.boardFor(groupId, tm.teamId);
    if (input.index >= raw.size * raw.size) throw new AppError(ErrorCode.VALIDATION_FAILED, '없는 칸이에요', HttpStatus.BAD_REQUEST);
    const before = await this.state(raw.id);
    const members = await this.prisma.teamMember.findMany({ where: { teamId: tm.teamId }, select: { userId: true } });
    const perMember = Math.ceil((raw.size * raw.size) / Math.max(1, members.length));
    if (before.board.cells.filter((c) => c.userId === viewer.id).length >= perMember) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, `한 사람은 ${perMember}칸까지 채울 수 있어요. 다른 팀원에게 기회를 주세요!`, HttpStatus.CONFLICT);
    }
    if (before.filled.has(input.index)) throw new AppError(ErrorCode.VALIDATION_FAILED, '이미 채워진 칸이에요', HttpStatus.CONFLICT);
    // AI 사진 확인: 미션과 맞지 않으면 다시 찍게 함 (판정 실패 시에는 통과)
    if (input.mediaType === 'IMAGE' && cfg.aiVerify && this.ai.textEnabled) {
      const mission = (raw.missions as string[])[input.index];
      const verdict = await this.ai.judgePhoto(input.mediaUrl, mission);
      if (verdict && !verdict.match) throw new AppError(ErrorCode.VALIDATION_FAILED, `AI 확인: ${verdict.reason || `"${mission}" 미션과 다른 사진 같아요`}`, HttpStatus.BAD_REQUEST);
    }
    const cell = await this.prisma.bingoCell
      .create({ data: { boardId: raw.id, index: input.index, userId: viewer.id, mediaUrl: input.mediaUrl, mediaType: input.mediaType, caption: input.caption || null } })
      .catch(() => {
        throw new AppError(ErrorCode.VALIDATION_FAILED, '이미 채워진 칸이에요', HttpStatus.CONFLICT);
      });
    const after = await this.state(raw.id);
    const newLines = after.lines.filter((l) => l.done && !before.lines[l.index].done);
    const mission = (raw.missions as string[])[input.index];
    await this.points.addLedger(groupId, [
      { userId: viewer.id, amount: -Number(cfg.playFee), kind: 'GAME_FEE', refId: `bingo:${cell.id}`, memo: `사진 빙고: ${mission}` },
      ...newLines.flatMap((l) =>
        members.map((m) => ({ userId: m.userId, amount: Number(cfg.bingoLineReward), kind: 'GAME_REWARD', refId: `bingo:${raw.id}:line${l.index}`, memo: `사진 빙고 ${l.index + 1}번째 줄 완성!` })),
      ),
    ]);
    return { ok: true, newLines: newLines.length, totalLines: after.lines.filter((l) => l.done).length };
  }

  /** 칸 비우기: 올린 사람 또는 관리자(팀 ADMIN 포함) */
  async clear(groupId: string, viewer: AuthUser, isManager: boolean, cellId: string) {
    const cell = await this.prisma.bingoCell.findUnique({ where: { id: cellId }, include: { board: true } });
    if (!cell || cell.board.groupId !== groupId) throw AppError.notFound('칸을 찾을 수 없어요');
    const tm = await this.myTeam(groupId, viewer.id);
    if (cell.userId !== viewer.id && !isManager && !(tm?.teamId === cell.board.teamId && tm.role === 'ADMIN')) throw AppError.forbidden('올린 사람만 지울 수 있어요');
    await this.prisma.bingoCell.delete({ where: { id: cellId } });
    return { ok: true };
  }
}
