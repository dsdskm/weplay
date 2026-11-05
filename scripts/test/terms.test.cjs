const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createRequire } = require('node:module');
const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { mkdtemp, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');

const root = resolve(__dirname, '../..');
const serverRequire = createRequire(join(root, 'apps/server/package.json'));
const ts = serverRequire('typescript');
require.extensions['.ts'] = (module, filename) => {
    const result = ts.transpileModule(readFileSync(filename, 'utf8'), {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, experimentalDecorators: true, emitDecoratorMetadata: true, esModuleInterop: true },
        fileName: filename,
    });
    module._compile(result.outputText, filename);
};
serverRequire('reflect-metadata');
const source = (path) => serverRequire(join(root, 'apps/server/src', path));
const { effectiveTerms, validateConsent } = source('common/terms-policy.ts');
const { TermsService, termsSchema } = source('modules/terms/terms.service.ts');
const { UploadsService } = source('modules/uploads/uploads.service.ts');
const { TermsMailService } = source('modules/terms/terms-mail.service.ts');
const { AuthService } = source('modules/auth/auth.service.ts');
const { EmailVerificationService } = source('common/email-verification.service.ts');
const { JwtAuthGuard } = source('common/jwt-auth.guard.ts');
const { signupWithCodeSchema } = serverRequire(join(root, 'packages/shared/src/schemas.ts'));

const past = new Date('2020-01-01T00:00:00Z');
const future = new Date('2099-01-01T00:00:00Z');
const document = (id, type = 'SERVICE', extra = {}) => ({
    id, type, version: 1, title: `${type} terms`, content: 'Full terms', required: type !== 'MARKETING',
    status: 'PUBLISHED', effectiveAt: past, publishedAt: past, attachment: null, changeSummary: 'Updated policy', ...extra,
});
const service = document('service', 'SERVICE', { required: false });
const privacy = document('privacy', 'PRIVACY');
const marketing = document('marketing', 'MARKETING');
const consentError = (error) => error.getStatus() === 403 && error.code === 'TERMS_AGREEMENT_REQUIRED';

test('signup email code check validates without consuming; signup verify consumes it', async () => {
    const row = {
        id: 'verification',
        codeHash: createHash('sha256').update('123456').digest('hex'),
        expiresAt: new Date(Date.now() + 60_000),
        attempts: 0,
        userId: null,
        consumedAt: null,
    };
    const updates = [];
    const prisma = {
        emailVerification: {
            findUnique: async () => row,
            update: async ({ data }) => {
                updates.push(data);
                if (data.attempts) row.attempts += data.attempts.increment;
                if (data.consumedAt) row.consumedAt = data.consumedAt;
            },
        },
    };
    const verification = new EmailVerificationService(prisma, {});
    await verification.check('new@example.test', 'SIGNUP', '123456', null);
    assert.equal(row.consumedAt, null);
    assert.equal(updates.length, 0);
    await assert.rejects(verification.check('new@example.test', 'SIGNUP', '000000', null), (error) => error.code === 'EMAIL_CODE_INVALID');
    assert.equal(row.attempts, 1);
    await verification.verify('new@example.test', 'SIGNUP', '123456', null);
    assert.ok(row.consumedAt instanceof Date);
});

test('signup verification email and persisted expiry both use a five-minute TTL', async () => {
    let saved;
    let sent;
    const prisma = {
        emailVerification: {
            findUnique: async () => null,
            upsert: async ({ create }) => { saved = create; },
        },
    };
    const mailer = { send: async (...args) => { sent = args; } };
    const before = Date.now();
    const result = await new EmailVerificationService(prisma, mailer).send('new@example.test', 'SIGNUP', null);
    const after = Date.now();
    assert.ok(saved.expiresAt.getTime() >= before + 5 * 60 * 1000);
    assert.ok(saved.expiresAt.getTime() <= after + 5 * 60 * 1000);
    assert.match(sent[2], /5분 안에 입력/);
    assert.doesNotMatch(sent[2], /10분/);
    assert.ok(Date.parse(result.expiresAt) >= before + 5 * 60 * 1000);
    assert.ok(Date.parse(result.resendAvailableAt) >= before + 60 * 1000);
});

test('verification resend cooldown returns the exact next-send time', async () => {
    const sentAt = new Date(Date.now() - 10_000);
    const prisma = { emailVerification: { findUnique: async () => ({ sentAt }) } };
    await assert.rejects(
        new EmailVerificationService(prisma, {}).send('new@example.test', 'SIGNUP', null),
        (error) => error.code === 'EMAIL_CODE_COOLDOWN' && error.details.resendAvailableAt === new Date(sentAt.getTime() + 60_000).toISOString(),
    );
});

test('failed initial email delivery removes the unsent code so the user can retry', async () => {
    let created;
    let deleted;
    const prisma = {
        emailVerification: {
            findUnique: async () => null,
            upsert: async ({ create }) => { created = { id: 'unsent', ...create }; return created; },
            deleteMany: async ({ where }) => { deleted = where; },
        },
    };
    const mailer = { send: async () => { throw new Error('mail unavailable'); } };
    await assert.rejects(
        new EmailVerificationService(prisma, mailer).send('new@example.test', 'SIGNUP', null),
        (error) => error.code === 'EMAIL_SEND_FAILED',
    );
    assert.deepEqual(deleted, { id: 'unsent' });
    assert.ok(created);
});

