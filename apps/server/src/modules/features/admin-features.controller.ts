import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { RejectRequestInput, rejectRequestSchema } from '@weplay/shared';
import { z } from 'zod';
import { AuthUser, CurrentUser } from '../../common/decorators';
import { MasterGuard } from '../../common/master.guard';
import { ZodPipe } from '../../common/zod.pipe';
import { parsePaging } from '../../common/paging';
import { FeaturesService, parseFeatureKey } from './features.service';

const guideSchema = z.object({
  summary: z.string().trim().max(120).nullable().optional(),
  body: z.string().trim().max(5000).nullable().optional(),
  images: z.array(z.string().max(300)).max(8).optional(),
});

/** MASTER 전용 기능 승인 API (system-web) */
@UseGuards(MasterGuard)
@Controller('admin/features')
export class AdminFeaturesController {
  constructor(private readonly features: FeaturesService) {}

  @Get()
  list(@Query('status') status?: string, @Query('page') page = '1', @Query('pageSize') pageSize = '20') {
    return this.features.list(status, Number(page) || 1, Math.min(Number(pageSize) || 20, 100));
  }

  @Get('catalog')
  catalog() {
    return this.features.overview();
  }

  @Get('grants')
  grants(@Query('feature') feature: string, @Query('status') status?: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.features.grants(parseFeatureKey(feature), status, parsePaging(page, pageSize));
  }

  /** 기능 전역 활성/비활성 */
  @Put('catalog/:key/active')
  setActive(@CurrentUser() user: AuthUser, @Param('key') key: string, @Body() body: { active?: unknown }) {
    return this.features.setActive(user, parseFeatureKey(key), body.active === true);
  }

  /** 기능 소개 팝업 내용 저장 */
  @Put('catalog/:key/guide')
  setGuide(@CurrentUser() user: AuthUser, @Param('key') key: string, @Body(new ZodPipe(guideSchema)) body: z.infer<typeof guideSchema>) {
    return this.features.setGuide(user, parseFeatureKey(key), body);
  }

  /** 기본 탑재 지정/해제 */
  @Put('catalog/:key/default')
  setDefault(@CurrentUser() user: AuthUser, @Param('key') key: string, @Body() body: { isDefault?: unknown }) {
    return this.features.setDefault(user, parseFeatureKey(key), body.isDefault === true);
  }

  /** 그룹 단위 회수 (기본 탑재 기능 포함) */
  @Post('catalog/:key/groups/:groupId/revoke')
  revokeGroup(
    @CurrentUser() user: AuthUser,
    @Param('key') key: string,
    @Param('groupId') groupId: string,
    @Body(new ZodPipe(rejectRequestSchema)) body: RejectRequestInput,
  ) {
    return this.features.revokeGroup(user, groupId, parseFeatureKey(key), body.reason);
  }

  @Post(':id/approve')
  approve(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.features.approve(user, id);
  }

  @Post(':id/revoke')
  revoke(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body(new ZodPipe(rejectRequestSchema)) body: RejectRequestInput) {
    return this.features.revoke(user, id, body.reason);
  }

  @Post(':id/reject')
  reject(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body(new ZodPipe(rejectRequestSchema)) body: RejectRequestInput) {
    return this.features.reject(user, id, body.reason);
  }
}
