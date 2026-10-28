import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApproveRequestInput, approveRequestSchema, RejectRequestInput, rejectRequestSchema } from '@weplay/shared';
import { AuthUser, CurrentUser } from '../../common/decorators';
import { MasterGuard } from '../../common/master.guard';
import { ZodPipe } from '../../common/zod.pipe';
import { RequestsService } from '../requests/requests.service';

/** 'PENDING' 또는 'APPROVED,REJECTED' 같은 목록 형태를 Prisma 조건으로 변환 */
export function parseStatus(status: string) {
  return status.includes(',') ? { in: status.split(',') as any[] } : (status as any);
}

@UseGuards(MasterGuard)
@Controller('admin/requests')
export class AdminRequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Get()
  list(@Query('status') status?: string, @Query('groupId') groupId?: string, @Query('page') page = '1', @Query('pageSize') pageSize = '20') {
    return this.requests.list(
      {
        ...(status ? { status: parseStatus(status) } : {}),
        ...(groupId ? { groupId } : {}),
      },
      Number(page) || 1,
      Number(pageSize) || 20,
    );
  }

  @Post(':id/approve')
  approve(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body(new ZodPipe(approveRequestSchema)) body: ApproveRequestInput) {
    return this.requests.approve({ user }, id, body);
  }

  @Post(':id/reject')
  reject(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body(new ZodPipe(rejectRequestSchema)) body: RejectRequestInput) {
    return this.requests.reject({ user }, id, body.reason);
  }
}