test('fifth incorrect code attempt asks the user to request a new code', async () => {
    const row = {
        id: 'verification',
        codeHash: createHash('sha256').update('123456').digest('hex'),
        expiresAt: new Date(Date.now() + 60_000), attempts: 4, userId: null, consumedAt: null,
    };
    const prisma = {
        emailVerification: {
            findUnique: async () => row,
            update: async ({ data }) => { row.attempts += data.attempts.increment; },
        },
    };
    await assert.rejects(
        new EmailVerificationService(prisma, {}).check('new@example.test', 'SIGNUP', '000000', null),
        (error) => error.code === 'EMAIL_CODE_INVALID' && error.getResponse().error.message.includes('입력 횟수를 초과'),
    );
    assert.equal(row.attempts, 5);
});

test('terms documents accept HTML and HTM alongside PDF and TXT with matching MIME', () => {
    const body = { type: 'SERVICE', title: 'Terms', content: 'Summary' };
    for (const [extension, mimeType] of [['html', 'text/html'], ['htm', 'text/html'], ['pdf', 'application/pdf'], ['txt', 'text/plain']]) {
        const attachment = { url: `/uploads/${'a'.repeat(32)}.${extension}`, name: `terms.${extension}`, size: 12, mimeType, mediaType: 'FILE' };
        assert.equal(termsSchema.safeParse({ ...body, attachment }).success, true);
        assert.equal(termsSchema.safeParse({ ...body, attachment: { ...attachment, mimeType: 'application/octet-stream' } }).success, false);
    }
    assert.equal(termsSchema.safeParse({ ...body, attachment: { url: `/uploads/${'a'.repeat(32)}.zip`, name: 'terms.zip', size: 12, mimeType: 'application/zip', mediaType: 'FILE' } }).success, false);
    const attachment = { url: `/uploads/${'a'.repeat(32)}.pdf`, name: 'terms.pdf', size: 12, mimeType: 'application/pdf', mediaType: 'FILE' };
    assert.equal(termsSchema.safeParse({ ...body, content: '', attachment }).success, true);
    assert.equal(termsSchema.safeParse({ ...body, content: '', attachment: null }).success, false);
    assert.equal(termsSchema.parse({ type: 'SERVICE', content: '', attachment }).title, '');
});

function policyDb(rows) {
    return {
        terms: {
            findMany: async ({ where, orderBy }) => {
                assert.deepEqual(where.status.in, ['PUBLISHED', 'ARCHIVED']);
                assert.deepEqual(where.publishedAt, { not: null });
                assert.deepEqual(orderBy, { version: 'desc' });
                assert.deepEqual(where.OR[0], { effectiveAt: null });
                const cutoff = where.OR[1].effectiveAt.lte;
                assert.ok(cutoff instanceof Date);
                return rows.filter((row) => where.status.in.includes(row.status) && row.publishedAt &&
                    (!row.effectiveAt || row.effectiveAt <= cutoff)).sort((left, right) => right.version - left.version);
            }
        }
    };
}

test('effective policy retains archived terms until replacement takes effect and deduplicates versions', async () => {
    const next = document('next', 'SERVICE', { version: 2, effectiveAt: future });
    const db = policyDb([
        { ...service, status: 'ARCHIVED' }, next, privacy, marketing,
        document('privacy-old', 'PRIVACY', { status: 'PUBLISHED', version: 0 }),
        document('draft', 'SERVICE', { status: 'DRAFT', version: 9 }),
        document('unpublished', 'SERVICE', { publishedAt: null, version: 8 }),
    ]);
    assert.deepEqual((await effectiveTerms(db, past)).map((row) => row.id), ['service', 'privacy', 'marketing']);
    assert.deepEqual((await effectiveTerms(db, future)).map((row) => row.id), ['next', 'privacy', 'marketing']);
    assert.deepEqual((await new TermsService(db).current()).find((row) => row.id === 'service').required, true);
});

test('consent rejects stale, partial, duplicate and unknown IDs; legacy SERVICE is mandatory, MARKETING optional', async () => {
    const db = policyDb([service, privacy, marketing, document('stale', 'SERVICE', { version: 0, status: 'ARCHIVED' })]);
    for (const ids of [[], ['privacy'], ['service'], ['stale', 'privacy'], ['service', 'privacy', 'privacy'], ['service', 'privacy', 'unknown']]) {
        await assert.rejects(validateConsent(db, ids), consentError);
    }
    assert.deepEqual((await validateConsent(db, ['service', 'privacy'], true)).map((row) => row.id), ['service', 'privacy']);
    assert.equal((await validateConsent(db, ['service', 'privacy', 'marketing'])).length, 3);
    await assert.rejects(validateConsent(policyDb([privacy]), ['privacy'], true), (error) => error.getStatus() === 503);
});

const master = { id: 'master', platformRole: 'MASTER', status: 'ACTIVE' };
const member = { id: 'member', platformRole: 'USER', status: 'ACTIVE' };
const signup = { email: 'new@example.test', name: 'New user', password: 'testing-password', emailCode: '123456', termsIds: ['service', 'privacy'] };
const input = { type: 'SERVICE', title: 'Revised terms', content: 'New text', required: false, changeSummary: 'Revision' };

