import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentGroupMembership, CurrentUser, GroupMembershipContext, isGroupManager } from '../../common/decorators';
import { GroupMemberGuard } from '../../common/group-member.guard';
import { parsePaging } from '../../common/paging';
import { ZodPipe } from '../../common/zod.pipe';
import { CreatePlaceInput, createPlaceSchema, CreatePollInput, createPollSchema, DinnerVoteService, VoteInput, voteSchema } from './dinner-vote.service';

const isGroupAdmin = (m: GroupMembershipContext) => m.role === 'ADMIN' || m.isPrimaryAdmin;

/** 회식 투표 API: 후보 장소(지도), 날짜·장소 투표. 그룹 전체와 팀별 */
@UseGuards(GroupMemberGuard)
@Controller('groups/:groupId/dinner')
export class DinnerVoteController {
  constructor(private readonly dinner: DinnerVoteService) {}

  @Get('places')
  places(
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Query('teamId') teamId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.dinner.places(groupId, user, isGroupAdmin(m), teamId, parsePaging(page, pageSize, 50, 100));
  }

  @Post('places')
  addPlace(
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Body(new ZodPipe(createPlaceSchema)) body: CreatePlaceInput,
  ) {
    return this.dinner.addPlace(user, groupId, isGroupManager(m), isGroupAdmin(m), body);
  }

  @Delete('places/:id')
  removePlace(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Param('id') id: string) {
    return this.dinner.removePlace(user, groupId, isGroupAdmin(m), id);
  }

  @Get('search')
  search(@Query('q') q?: string) {
    return this.dinner.searchNaver((q ?? '').trim().slice(0, 50));
  }

  @Get('polls')
  polls(
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.dinner.polls(groupId, user, isGroupAdmin(m), status, parsePaging(page, pageSize, 10));
  }

  @Post('polls')
  createPoll(
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Body(new ZodPipe(createPollSchema)) body: CreatePollInput,
  ) {
    return this.dinner.createPoll(user, groupId, isGroupAdmin(m), body);
  }

  @Get('polls/:id')
  pollDetail(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Param('id') id: string) {
    return this.dinner.pollDetail(groupId, user, isGroupAdmin(m), id);
  }

  @Put('polls/:id/votes')
  vote(
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Param('id') id: string,
    @Body(new ZodPipe(voteSchema)) body: VoteInput,
  ) {
    return this.dinner.vote(user, groupId, isGroupAdmin(m), id, body);
  }

  @Post('polls/:id/close')
  close(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Param('id') id: string) {
    return this.dinner.closePoll(user, groupId, isGroupAdmin(m), id);
  }

  @Delete('polls/:id')
  removePoll(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Param('id') id: string) {
    return this.dinner.removePoll(user, groupId, isGroupAdmin(m), id);
  }
}
