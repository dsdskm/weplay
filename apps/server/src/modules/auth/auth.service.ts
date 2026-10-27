import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import type { User } from '@weplay/db';
import { ChangePasswordInput, ErrorCode, MasterLoginInput } from '@weplay/shared';
import { AppError } from '../../common/app-error';
import { AuditService } from '../../common/audit.service';
import { PrismaService } from '../../common/prisma.service';

export function toPublicUser(u: Pick<User, 'id' | 'name' | 'email' | 'username' | 'avatarUrl' | 'platformRole' | 'createdAt'>) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    username: u.username,
    avatarUrl: u.avatarUrl,
    platformRole: u.platformRole,
    createdAt: u.createdAt,
  };
}

@Injectable()
export class AuthService {
  private readonly google = new OAuth2Client();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
  ) {}

  async loginWithGoogle(credential: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) throw new AppError(ErrorCode.GOOGLE_TOKEN_INVALID, 'GOOGLE_CLIENT_ID 미설정', 500);
    let payload;
    try {
      const ticket = await this.google.verifyIdToken({ idToken: credential, audience: clientId });
      payload = ticket.getPayload();
    } catch {
      throw new AppError(ErrorCode.GOOGLE_TOKEN_INVALID, 'Google 인증에 실패했습니다', HttpStatus.UNAUTHORIZED);
    }
    if (!payload?.sub || !payload.email || !payload.email_verified) {
      throw new AppError(ErrorCode.GOOGLE_TOKEN_INVALID, '이메일이 확인된 Google 계정이 필요합니다', HttpStatus.UNAUTHORIZED);
    }
    const user = await this.upsertSocialUser({
      googleSub: payload.sub,
      email: payload.email.toLowerCase(),
      name: payload.name ?? payload.email.split('@')[0],
      avatarUrl: payload.picture ?? null,
    });
    return this.issue(user);
  }

  async masterLogin(input: MasterLoginInput) {
    const user = await this.prisma.user.findUnique({ where: { username: input.username } });
    const ok = user?.passwordHash && user.platformRole === 'MASTER' && (await bcrypt.compare(input.password, user.passwordHash));
    if (!user || !ok) throw new AppError(ErrorCode.INVALID_CREDENTIALS, '아이디 또는 비밀번호가 올바르지 않습니다', HttpStatus.UNAUTHORIZED);
    return this.issue(user);
  }

  async changePassword(userId: string, input: ChangePasswordInput) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.passwordHash || !(await bcrypt.compare(input.currentPassword, user.passwordHash))) {
      throw new AppError(ErrorCode.INVALID_CREDENTIALS, '현재 비밀번호가 올바르지 않습니다', HttpStatus.BAD_REQUEST);
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(input.newPassword, 10) } });
      await this.audit.log(tx, { actorId: userId, action: 'auth.password_changed', targetType: 'User', targetId: userId });
    });
    return { ok: true };
  }

  private async upsertSocialUser(p: { googleSub: string; email: string; name: string; avatarUrl: string | null }) {
    let user =
      (await this.prisma.user.findUnique({ where: { googleSub: p.googleSub } })) ||
      (await this.prisma.user.findUnique({ where: { email: p.email } }));
    if (user) {
      if (!user.googleSub) {
        user = await this.prisma.user.update({ where: { id: user.id }, data: { googleSub: p.googleSub } });
      }
      return user;
    }
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { email: p.email, name: p.name, avatarUrl: p.avatarUrl, googleSub: p.googleSub },
      });
      await this.audit.log(tx, { actorId: created.id, action: 'auth.signup', targetType: 'User', targetId: created.id });
      return created;
    });
  }

  private async issue(user: User) {
    if (user.status !== 'ACTIVE') throw new AppError(ErrorCode.USER_SUSPENDED, '정지된 계정입니다', HttpStatus.FORBIDDEN);
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const accessToken = await this.jwt.signAsync({ sub: user.id, role: user.platformRole });
    return { accessToken, user: toPublicUser(user) };
  }
}
