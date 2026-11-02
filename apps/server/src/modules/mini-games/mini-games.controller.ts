import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentGroupMembership, CurrentUser, GroupMembershipContext, isGroupManager } from '../../common/decorators';
import { GroupMemberGuard } from '../../common/group-member.guard';
import { parsePaging } from '../../common/paging';
import { ZodPipe } from '../../common/zod.pipe';
import { BingoCellInput, bingoCellSchema, BingoService } from './bingo.service';
import { MiniGamesService, PlayInput, playSchema } from './mini-games.service';

/** 미니게임 API: 기록 저장, 주간 개인 랭킹, 주간 팀 대결 */
@UseGuards(GroupMemberGuard)
@Controller('groups/:groupId/games')
export class MiniGamesController {
  constructor(
    private readonly games: MiniGamesService,
    private readonly bingo: BingoService,
  ) {}

  @Get('bingo')
  bingoBoard(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string) {
    return this.bingo.get(groupId, user, isGroupManager(m));
  }

  @Post('bingo/cells')
  bingoFill(@CurrentUser() user: AuthUser, @Param('groupId') groupId: string, @Body(new ZodPipe(bingoCellSchema)) body: BingoCellInput) {
    return this.bingo.fill(groupId, user, body);
  }

  @Delete('bingo/cells/:cellId')
  bingoClear(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Param('cellId') cellId: string) {
    return this.bingo.clear(groupId, user, isGroupManager(m), cellId);
  }

  @Get()
  overview(@CurrentUser() user: AuthUser, @Param('groupId') groupId: string) {
    return this.games.overview(groupId, user);
  }

  @Get('teams')
  teams(
    @CurrentUser() user: AuthUser,
    @Param('groupId') groupId: string,
    @Query('game') game = 'ALL',
    @Query('week') week?: string,
    @Query('method') method?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.games.teams(groupId, user, game, week, method, parsePaging(page, pageSize, 10));
  }

  @Get('boss')
  boss(@CurrentUser() user: AuthUser, @Param('groupId') groupId: string) {
    return this.games.boss(groupId, user);
  }

  @Get('photo-round')
  photoRound(@CurrentUser() user: AuthUser, @Param('groupId') groupId: string) {
    return this.games.photoRound(groupId, user);
  }

  @Get(':key/leaderboard')
  leaderboard(
    @CurrentUser() user: AuthUser,
    @Param('groupId') groupId: string,
    @Param('key') key: string,
    @Query('scope') scope?: string,
    @Query('week') week?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.games.leaderboard(groupId, user, key, scope, week, parsePaging(page, pageSize, 10));
  }

  @Post(':key/plays')
  play(@CurrentUser() user: AuthUser, @Param('groupId') groupId: string, @Param('key') key: string, @Body(new ZodPipe(playSchema)) body: PlayInput) {
    return this.games.play(groupId, user, key, body);
  }
}
