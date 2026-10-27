import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApproveRequestInput, approveRequestSchema, RejectRequestInput, rejectRequestSchema } from '@weplay/shared';
import { AuthUser, CurrentUser } from '../../common/decorators';
import { MasterGuard } from '../../common/master.guard';
import { ZodPipe } from '../../common/zod.pipe';
import { RequestsService } from '../requests/requests.service';

@UseGuards(MasterGuard)
@Controller('admin/requests')
export class AdminRequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Get()
  list(@Query('status') status?: string, @Query('companyId') companyId?: string) {
    return this.requests.list({
      ...(status ? { status: status as any } : {}),
      ...(companyId ? { companyId } : {}),
    });
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
