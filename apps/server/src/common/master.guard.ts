import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AppError } from './app-error';

@Injectable()
export class MasterGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const user = ctx.switchToHttp().getRequest().user;
    if (user?.platformRole !== 'MASTER') throw AppError.forbidden('MASTER 전용입니다');
    return true;
  }
}