function transactionDb(rows = [service, privacy, marketing]) {
    const calls = [];
    const state = { terms: structuredClone(rows), users: [], agreements: [], notifications: [] };
    let active = false;
    const tx = {
        $executeRaw: async (strings, ...values) => {
            assert.equal(active, true);
            assert.equal(strings.join(''), 'SELECT pg_advisory_xact_lock(742916)');
            assert.deepEqual(values, []);
            calls.push('lock');
            return [];
        },
        terms: {
            findMany: async (query) => {
                assert.equal(active, true);
                calls.push('tx.policy');
                return policyDb(state.terms).terms.findMany(query);
            },
            findUnique: async ({ where }) => state.terms.find((row) => row.id === where.id) ?? null,
            findFirst: async ({ where, orderBy }) => {
                assert.deepEqual(orderBy, { version: 'desc' });
                return state.terms.filter((row) => row.type === where.type && (!where.status || where.status.in.includes(row.status)))
                    .sort((left, right) => right.version - left.version)[0] ?? null;
            },
            create: async ({ data }) => {
                const row = { ...document('created'), ...data, status: 'DRAFT' };
                state.terms.push(row);
                return row;
            },
            updateMany: async ({ where, data }) => {
                const matched = state.terms.filter((row) => row.type === where.type && row.status === where.status);
                matched.forEach((row) => Object.assign(row, data));
                return { count: matched.length };
            },
            update: async ({ where, data }) => {
                const row = state.terms.find((item) => item.id === where.id);
                assert.ok(row);
                Object.assign(row, data);
                return row;
            },
            delete: async ({ where }) => {
                state.terms = state.terms.filter((row) => row.id !== where.id);
            },
        },
        user: {
            create: async ({ data }) => {
                assert.equal(active, true);
                calls.push('user.create');
                const row = { ...member, id: 'new-user', createdAt: past, ...data };
                state.users.push(row);
                return row;
            },
            findMany: async (query) => {
                assert.deepEqual(query, { where: { status: 'ACTIVE', email: { not: null } }, select: { id: true, email: true } });
                return state.users.filter((row) => row.status === 'ACTIVE' && row.email !== null).map(({ id, email }) => ({ id, email }));
            },
        },
        termsAgreement: {
            createMany: async ({ data, skipDuplicates }) => {
                assert.equal(active, true);
                assert.equal(skipDuplicates, true);
                calls.push('agreements.createMany');
                for (const row of data) {
                    if (!state.agreements.some((existing) => existing.userId === row.userId && existing.termsId === row.termsId)) state.agreements.push(row);
                }
                return { count: data.length };
            }
        },
        termsNotification: {
            createMany: async ({ data, skipDuplicates }) => {
                assert.equal(skipDuplicates, true);
                state.notifications.push(...data);
                return { count: data.length };
            }
        },
    };
    const db = {
        ...policyDb(state.terms),
        user: {
            findFirst: async () => { calls.push('account.available'); return null; },
            update: async ({ where, data }) => {
                assert.equal(active, false);
                calls.push('lastLogin');
                assert.ok(data.lastLoginAt instanceof Date);
                return state.users.find((row) => row.id === where.id);
            },
        },
        $transaction: async (callback) => {
            assert.equal(active, false);
            calls.push('transaction');
            const before = structuredClone(state);
            active = true;
            try {
                const result = await callback(tx);
                calls.push('commit');
                return result;
            } catch (error) {
                Object.assign(state, before);
                calls.push('rollback');
                throw error;
            } finally {
                active = false;
            }
        },
    };
    const audit = {
        log: async (client, event) => {
            assert.equal(client, tx);
            assert.equal(active, true);
            calls.push(`audit:${event.action}`);
        }
    };
    let kicks = 0;
    const mail = { kick: () => { assert.equal(active, false); kicks++; } };
    return { db, tx, state, calls, audit, mail, get kicks() { return kicks; } };
}

test('signup schema requires nonempty termsIds and valid verification code', () => {
    assert.equal(signupWithCodeSchema.safeParse(signup).success, true);
    for (const termsIds of [undefined, [], [''], Array(11).fill('service')]) {
        assert.equal(signupWithCodeSchema.safeParse({ ...signup, termsIds }).success, false);
    }
    assert.equal(signupWithCodeSchema.safeParse({ ...signup, emailCode: 'bad' }).success, false);
});

test('signup validates consent before consuming verification or opening a transaction', async () => {
    for (const termsIds of [[], ['privacy'], ['service'], ['service', 'privacy', 'service'], ['old', 'privacy']]) {
        const fixture = transactionDb();
        const auth = new AuthService(fixture.db, {}, fixture.audit, { verify: async () => assert.fail('verification consumed') });
        await assert.rejects(auth.signup({ ...signup, termsIds }), consentError);
        assert.deepEqual(fixture.calls, ['account.available']);
        assert.deepEqual(fixture.state.users, []);
    }
    const fixture = transactionDb([privacy]);
    await assert.rejects(new AuthService(fixture.db, {}, fixture.audit, { verify: async () => assert.fail('verification consumed') })
        .signup({ ...signup, termsIds: ['privacy'] }), (error) => error.getStatus() === 503);
});

