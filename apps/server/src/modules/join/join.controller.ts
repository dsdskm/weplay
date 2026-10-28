import { Body, Controller, Post } from '@nestjs/common';
import { CreateJoinRequestInput, createJoinRequestSchema, JoinLookupInput, joinLookupSchema } from '@weplay/shared';
import { AuthUser, CurrentUser } from '../../common/decorators';
import { ZodPipe } from '../../common/zod.pipe';
import { RequestsService } from '../requests/requests.service';

@Controller('join')
export class JoinController {
  constructor(private readonly requests: RequestsService) {}

  @Post('lookup')
  lookup(@CurrentUser() user: AuthUser, @Body(new ZodPipe(joinLookupSchema)) body: JoinLookupInput) {
    return this.requests.lookup(body.code, user.id);
  }

  @Post('requests')
  create(@CurrentUser() user: AuthUser, @Body(new ZodPipe(createJoinRequestSchema)) body: CreateJoinRequestInput) {
    return this.requests.create(user, body);
  }
}
