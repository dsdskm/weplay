import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ErrorCode } from '@weplay/shared';
import { AppError } from './app-error';
import { IS_PUBLIC } from './decorators';
import { PrismaService } from './prisma.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    const unauthorized = new AppError(ErrorCode.UNAUTHORIZED, '로그인이 필요합니다', HttpStatus.UNAUTHORIZED);
    if (!token) throw unauthorized;

    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      throw unauthorized;
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, username: true, platformRole: true, status: true },
    });
    if (!user) throw unauthorized;
    if (user.status !== 'ACTIVE') throw new AppError(ErrorCode.USER_SUSPENDED, '정지된 계정입니다', HttpStatus.FORBIDDEN);
    req.user = user;
    return true;
  }
}