test('signup locks, revalidates and persists exact agreements with the user in one transaction', async () => {
    const fixture = transactionDb();
    const verification = {
        verify: async (...args) => {
            assert.deepEqual(args, [signup.email, 'SIGNUP', signup.emailCode, null]);
            fixture.calls.push('verify');
        }
    };
    const jwt = {
        signAsync: async (payload) => {
            assert.deepEqual(payload, { sub: 'new-user', role: 'USER' });
            fixture.calls.push('jwt');
            return 'test-token';
        }
    };
    const result = await new AuthService(fixture.db, jwt, fixture.audit, verification).signup(signup);
    assert.deepEqual(fixture.calls, ['account.available', 'verify', 'transaction', 'lock', 'tx.policy', 'user.create', 'agreements.createMany', 'audit:auth.signup', 'commit', 'lastLogin', 'jwt']);
    assert.deepEqual(fixture.state.agreements, [{ termsId: 'service', userId: 'new-user' }, { termsId: 'privacy', userId: 'new-user' }]);
    assert.equal(fixture.state.users[0].username, signup.email);
    assert.notEqual(fixture.state.users[0].passwordHash, signup.password);
    assert.equal(await serverRequire('bcryptjs').compare(signup.password, fixture.state.users[0].passwordHash), true);
    assert.equal(result.accessToken, 'test-token');
    assert.equal(result.user.passwordHash, undefined);
});

test('signup revalidation rejects a publication race and rolls back persistence failures', async () => {
    const race = transactionDb();
    const verification = {
        verify: async () => {
            race.state.terms.push(document('new-service', 'SERVICE', { version: 2 }));
        }
    };
    await assert.rejects(new AuthService(race.db, {}, race.audit, verification).signup(signup), consentError);
    assert.deepEqual(race.calls, ['account.available', 'transaction', 'lock', 'tx.policy', 'rollback']);
    assert.deepEqual(race.state.users, []);
    const fixture = transactionDb();
    fixture.tx.termsAgreement.createMany = async () => { throw new Error('agreement write failed'); };
    await assert.rejects(new AuthService(fixture.db, {}, fixture.audit, { verify: async () => { } }).signup(signup), /agreement write failed/);
    assert.deepEqual(fixture.state.users, []);
    assert.deepEqual(fixture.state.agreements, []);
    assert.equal(fixture.calls.includes('lastLogin'), false);
});

test('agree locks, validates and persists only selected current terms idempotently', async () => {
    const fixture = transactionDb();
    const terms = new TermsService(fixture.db, fixture.audit, fixture.mail);
    for (let attempt = 0; attempt < 2; attempt++) {
        assert.deepEqual(await terms.agree(member, ['service', 'privacy']), { ok: true, agreed: 2 });
    }
    assert.equal(fixture.calls.filter((call) => call === 'lock').length, 2);
    assert.equal(fixture.state.agreements.length, 2);
    await assert.rejects(terms.agree(member, ['service', 'privacy', 'unknown']), consentError);
    assert.equal(fixture.state.agreements.length, 2);
});

test('published and archived documents cannot be updated, deleted or republished', async () => {
    for (const status of ['PUBLISHED', 'ARCHIVED']) {
        const fixture = transactionDb([{ ...service, status }]);
        const terms = new TermsService(fixture.db, fixture.audit, fixture.mail);
        for (const action of [() => terms.update(master, service.id, input), () => terms.remove(master, service.id), () => terms.publish(master, service.id)]) {
            await assert.rejects(action(), (error) => error.getStatus() === 400);
        }
        assert.deepEqual(fixture.state.terms, [{ ...service, status }]);
        assert.equal(fixture.kicks, 0);
        assert.equal(fixture.calls.filter((call) => call === 'lock').length, 3);
    }
});

test('publication rejects lower versions, past dates and dates not after the latest publication', async () => {
    for (const draft of [
        document('draft', 'SERVICE', { status: 'DRAFT', version: 1, effectiveAt: future }),
        document('draft', 'SERVICE', { status: 'DRAFT', version: 3, effectiveAt: past }),
        document('draft', 'SERVICE', { status: 'DRAFT', version: 3, effectiveAt: future }),
    ]) {
        const fixture = transactionDb([document('latest', 'SERVICE', { version: 2, effectiveAt: future, status: 'ARCHIVED' }), draft]);
        await assert.rejects(new TermsService(fixture.db, fixture.audit, fixture.mail).publish(master, 'draft'), (error) => error.getStatus() === 400);
        assert.equal(fixture.state.terms.find((row) => row.id === 'draft').status, 'DRAFT');
        assert.deepEqual(fixture.state.notifications, []);
        assert.equal(fixture.kicks, 0);
    }
});

