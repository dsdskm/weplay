import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AppError } from '../../common/app-error';
import { AuthUser, CurrentGroupMembership, CurrentUser, GroupMembershipContext, isGroupManager } from '../../common/decorators';
import { GroupMemberGuard } from '../../common/group-member.guard';
import { parsePaging } from '../../common/paging';
import { ZodPipe } from '../../common/zod.pipe';
import { AnswerInput, answerSchema, SuggestionInput, suggestionSchema, SuggestionsService } from './suggestions.service';

const isGroupAdmin = (m: GroupMembershipContext) => m.role === 'ADMIN' || m.isPrimaryAdmin;

/** 건의사항 API */
@UseGuards(GroupMemberGuard)
@Controller('groups/:groupId/suggestions')
export class SuggestionsController {
  constructor(private readonly suggestions: SuggestionsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Query('status') status?: string,
    @Query('sort') sort?: string,
    @Query('mine') mine?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.suggestions.list(groupId, user, isGroupAdmin(m), isGroupManager(m), { status, sort, mine: mine === '1' }, parsePaging(page, pageSize, 10));
  }

  @Get(':id')
  detail(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Param('id') id: string) {
    return this.suggestions.detail(groupId, user, isGroupAdmin(m), isGroupManager(m), id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Body(new ZodPipe(suggestionSchema)) body: SuggestionInput) {
    return this.suggestions.create(user, groupId, isGroupAdmin(m), body);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Param('id') id: string,
    @Body(new ZodPipe(suggestionSchema)) body: SuggestionInput,
  ) {
    return this.suggestions.update(user, groupId, isGroupAdmin(m), id, body);
  }

  @Post(':id/vote')
  vote(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Param('id') id: string) {
    return this.suggestions.vote(user, groupId, isGroupAdmin(m), id);
  }

  @Put(':id/answer')
  answer(
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Param('id') id: string,
    @Body(new ZodPipe(answerSchema)) body: AnswerInput,
  ) {
    if (!isGroupManager(m)) throw AppError.forbidden('관리자만 답변할 수 있습니다');
    return this.suggestions.answer(user, groupId, isGroupAdmin(m), id, body);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Param('id') id: string) {
    return this.suggestions.remove(user, groupId, isGroupAdmin(m), isGroupManager(m), id);
  }
}
