import type { Prisma } from '@weplay/db';
import { ErrorCode } from '@weplay/shared';
import { AppError } from './app-error';

type TermsClient = Pick<Prisma.TransactionClient, 'terms' | 'termsAgreement'>;

export function consentRequired() {
    return new AppError(ErrorCode.TERMS_AGREEMENT_REQUIRED, '필수 약관이 변경되었거나 동의가 필요합니다. 약관을 확인하고 다시 동의해 주세요.', 403);
}

export async function effectiveTerms(db: TermsClient, now = new Date()) {
    const rows = await db.terms.findMany({
        where: { status: { in: ['PUBLISHED', 'ARCHIVED'] }, publishedAt: { not: null }, OR: [{ effectiveAt: null }, { effectiveAt: { lte: now } }] },
        orderBy: { version: 'desc' },
    });
    return rows.filter((row, index) => rows.findIndex((other) => other.type === row.type) === index);
}

export async function validateConsent(db: TermsClient, ids: string[], requireService = false) {
    const current = await effectiveTerms(db);
    if (requireService && !current.some((row) => row.type === 'SERVICE')) {
        throw new AppError(ErrorCode.VALIDATION_FAILED, '서비스이용약관이 준비 중입니다. 잠시 후 다시 가입해 주세요.', 503);
    }
    const selected = new Set(ids);
    if (selected.size !== ids.length || ids.some((id) => !current.some((row) => row.id === id)) ||
        current.some((row) => (row.required || row.type === 'SERVICE') && !selected.has(row.id))) {
        throw consentRequired();
    }
    return current.filter((row) => selected.has(row.id));
}

export async function lockTerms(tx: Prisma.TransactionClient) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(742916)`;
}