test('publish queues only active accounts including MASTER and kicks a stub after commit', async () => {
    const fixture = transactionDb([service, document('draft', 'SERVICE', { status: 'DRAFT', version: 2, effectiveAt: future, required: false })]);
    fixture.state.users.push(
        { ...member, email: 'member@example.test' }, { ...master, email: 'master@example.test' },
        { ...member, id: 'inactive', status: 'DEACTIVATED', email: 'inactive@example.test' },
        { ...member, id: 'no-email', email: null }, { ...member, id: 'empty-email', email: '' },
    );
    assert.deepEqual(await new TermsService(fixture.db, fixture.audit, fixture.mail).publish(master, 'draft'), { ok: true });
    assert.equal(fixture.state.terms.find((row) => row.id === 'service').status, 'ARCHIVED');
    const published = fixture.state.terms.find((row) => row.id === 'draft');
    assert.equal(published.status, 'PUBLISHED');
    assert.equal(published.required, true);
    assert.ok(published.publishedAt instanceof Date);
    assert.deepEqual(fixture.state.notifications, [
        { termsId: 'draft', userId: 'member', email: 'member@example.test' },
        { termsId: 'draft', userId: 'master', email: 'master@example.test' },
    ]);
    assert.equal(fixture.kicks, 1);
    assert.equal(fixture.calls[1], 'lock');
    assert.equal(fixture.calls.at(-1), 'commit');
    assert.deepEqual((await effectiveTerms(policyDb(fixture.state.terms))).map((row) => row.id), ['service']);
});

test('create/update enforce mandatory SERVICE and allocate versions under lock; drafts can be deleted', async () => {
    const fixture = transactionDb();
    const terms = new TermsService(fixture.db, fixture.audit, fixture.mail);
    assert.deepEqual(await terms.create(master, input), { id: 'created', version: 2 });
    assert.equal(fixture.state.terms.find((row) => row.id === 'created').required, true);
    await terms.update(master, 'created', input);
    assert.equal(fixture.state.terms.find((row) => row.id === 'created').required, true);
    await terms.remove(master, 'created');
    assert.equal(fixture.state.terms.some((row) => row.id === 'created'), false);
    assert.equal(fixture.calls.filter((call) => call === 'lock').length, 3);
});

test('terms draft persists a real uploaded attachment and rejects mismatched file size', async () => {
    const previousUploadDir = process.env.UPLOAD_DIR;
    const previousStorageDriver = process.env.STORAGE_DRIVER;
    const directory = await mkdtemp(join(tmpdir(), 'weplay-terms-'));
    process.env.UPLOAD_DIR = directory;
    process.env.STORAGE_DRIVER = 'local';
    try {
        const buffer = Buffer.from('%PDF-terms-fixture');
        const attachment = await new UploadsService().saveAttachment({
            originalname: 'terms.pdf', mimetype: 'application/pdf', size: buffer.length, buffer,
        });
        const fixture = transactionDb();
        const terms = new TermsService(fixture.db, fixture.audit, fixture.mail);
        await terms.create(master, { ...input, title: '', attachment });
        assert.deepEqual(fixture.state.terms.find((row) => row.id === 'created').attachment, attachment);
        assert.equal(fixture.state.terms.find((row) => row.id === 'created').title, '서비스 이용약관');

        await assert.rejects(
            terms.create(master, { ...input, title: 'Invalid terms', attachment: { ...attachment, size: attachment.size + 1 } }),
            (error) => error.getStatus() === 400,
        );
        assert.equal(fixture.state.terms.filter((row) => row.title === 'Invalid terms').length, 0);
    } finally {
        if (previousUploadDir === undefined) delete process.env.UPLOAD_DIR;
        else process.env.UPLOAD_DIR = previousUploadDir;
        if (previousStorageDriver === undefined) delete process.env.STORAGE_DRIVER;
        else process.env.STORAGE_DRIVER = previousStorageDriver;
        await rm(directory, { recursive: true, force: true });
    }
});

test('real HTTP JWT guard blocks unconsented USER but leaves consent, identity, deactivation and MASTER routes open', async () => {
    const { Controller, Get, Post, Module } = serverRequire('@nestjs/common');
    const { NestFactory, Reflector } = serverRequire('@nestjs/core');
    const { JwtService } = serverRequire('@nestjs/jwt');
    const { AppExceptionFilter } = source('common/app-exception.filter.ts');
    class ProbeController {
        protected() { return { ok: true }; }
        me() { return { ok: true }; }
        pending() { return []; }
        agreements() { return []; }
        agree() { return { ok: true }; }
        deactivate() { return { ok: true }; }
        misleading() { return { ok: true }; }
    }
    Controller()(ProbeController);
    for (const [method, path, name] of [
        [Get, 'protected', 'protected'], [Get, 'me', 'me'], [Get, 'me/terms/pending', 'pending'],
        [Get, 'me/terms/agreements', 'agreements'], [Post, 'me/terms/agree', 'agree'],
        [Post, 'auth/deactivate', 'deactivate'], [Get, 'me/terms-unsafe', 'misleading'],
    ]) method(path)(ProbeController.prototype, name, Object.getOwnPropertyDescriptor(ProbeController.prototype, name));
    class ProbeModule { }
    Module({ controllers: [ProbeController] })(ProbeModule);
    const jwt = new JwtService({ secret: 'terms-tests-only' });
    let accepted = [];
    const db = {
        ...policyDb([service, privacy, marketing]),
        user: { findUnique: async ({ where }) => where.id === master.id ? master : member },
        termsAgreement: {
            count: async ({ where }) => {
                assert.equal(where.userId, member.id);
                assert.deepEqual(where.termsId.in, ['service', 'privacy']);
                return accepted.filter((id) => where.termsId.in.includes(id)).length;
            }
        },
    };
    const app = await NestFactory.create(ProbeModule, { logger: false });
    try {
        app.setGlobalPrefix('api/v1');
        app.useGlobalGuards(new JwtAuthGuard(new Reflector(), jwt, db));
        app.useGlobalFilters(new AppExceptionFilter());
        await app.listen(0, '127.0.0.1');
        const base = await app.getUrl();
        const request = (path, id = 'member', method = 'GET') => fetch(`${base}/api/v1/${path}`, {
            method, headers: id ? { authorization: `Bearer ${jwt.sign({ sub: id })}` } : {},
        });
        assert.equal((await request('protected', null)).status, 401);
        const blocked = await request('protected');
        assert.equal(blocked.status, 403);
        assert.equal((await blocked.json()).error.code, 'TERMS_AGREEMENT_REQUIRED');
        for (const path of ['me', 'me?details=1', 'me/terms/pending', 'me/terms/agreements']) assert.equal((await request(path)).status, 200, path);
        for (const path of ['me/terms/agree', 'auth/deactivate']) assert.equal((await request(path, 'member', 'POST')).status, 201, path);
        assert.equal((await request('me/terms-unsafe')).status, 403);
        assert.equal((await request('protected', 'master')).status, 200);
        accepted = ['service'];
        assert.equal((await request('protected')).status, 403);
        accepted = ['service', 'privacy'];
        assert.equal((await request('protected')).status, 200);
    } finally {
        await app.close();
    }
});

