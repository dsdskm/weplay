import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import {
  SetComplimentReactionInput,
  setComplimentReactionSchema,
  SetComplimentCardHiddenInput,
  setComplimentCardHiddenSchema,
  CreateComplimentCardInput,
  createComplimentCardSchema,
  UpdateComplimentCardInput,
  updateComplimentCardSchema,
  UpdateComplimentSettingInput,
  updateComplimentSettingSchema,
} from '@weplay/shared';
import { parsePaging } from '../../common/paging';
import { AppError } from '../../common/app-error';
import { todayKST } from '../employee-of-the-month/employee-of-the-month.service';
import { AuthUser, CurrentGroupMembership, CurrentUser, GroupMembershipContext, isGroupManager } from '../../common/decorators';
import { GroupMemberGuard } from '../../common/group-member.guard';
import { ZodPipe } from '../../common/zod.pipe';
import { ComplimentCardService } from './compliment-card.service';


/** 칭찬 카드 API (user-web). 조회·발송은 구성원 모두, 삭제는 보낸 사람과 그룹 ADMIN */
@UseGuards(GroupMemberGuard)
@Controller('groups/:groupId/compliments')
export class ComplimentCardController {
  constructor(private readonly cards: ComplimentCardService) {}

  @Get()
  overview(@CurrentUser() user: AuthUser, @Param('groupId') groupId: string) {
    return this.cards.overview(groupId, user.id);
  }

  @Get('feed')
  feed(
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Query('q') q?: string,
    @Query('senderId') senderId?: string,
    @Query('receiverId') receiverId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.cards.feed(groupId, user.id, { q, senderId, receiverId, from, to }, parsePaging(page, pageSize), isGroupManager(m));
  }

  @Get('sent')
  sent(@CurrentUser() user: AuthUser, @Param('groupId') groupId: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.cards.sent(groupId, user.id, parsePaging(page, pageSize));
  }

  @Get('received')
  received(
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.cards.received(groupId, user.id, parsePaging(page, pageSize), isGroupManager(m));
  }

  @Post()
  send(@CurrentUser() user: AuthUser, @Param('groupId') groupId: string, @Body(new ZodPipe(createComplimentCardSchema)) body: CreateComplimentCardInput) {
    return this.cards.send(user, groupId, body);
  }

  @Patch(':cardId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('groupId') groupId: string,
    @Param('cardId') cardId: string,
    @Body(new ZodPipe(updateComplimentCardSchema)) body: UpdateComplimentCardInput,
  ) {
    return this.cards.update(user, groupId, cardId, body);
  }

  @Put('settings')
  updateSettings(
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Body(new ZodPipe(updateComplimentSettingSchema)) body: UpdateComplimentSettingInput,
  ) {
    if (!isGroupManager(m)) throw AppError.forbidden('관리자만 설정할 수 있습니다');
    return this.cards.updateSettings(user, groupId, body);
  }

  /** 관리자: 하루 단위 전체 칭찬 목록 */
  @Get('admin/cards')
  adminDaily(
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Query('date') date?: string,
    @Query('senderId') senderId?: string,
    @Query('receiverId') receiverId?: string,
    @Query('hidden') hidden?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    if (!isGroupManager(m)) throw AppError.forbidden('관리자만 사용할 수 있습니다');
    const day = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : todayKST();
    const hiddenFilter = hidden === 'hidden' || hidden === 'visible' ? hidden : 'all';
    return this.cards.adminDaily(groupId, day, { senderId, receiverId, hidden: hiddenFilter }, parsePaging(page, pageSize));
  }

  /** 관리자: 칭찬 숨김/해제 */
  @Put('admin/cards/:cardId/hidden')
  setHidden(
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Param('cardId') cardId: string,
    @Body(new ZodPipe(setComplimentCardHiddenSchema)) body: SetComplimentCardHiddenInput,
  ) {
    if (!isGroupManager(m)) throw AppError.forbidden('관리자만 사용할 수 있습니다');
    return this.cards.setHidden(user, groupId, cardId, body);
  }

  /** 칭찬 반응 설정 */
  @Put(':cardId/reaction')
  setReaction(
    @CurrentUser() user: AuthUser,
    @Param('groupId') groupId: string,
    @Param('cardId') cardId: string,
    @Body(new ZodPipe(setComplimentReactionSchema)) body: SetComplimentReactionInput,
  ) {
    return this.cards.setReaction(user, groupId, cardId, body);
  }

  /** 칭찬 반응 취소 */
  @Delete(':cardId/reaction')
  removeReaction(@CurrentUser() user: AuthUser, @Param('groupId') groupId: string, @Param('cardId') cardId: string) {
    return this.cards.removeReaction(user, groupId, cardId);
  }
}
