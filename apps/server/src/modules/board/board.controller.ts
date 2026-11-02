import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AppError } from '../../common/app-error';
import { AuthUser, CurrentGroupMembership, CurrentUser, GroupMembershipContext, isGroupManager } from '../../common/decorators';
import { GroupMemberGuard } from '../../common/group-member.guard';
import { parsePaging } from '../../common/paging';
import { ZodPipe } from '../../common/zod.pipe';
import { BoardService, CommentInput, commentSchema, CreatePostInput, createPostSchema, UpdatePostInput, updatePostSchema } from './board.service';

const isGroupAdmin = (m: GroupMembershipContext) => m.role === 'ADMIN' || m.isPrimaryAdmin;

/** 자유 게시판 API: 그룹 전체·팀별 게시판, 글과 댓글 */
@UseGuards(GroupMemberGuard)
@Controller('groups/:groupId/board')
export class BoardController {
  constructor(private readonly board: BoardService) {}

  @Get('boards')
  boards(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string) {
    return this.board.boards(groupId, user, isGroupAdmin(m));
  }

  /** teamId 를 비우거나 'group' 이면 그룹 전체 게시판 */
  @Get('posts')
  posts(
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Query('teamId') teamId?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.board.posts(groupId, user, isGroupAdmin(m), !teamId || teamId === 'group' ? null : teamId, q, parsePaging(page, pageSize, 10));
  }

  @Post('posts')
  create(
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Body(new ZodPipe(createPostSchema)) body: CreatePostInput,
  ) {
    return this.board.create(user, groupId, isGroupAdmin(m), body);
  }

  @Get('posts/:id')
  detail(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Param('id') id: string) {
    return this.board.detail(groupId, user, isGroupManager(m), isGroupAdmin(m), id);
  }

  @Patch('posts/:id')
  update(
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Param('id') id: string,
    @Body(new ZodPipe(updatePostSchema)) body: UpdatePostInput,
  ) {
    return this.board.update(user, groupId, isGroupAdmin(m), id, body);
  }

  @Delete('posts/:id')
  remove(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Param('id') id: string) {
    return this.board.remove(user, groupId, isGroupManager(m), isGroupAdmin(m), id);
  }

  @Put('posts/:id/pin')
  pin(
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Param('id') id: string,
    @Body() body: { pinned?: boolean },
  ) {
    if (!isGroupManager(m)) throw AppError.forbidden('관리자만 사용할 수 있습니다');
    return this.board.pin(user, groupId, isGroupAdmin(m), id, !!body.pinned);
  }

  @Put('posts/:id/hide')
  hide(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Param('id') id: string) {
    if (!isGroupManager(m)) throw AppError.forbidden('관리자만 사용할 수 있습니다');
    return this.board.hide(user, groupId, isGroupAdmin(m), id);
  }

  @Get('posts/:id/comments')
  comments(
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.board.comments(groupId, user, isGroupManager(m), isGroupAdmin(m), id, parsePaging(page, pageSize, 10));
  }

  @Post('posts/:id/comments')
  addComment(
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Param('id') id: string,
    @Body(new ZodPipe(commentSchema)) body: CommentInput,
  ) {
    return this.board.addComment(user, groupId, isGroupAdmin(m), id, body);
  }

  @Patch('posts/:id/comments/:commentId')
  updateComment(
    @CurrentUser() user: AuthUser,
    @Param('groupId') groupId: string,
    @Param('id') id: string,
    @Param('commentId') commentId: string,
    @Body(new ZodPipe(commentSchema)) body: CommentInput,
  ) {
    return this.board.updateComment(user, groupId, id, commentId, body);
  }

  @Delete('posts/:id/comments/:commentId')
  removeComment(
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Param('id') id: string,
    @Param('commentId') commentId: string,
  ) {
    return this.board.removeComment(user, groupId, isGroupManager(m), id, commentId);
  }
}