function mailEnv(context, driver = 'gmail') {
    const previous = { MAIL_DRIVER: process.env.MAIL_DRIVER, APP_URL: process.env.APP_URL };
    process.env.MAIL_DRIVER = driver;
    process.env.APP_URL = 'https://weplay.example.test/nested/base';
    context.after(() => {
        for (const [key, value] of Object.entries(previous)) {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
    });
}

function notification(id, extra = {}) {
    return {
        id, termsId: 'service', userId: id, email: `${id}-old@example.test`,
        status: 'PENDING', attempts: 0, sentAt: null, lastError: null,
        createdAt: past, updatedAt: past, terms: structuredClone(service), ...extra,
    };
}

function mailDb(initial) {
    const rows = structuredClone(initial);
    const claims = [];
    const lookups = [];
    const users = new Map(rows.map((row) => [row.userId, { status: 'ACTIVE', email: `${row.userId}@example.test` }]));
    const db = {
        termsNotification: {
            findMany: async ({ where, orderBy, take, include }) => {
                assert.deepEqual(orderBy, { createdAt: 'asc' });
                assert.equal(take, 20);
                assert.deepEqual(include, { terms: true });
                assert.equal(where.attempts.lt, 5);
                assert.equal(where.OR.length, 3);
                const failed = where.OR.find((item) => item.status === 'FAILED').updatedAt.lte;
                const sending = where.OR.find((item) => item.status === 'SENDING').updatedAt.lte;
                assert.ok(Math.abs(Date.now() - failed.getTime() - 60_000) < 2000);
                assert.ok(Math.abs(Date.now() - sending.getTime() - 600_000) < 2000);
                assert.deepEqual(where.OR.find((item) => item.status === 'PENDING'), { status: 'PENDING' });
                return structuredClone(rows.filter((row) => row.attempts < where.attempts.lt && (
                    row.status === 'PENDING' || (row.status === 'FAILED' && row.updatedAt <= failed) ||
                    (row.status === 'SENDING' && row.updatedAt <= sending)
                )).sort((left, right) => left.createdAt - right.createdAt).slice(0, take));
            },
            updateMany: async ({ where, data }) => {
                assert.deepEqual(data, { status: 'SENDING', attempts: { increment: 1 } });
                assert.deepEqual(Object.keys(where).sort(), ['id', 'status', 'updatedAt']);
                const row = rows.find((item) => item.id === where.id && item.status === where.status && item.updatedAt.getTime() === where.updatedAt.getTime());
                claims.push({ ...where, won: !!row });
                if (!row) return { count: 0 };
                row.status = 'SENDING';
                row.attempts++;
                row.updatedAt = new Date(Math.max(Date.now(), row.updatedAt.getTime() + 1));
                return { count: 1 };
            },
            update: async ({ where, data }) => {
                const row = rows.find((item) => item.id === where.id);
                assert.ok(row);
                Object.assign(row, data, { updatedAt: new Date(Math.max(Date.now(), row.updatedAt.getTime() + 1)) });
                return structuredClone(row);
            },
        },
        user: {
            findUnique: async ({ where, select }) => {
                assert.deepEqual(select, { email: true, status: true });
                lookups.push(where.id);
                return users.get(where.id) ?? null;
            }
        },
    };
    return { db, rows, users, claims, lookups };
}

test('mail isolates per-account send failure, uses current email and marks SENT only with Gmail driver', async (context) => {
    mailEnv(context);
    const fixture = mailDb([notification('bad'), notification('good')]);
    const sent = [];
    const worker = new TermsMailService(fixture.db, {
        send: async (...args) => {
            sent.push(args);
            if (args[0] === 'bad@example.test') throw new Error('private credential must not be persisted');
        }
    });
    await worker.processBatch();
    assert.equal(sent.length, 2);
    assert.equal(fixture.rows[0].status, 'FAILED');
    assert.ok(fixture.rows[0].lastError);
    assert.doesNotMatch(fixture.rows[0].lastError, /private credential/);
    assert.equal(fixture.rows[1].status, 'SENT');
    assert.equal(fixture.rows[1].email, 'good@example.test');
    assert.ok(fixture.rows[1].sentAt instanceof Date);
    assert.equal(fixture.rows[1].lastError, null);
    assert.deepEqual(fixture.rows.map((row) => row.attempts), [1, 1]);
    await worker.processBatch();
    assert.equal(sent.length, 2);
});

test('console/default mail is SIMULATED with no sentAt and is not automatically resent', async (context) => {
    mailEnv(context, 'console');
    for (const driver of ['console', undefined]) {
        if (driver === undefined) delete process.env.MAIL_DRIVER;
        const fixture = mailDb([notification('simulated')]);
        let sends = 0;
        const worker = new TermsMailService(fixture.db, { send: async () => { sends++; } });
        await worker.processBatch();
        await worker.processBatch();
        assert.equal(sends, 1);
        assert.equal(fixture.rows[0].status, 'SIMULATED');
        assert.equal(fixture.rows[0].sentAt, null);
    }
});

test('mail skips deleted, inactive and email-less accounts without invoking the mailer', async (context) => {
    mailEnv(context);
    const fixture = mailDb(['deleted', 'inactive', 'email-less'].map((id) => notification(id)));
    fixture.users.delete('deleted');
    fixture.users.set('inactive', { status: 'DEACTIVATED', email: 'inactive@example.test' });
    fixture.users.set('email-less', { status: 'ACTIVE', email: null });
    await new TermsMailService(fixture.db, { send: async () => assert.fail('skipped account received mail') }).processBatch();
    assert.deepEqual(fixture.rows.map((row) => row.status), ['SKIPPED', 'SKIPPED', 'SKIPPED']);
    assert.ok(fixture.rows.every((row) => row.lastError && row.sentAt === null && row.attempts === 1));
});

test('mail subject, version URL, KST effective date, summary and required/optional notices are preserved', async (context) => {
    mailEnv(context);
    const terms = document('revision', 'SERVICE', {
        title: 'Service\r\nnotice', version: 4, required: false,
        effectiveAt: new Date('2030-01-01T00:00:00Z'), changeSummary: 'Changed retention policy',
    });
    const fixture = mailDb([
        notification('required', { terms }),
        notification('optional', { terms: document('optional', 'MARKETING', { version: 3, effectiveAt: null, changeSummary: '' }) }),
    ]);
    const sends = [];
    await new TermsMailService(fixture.db, { send: async (...args) => sends.push(args) }).processBatch();
    const [, subject, body] = sends[0];
    assert.match(subject, /^\[WePlay\] Service  notice v4 /);
    assert.doesNotMatch(subject, /[\r\n]/);
    assert.ok(body.includes('v4'));
    assert.ok(body.includes(terms.changeSummary));
    assert.ok(body.includes(terms.effectiveAt.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })));
    const link = body.match(/https:\/\/[^\s]+/)[0];
    const url = new URL(link);
    assert.equal(url.origin, 'https://weplay.example.test');
    assert.equal(url.pathname, '/terms');
    assert.equal(url.searchParams.get('type'), 'SERVICE');
    assert.equal(url.searchParams.get('version'), '4');
    const mandatory = '\uc0c8 \uc57d\uad00\uc5d0 \ub3d9\uc758\ud574\uc57c \ud569\ub2c8\ub2e4';
    const deactivate = '\uacc4\uc815\uc744 \ube44\ud65c\uc131\ud654';
    const operational = '\ub9c8\ucf00\ud305 \uc218\uc2e0 \ub3d9\uc758 \uc5ec\ubd80\uc640 \uad00\uacc4\uc5c6\uc774';
    assert.ok(body.includes(mandatory));
    for (const message of sends.map((send) => send[2])) {
        assert.ok(message.includes(deactivate));
        assert.ok(message.includes(operational));
    }
    const optionalBody = sends[1][2];
    assert.equal(optionalBody.includes(mandatory), false);
    assert.ok(optionalBody.includes('\uac8c\uc2dc \uc989\uc2dc'));
    assert.ok(optionalBody.includes('\uc57d\uad00 \uc804\ubb38\uc744 \ud655\uc778'));
    assert.ok(optionalBody.includes('/terms?type=MARKETING&version=3'));
});

