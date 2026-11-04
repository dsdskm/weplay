import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { MAILER, Mailer } from '../../common/mailer';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class TermsMailService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(TermsMailService.name);
    private timer?: ReturnType<typeof setInterval>;
    private running = false;

    constructor(private readonly prisma: PrismaService, @Inject(MAILER) private readonly mailer: Mailer) { }

    onModuleInit() {
        this.timer = setInterval(() => this.kick(), 30_000);
        this.timer.unref();
        this.kick();
    }

    onModuleDestroy() {
        if (this.timer) clearInterval(this.timer);
    }

    kick() {
        void this.processBatch().catch(() => this.logger.error('약관 안내 메일 대기열 처리 실패'));
    }

    async processBatch() {
        if (this.running) return;
        this.running = true;
        try {
            const rows = await this.prisma.termsNotification.findMany({
                where: {
                    attempts: { lt: 5 }, OR: [
                        { status: 'PENDING' },
                        { status: 'FAILED', updatedAt: { lte: new Date(Date.now() - 60_000) } },
                        { status: 'SENDING', updatedAt: { lte: new Date(Date.now() - 600_000) } },
                    ]
                },
                orderBy: { createdAt: 'asc' }, take: 20, include: { terms: true },
            });
            for (const row of rows) {
                const claimed = await this.prisma.termsNotification.updateMany({ where: { id: row.id, status: row.status, updatedAt: row.updatedAt }, data: { status: 'SENDING', attempts: { increment: 1 } } });
                if (!claimed.count) continue;
                try {
                    const user = await this.prisma.user.findUnique({ where: { id: row.userId }, select: { email: true, status: true } });
                    if (!user?.email || user.status !== 'ACTIVE') {
                        await this.prisma.termsNotification.update({ where: { id: row.id }, data: { status: 'SKIPPED', lastError: '탈퇴 또는 수신 이메일 없음' } });
                        continue;
                    }
                    const terms = row.terms;
                    const url = new URL('/terms', process.env.APP_URL ?? 'http://localhost:3000');
                    url.searchParams.set('type', terms.type);
                    url.searchParams.set('version', String(terms.version));
                    const date = terms.effectiveAt?.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) ?? '게시 즉시';
                    const body = [
                        `안녕하세요. WePlay입니다.`, `${terms.title} v${terms.version}이 게시되었습니다.`,
                        `시행일: ${date} (한국 시간)`, `주요 변경 사항: ${terms.changeSummary || '약관 전문을 확인해 주세요.'}`,
                        `약관 전문 및 이전 버전: ${url.toString()}`,
                        terms.required || terms.type === 'SERVICE' ? '시행일부터 서비스를 이용하려면 새 약관에 동의해야 합니다. 로그인 후 동의 화면에서 확인해 주세요.' : '이번 개정 내용은 위 링크에서 확인할 수 있습니다.',
                        '동의하지 않는 경우 계정 관리에서 계정을 비활성화할 수 있습니다.',
                        '이 메일은 서비스 운영에 필요한 약관 안내로, 마케팅 수신 동의 여부와 관계없이 발송됩니다.',
                    ].join('\n\n');
                    await this.mailer.send(user.email, `[WePlay] ${terms.title.replace(/[\r\n]/g, ' ')} v${terms.version} 개정 안내`, body);
                    const simulated = process.env.MAIL_DRIVER !== 'gmail';
                    await this.prisma.termsNotification.update({ where: { id: row.id }, data: { status: simulated ? 'SIMULATED' : 'SENT', email: user.email, sentAt: simulated ? null : new Date(), lastError: null } });
                } catch {
                    await this.prisma.termsNotification.update({ where: { id: row.id }, data: { status: 'FAILED', lastError: '메일 발송 실패. 메일 설정과 수신 주소를 확인해 주세요.' } });
                }
            }
        } finally {
            this.running = false;
        }
    }
}