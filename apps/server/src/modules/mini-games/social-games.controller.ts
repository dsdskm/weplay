import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AppError } from '../../common/app-error';
import { AuthUser, CurrentGroupMembership, CurrentUser, GroupMembershipContext } from '../../common/decorators';
import { GroupMemberGuard } from '../../common/group-member.guard';
import { ZodPipe } from '../../common/zod.pipe';
import {
  belongingSchema,
  BelongingInput,
  dailySchema,
  factGuessSchema,
  FactGuessInput,
  factSchema,
  memeSchema,
  pickSchema,
  quizCheckSchema,
  SocialGamesService,
  transformSchema,
  wordCheckSchema,
} from './social-games.service';

/** 동료 게임 API: 오늘의 질문, 팀 퍼즐, 물건 주인 맞히기, TMI, AI 게임 */
@UseGuards(GroupMemberGuard)
@Controller('groups/:groupId/games')
export class SocialGamesController {
  constructor(private readonly social: SocialGamesService) {}

  @Get('daily')
  daily(@CurrentUser() user: AuthUser, @Param('groupId') groupId: string) {
    return this.social.daily(groupId, user);
  }

  @Post('daily/:kind')
  answerDaily(@CurrentUser() user: AuthUser, @Param('groupId') groupId: string, @Param('kind') kind: string, @Body(new ZodPipe(dailySchema)) body: z.infer<typeof dailySchema>) {
    const k = kind.toUpperCase();
    if (k !== 'TELEPATHY' && k !== 'BALANCE') throw AppError.notFound('없는 질문입니다');
    return this.social.answerDaily(user, groupId, k, body.answer);
  }

  @Get('puzzle')
  puzzle(@CurrentUser() user: AuthUser, @Param('groupId') groupId: string) {
    return this.social.puzzle(groupId, user);
  }

  @Get('belongings')
  belongingRound(@CurrentUser() user: AuthUser, @Param('groupId') groupId: string) {
    return this.social.belongingRound(groupId, user);
  }

  @Post('belongings')
  putBelonging(@CurrentUser() user: AuthUser, @Param('groupId') groupId: string, @Body(new ZodPipe(belongingSchema)) body: BelongingInput) {
    return this.social.putBelonging(user, groupId, body);
  }

  @Delete('belongings')
  removeBelonging(@CurrentUser() user: AuthUser, @Param('groupId') groupId: string) {
    return this.social.removeBelonging(user, groupId);
  }

  @Post('belongings/guess')
  guessBelonging(@CurrentUser() user: AuthUser, @Param('groupId') groupId: string, @Body(new ZodPipe(pickSchema)) body: { photoId: string; userId: string }) {
    return this.social.guessBelonging(user, groupId, body);
  }

  @Get('tmi')
  tmiRound(@CurrentUser() user: AuthUser, @Param('groupId') groupId: string) {
    return this.social.tmiRound(groupId, user);
  }

  @Post('tmi')
  addFact(@CurrentUser() user: AuthUser, @Param('groupId') groupId: string, @Body(new ZodPipe(factSchema)) body: { text: string }) {
    return this.social.addFact(user, groupId, body.text);
  }

  @Delete('tmi/:id')
  removeFact(@CurrentUser() user: AuthUser, @Param('groupId') groupId: string, @Param('id') id: string) {
    return this.social.removeFact(user, groupId, id);
  }

  @Post('tmi/guess')
  guessFact(@CurrentUser() user: AuthUser, @Param('groupId') groupId: string, @Body(new ZodPipe(factGuessSchema)) body: FactGuessInput) {
    return this.social.guessFact(user, groupId, body);
  }

  @Get('ai/status')
  aiStatus(@Param('groupId') groupId: string) {
    return this.social.aiStatus(groupId);
  }

  @Get('ai-quiz/round')
  aiQuizRound(@Param('groupId') groupId: string) {
    return this.social.aiQuizRound(groupId);
  }

  @Post('ai-quiz/check')
  aiQuizCheck(@CurrentUser() user: AuthUser, @Param('groupId') groupId: string, @Body(new ZodPipe(quizCheckSchema)) body: z.infer<typeof quizCheckSchema>) {
    return this.social.aiQuizCheck(user, groupId, body);
  }

  @Post('meme/captions')
  memeCaptions(@Param('groupId') groupId: string, @Body(new ZodPipe(memeSchema)) body: { mediaUrl: string }) {
    return this.social.memeCaptions(groupId, body.mediaUrl);
  }

  @Get('ai-word/round')
  aiWordRound(@CurrentUser() user: AuthUser, @Param('groupId') groupId: string) {
    return this.social.aiWordRound(groupId, user);
  }

  @Post('ai-word/check')
  aiWordCheck(@CurrentUser() user: AuthUser, @Param('groupId') groupId: string, @Body(new ZodPipe(wordCheckSchema)) body: z.infer<typeof wordCheckSchema>) {
    return this.social.aiWordCheck(user, groupId, body);
  }

  @Post('transform')
  transform(@CurrentUser() user: AuthUser, @Param('groupId') groupId: string, @Body(new ZodPipe(transformSchema)) body: z.infer<typeof transformSchema>) {
    return this.social.transform(user, groupId, body);
  }
}