test('two mail workers claim a notification once using status and updatedAt compare-and-set', async (context) => {
    mailEnv(context);
    const fixture = mailDb([notification('once')]);
    let sends = 0;
    const mailer = { send: async () => { sends++; } };
    await Promise.all([
        new TermsMailService(fixture.db, mailer).processBatch(),
        new TermsMailService(fixture.db, mailer).processBatch(),
    ]);
    assert.equal(sends, 1);
    assert.equal(fixture.claims.length, 2);
    assert.equal(fixture.claims.filter((claim) => claim.won).length, 1);
    assert.equal(fixture.rows[0].attempts, 1);
    assert.equal(fixture.rows[0].status, 'SENT');
});

test('one worker ignores overlapping batch calls and resets running after a query failure', async (context) => {
    mailEnv(context);
    const fixture = mailDb([notification('overlap')]);
    let release;
    let entered;
    const sending = new Promise((resolve) => { entered = resolve; });
    const held = new Promise((resolve) => { release = resolve; });
    let sends = 0;
    const worker = new TermsMailService(fixture.db, { send: async () => { sends++; entered(); await held; } });
    const first = worker.processBatch();
    await sending;
    try {
        await worker.processBatch();
        assert.equal(sends, 1);
        assert.equal(fixture.claims.length, 1);
    } finally {
        release();
        await first;
    }
    const findMany = fixture.db.termsNotification.findMany;
    fixture.db.termsNotification.findMany = async () => { throw new Error('temporary database outage'); };
    await assert.rejects(worker.processBatch(), /temporary database outage/);
    fixture.db.termsNotification.findMany = findMany;
    await worker.processBatch();
    assert.equal(sends, 1);
});

