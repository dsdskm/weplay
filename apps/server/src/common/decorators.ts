import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Membership, User } from '@weplay/db';

export const IS_PUBLIC = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC, true);

export type AuthUser = Pick<User, 'id' | 'name' | 'email' | 'username' | 'platformRole' | 'status'>;

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest().user,
);

export interface MembershipContext extends Membership {
  isPrimaryAdmin: boolean;
}

export const CurrentMembership = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): MembershipContext => ctx.switchToHttp().getRequest().membership,
);
