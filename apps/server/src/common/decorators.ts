import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { GroupMembership, User } from '@weplay/db';

export const IS_PUBLIC = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC, true);

export type AuthUser = Pick<User, 'id' | 'name' | 'email' | 'username' | 'platformRole' | 'status'>;

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest().user,
);

export interface GroupMembershipContext extends GroupMembership {
  isPrimaryAdmin: boolean;
  /** 그룹 안 어느 팀이든 ADMIN인지 */
  isTeamAdmin: boolean;
}

export const CurrentGroupMembership = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): GroupMembershipContext => ctx.switchToHttp().getRequest().groupMembership,
);

/** 관리자 = 그룹 ADMIN(대표 포함) 또는 팀 ADMIN. 이달의 사원·칭찬·기능 신청 등에 공통 적용 */
export const isGroupManager = (m: GroupMembershipContext) => m.role === 'ADMIN' || m.isPrimaryAdmin || m.isTeamAdmin;