test('failed mails back off, stop at five attempts, and stale SENDING claims can recover', async (context) => {
    mailEnv(context);
    const fixture = mailDb([
        notification('retry', { status: 'FAILED', attempts: 3 }),
        notification('exhausted', { status: 'FAILED', attempts: 5 }),
        notification('fresh-failure', { status: 'FAILED', updatedAt: new Date() }),
        notification('stuck', { status: 'SENDING' }),
        notification('in-flight', { status: 'SENDING', updatedAt: new Date() }),
    ]);
    const recipients = [];
    const worker = new TermsMailService(fixture.db, {
        send: async (email) => {
            recipients.push(email);
            if (email.startsWith('retry@')) throw new Error('retryable delivery failure');
        }
    });
    await worker.processBatch();
    assert.deepEqual(recipients, ['retry@example.test', 'stuck@example.test']);
    assert.equal(fixture.rows[0].attempts, 4);
    assert.equal(fixture.rows[0].status, 'FAILED');
    assert.equal(fixture.rows[3].status, 'SENT');
    await worker.processBatch();
    assert.equal(recipients.length, 2);
    fixture.rows[0].updatedAt = past;
    await worker.processBatch();
    assert.equal(fixture.rows[0].attempts, 5);
    assert.equal(recipients.length, 3);
    fixture.rows[0].updatedAt = past;
    await worker.processBatch();
    assert.equal(recipients.length, 3);
    assert.equal(fixture.rows[4].attempts, 0);
});

test('manual retry resets only FAILED and SIMULATED records and kicks mail after audit', async (context) => {
    mailEnv(context);
    const fixture = mailDb([
        ...['FAILED', 'SIMULATED', 'SENT', 'PENDING', 'SENDING', 'SKIPPED'].map((status) => notification(status, { status, attempts: 5, lastError: 'old error' })),
        notification('other-terms', { termsId: 'other', status: 'FAILED', attempts: 5 }),
    ]);
    fixture.db.terms = { findUnique: async ({ where }) => { assert.equal(where.id, 'service'); return service; } };
    const claim = fixture.db.termsNotification.updateMany;
    fixture.db.termsNotification.updateMany = async ({ where, data }) => {
        assert.deepEqual(where, { termsId: 'service', status: { in: ['FAILED', 'SIMULATED'] } });
        assert.deepEqual(data, { status: 'PENDING', attempts: 0, lastError: null });
        const matched = fixture.rows.filter((row) => row.termsId === where.termsId && where.status.in.includes(row.status));
        matched.forEach((row) => Object.assign(row, data));
        return { count: matched.length };
    };
    const calls = [];
    const audit = {
        log: async (db, event) => {
            assert.equal(db, fixture.db);
            assert.equal(event.action, 'terms.notifications.retry');
            assert.equal(event.actorId, 'master');
            calls.push('audit');
        }
    };
    const terms = new TermsService(fixture.db, audit, { kick: () => calls.push('kick') });
    assert.deepEqual(await terms.retry(master, 'service'), { ok: true });
    assert.deepEqual(calls, ['audit', 'kick']);
    assert.deepEqual(fixture.rows.slice(0, 2).map(({ status, attempts, lastError }) => ({ status, attempts, lastError })), [
        { status: 'PENDING', attempts: 0, lastError: null }, { status: 'PENDING', attempts: 0, lastError: null },
    ]);
    assert.deepEqual(fixture.rows.slice(2).map((row) => row.status), ['SENT', 'PENDING', 'SENDING', 'SKIPPED', 'FAILED']);
    fixture.db.termsNotification.updateMany = claim;
    const recipients = [];
    await new TermsMailService(fixture.db, { send: async (email) => recipients.push(email) }).processBatch();
    assert.deepEqual(recipients, ['FAILED@example.test', 'SIMULATED@example.test']);
});

test('concurrent consent requests each acquire the advisory lock before reading policy', async () => {
    const fixtures = [transactionDb(), transactionDb()];
    let next = 0;
    const db = { $transaction: (callback) => fixtures[next++].db.$transaction(callback) };
    const terms = new TermsService(db, { log: async () => { } }, { kick: () => assert.fail('consent must not send mail') });
    await Promise.all([terms.agree(member, ['service', 'privacy']), terms.agree(master, ['service', 'privacy'])]);
    for (const fixture of fixtures) {
        assert.deepEqual(fixture.calls.slice(0, 3), ['transaction', 'lock', 'tx.policy']);
        assert.equal(fixture.state.agreements.length, 2);
    }
});