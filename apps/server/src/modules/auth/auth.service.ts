import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import type { User } from '@weplay/db';
import {
  ChangePasswordInput,
  DeactivateInput,
  ErrorCode,
  LocalLoginInput,
  MasterLoginInput,
  SignupInput,
} from '@weplay/shared';
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

  /** 아이디/비밀번호 로그인 (모든 계정 유형). MASTER 전용 로그인은 masterLogin 사용 */
  async localLogin(input: LocalLoginInput) {
    const id = input.username.trim();
    const user = await this.prisma.user.findFirst({ where: { OR: [{ username: id }, { email: id.toLowerCase() }] } });
    if (!user || !(await this.verifyPassword(user, input.password))) {
      throw new AppError(ErrorCode.INVALID_CREDENTIALS, '아이디 또는 비밀번호가 올바르지 않습니다', HttpStatus.UNAUTHORIZED);
    }
    return this.issue(user);
  }

  async masterLogin(input: MasterLoginInput) {
    const user = await this.prisma.user.findUnique({ where: { username: input.username } });
    if (!user || user.platformRole !== 'MASTER' || !(await this.verifyPassword(user, input.password))) {
      throw new AppError(ErrorCode.INVALID_CREDENTIALS, '아이디 또는 비밀번호가 올바르지 않습니다', HttpStatus.UNAUTHORIZED);
    }
    return this.issue(user);
  }

  /** 회원가입 (아이디 = 이메일) */
  async signup(input: SignupInput) {
    await this.assertAccountAvailable(input.email);
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          username: input.email,
          email: input.email,
          name: input.name,
          birthDate: input.birthDate ? new Date(input.birthDate) : null,
          phone: input.phone ?? null,
          passwordHash: await bcrypt.hash(input.password, 10),
        },
      });
      await this.audit.log(tx, { actorId: created.id, action: 'auth.signup', targetType: 'User', targetId: created.id });
      return created;
    });
    return this.issue(user);
  }

  /** 아이디(이메일) 중복 확인. 아이디와 이메일은 같은 값 */
  async assertAccountAvailable(email: string) {
    if (await this.prisma.user.findFirst({ where: { OR: [{ username: email }, { email }] } })) {
      throw new AppError(ErrorCode.USERNAME_TAKEN, '이미 사용 중인 아이디(이메일)입니다', HttpStatus.CONFLICT);
    }
  }

  /** 비밀번호 찾기 요청 (빈 구현). 계정 존재 여부는 응답으로 드러내지 않음 */
  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findFirst({ where: { OR: [{ username: email }, { email }] } });
    if (user) {
      // TODO: 재설정 토큰 발급 + Mailer.send 연결
    }
    return { ok: true };
  }

  /** 비밀번호 변경. 비밀번호가 없는 계정(Google 전용)은 현재 비밀번호 없이 설정 */
  async changePassword(userId: string, input: ChangePasswordInput) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.passwordHash && !(input.currentPassword && (await bcrypt.compare(input.currentPassword, user.passwordHash)))) {
      throw new AppError(ErrorCode.INVALID_CREDENTIALS, '현재 비밀번호가 올바르지 않습니다', HttpStatus.BAD_REQUEST);
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(input.newPassword, 10) } });
      await this.audit.log(tx, { actorId: userId, action: 'auth.password_changed', targetType: 'User', targetId: userId });
    });
    return { ok: true };
  }

  /** 본인 계정 비활성화 (로그인 불가, 관리자가 다시 활성화 가능) */
  async deactivate(userId: string, input: DeactivateInput) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.passwordHash && !(input.password && (await bcrypt.compare(input.password, user.passwordHash)))) {
      throw new AppError(ErrorCode.INVALID_CREDENTIALS, '비밀번호가 올바르지 않습니다', HttpStatus.BAD_REQUEST);
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { status: 'DEACTIVATED' } });
      await this.audit.log(tx, {
        actorId: userId,
        action: 'user.deactivated',
        targetType: 'User',
        targetId: userId,
        before: { status: user.status },
        after: { status: 'DEACTIVATED' },
      });
    });
    return { ok: true };
  }

  /** MASTER 비밀번호는 SEED_MASTER_PASSWORD가 설정되어 있으면 그 값과 직접 비교 */
  private async verifyPassword(user: User, password: string) {
    const envPassword = process.env.SEED_MASTER_PASSWORD;
    if (user.platformRole === 'MASTER' && envPassword) return password === envPassword;
    return !!user.passwordHash && bcrypt.compare(password, user.passwordHash);
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
    // 정지/비활성 계정도 로그인은 되고, 화면은 JwtAuthGuard에서 /me·/auth 외에는 막는다
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const accessToken = await this.jwt.signAsync({ sub: user.id, role: user.platformRole });
    return { accessToken, user: toPublicUser(user) };
  }
}
