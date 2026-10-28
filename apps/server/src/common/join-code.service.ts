import { Injectable } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { JOIN_CODE_ALPHABET, JOIN_CODE_LENGTH } from '@weplay/shared';
import { PrismaService } from './prisma.service';

@Injectable()
export class JoinCodeService {
  constructor(private readonly prisma: PrismaService) {}

  /** 그룹/팀 전체에서 유일한 코드 생성 */
  async generate(): Promise<string> {
    for (let i = 0; i < 10; i++) {
      let code = '';
      for (let j = 0; j < JOIN_CODE_LENGTH; j++) code += JOIN_CODE_ALPHABET[randomInt(JOIN_CODE_ALPHABET.length)];
      const [c, g] = await Promise.all([
        this.prisma.group.findUnique({ where: { joinCode: code }, select: { id: true } }),
        this.prisma.team.findUnique({ where: { joinCode: code }, select: { id: true } }),
      ]);
      if (!c && !g) return code;
    }
    throw new Error('Failed to generate unique join code');
  }
}
