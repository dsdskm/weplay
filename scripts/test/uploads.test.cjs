const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createRequire } = require('node:module');
const { readFileSync } = require('node:fs');
const { mkdtemp, rm, readdir } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { Readable } = require('node:stream');

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
const { Storage } = serverRequire('@google-cloud/storage');
const { Module, RequestMethod, Logger } = serverRequire('@nestjs/common');
const { NestFactory, Reflector } = serverRequire('@nestjs/core');
const { JwtService } = serverRequire('@nestjs/jwt');
const source = (path) => serverRequire(join(root, 'apps/server/src', path));
const storage = source('modules/uploads/upload-storage.ts');
const { UploadsService, saveBuffer, validateUpload, sanitizeUploadName } = source('modules/uploads/uploads.service.ts');
const { UploadMediaController } = source('modules/uploads/upload-media.controller.ts');
const { UploadsController, AdminUploadsController } = source('modules/uploads/uploads.controller.ts');
const { FeatureSettingsService } = source('modules/features/feature-settings.service.ts');
const { PrismaService } = source('common/prisma.service.ts');
const { JwtAuthGuard } = source('common/jwt-auth.guard.ts');
const { AppExceptionFilter } = source('common/app-exception.filter.ts');
const { AiService } = source('modules/ai/ai.service.ts');
const file = (originalname, mimetype, buffer = Buffer.from('upload fixture')) => ({ originalname, mimetype, buffer, size: buffer.length });

test('backend uploads: validation, storage and HTTP routing (no ADC/network)', async (suite) => {
    const oldEnv = { ...process.env };
    const directory = await mkdtemp(join(tmpdir(), 'weplay-uploads-'));
    const originalBucket = Storage.prototype.bucket;
    const objects = new Map();
    const writes = [];
    let failure;
    let selectedBucket;
    Storage.prototype.bucket = function (name) {
        selectedBucket = name;
        return {
            file: (key) => ({
                save: async (buffer, options) => {
                    if (failure) throw failure;
                    writes.push({ key, options });
                    objects.set(key, Buffer.from(buffer));
                },
                getMetadata: async () => {
                    if (failure) throw failure;
                    if (!objects.has(key)) throw Object.assign(new Error('missing'), { code: 404 });
                    return [{ size: String(objects.get(key).length) }];
                },
                createReadStream: (range) => Readable.from([range ? objects.get(key).subarray(range.start, range.end + 1) : objects.get(key)]),
            })
        };
    };
    process.env.UPLOAD_DIR = directory;
    process.env.MAX_UPLOAD_MB = '1';
    process.env.STORAGE_DRIVER = 'local';
    delete process.env.GCS_BUCKET;
    const uploads = new UploadsService();
    let app;
    Logger.overrideLogger(false);
    try {
        await suite.test('allowlisted attachments, legacy media constraints, names and sizes', async () => {
            for (const [ext, mime] of Object.entries(storage.UPLOAD_TYPES)) {
                const validated = validateUpload(file(`sample.${ext}`, mime), true, true, true);
                assert.equal(validated.mimeType, mime);
                assert.ok(['IMAGE', 'VIDEO', 'FILE'].includes(validated.mediaType));
            }
            for (const ext of ['svg', 'html', 'htm', 'js', 'sh', 'exe', 'bat', 'php', 'docm', 'xlsm']) {
                assert.throws(() => validateUpload(file(`attack.${ext}`, 'image/png'), true));
            }
            assert.throws(() => validateUpload(file('fake.pdf', 'text/html'), true));
            for (const ext of ['html', 'htm']) {
                assert.throws(() => validateUpload(file(`terms.${ext}`, 'text/html'), true));
                assert.throws(() => validateUpload(file(`terms.${ext}`, 'text/plain'), true, true, true));
            }
            assert.throws(() => validateUpload(file('file.pdf', 'application/pdf')));
            assert.throws(() => validateUpload(file('movie.mp4', 'video/mp4'), false, false));
            assert.throws(() => validateUpload(undefined, true));
            assert.throws(() => validateUpload(file('empty.txt', 'text/plain', Buffer.alloc(0)), true));
            assert.throws(() => validateUpload(file('large.txt', 'text/plain', Buffer.alloc(1024 * 1024 + 1)), true));
            assert.throws(() => validateUpload({ ...file('wrong.txt', 'text/plain'), size: 2 }, true));
            assert.equal(sanitizeUploadName('C:\\fakepath\\report\r\n.csv'), 'report.csv');
            assert.equal(sanitizeUploadName('../../report.pdf'), 'report.pdf');
            assert.ok(sanitizeUploadName('a'.repeat(300)).length <= 180);
        });

        await suite.test('strict filename and URL safety', async () => {
            const name = `${'a'.repeat(32)}.png`;
            assert.equal(storage.parseUploadUrl(`/uploads/${name}`).name, name);
            const scopedName = `terms/private-policy/${'b'.repeat(32)}.pdf`;
            assert.equal(storage.parseUploadUrl(`/uploads/${scopedName}`).name, scopedName);
            for (const value of ['../' + name, name + '/x', name + '?x', name + '\n', name.toUpperCase(), `${'a'.repeat(32)}.svg`, `%2e%2e%2f${name}`]) {
                assert.equal(storage.parseUploadName(value), null);
                await assert.rejects(storage.openUpload(value));
            }
            for (const value of [`terms/unknown/${'c'.repeat(32)}.pdf`, `terms/private-policy/../${name}`, `terms/terms-of-service/${'D'.repeat(32)}.pdf`]) {
                assert.equal(storage.parseUploadName(value), null);
                await assert.rejects(storage.openUpload(value));
            }
            for (const value of [`https://example.com/uploads/${name}`, `/uploads/../${name}`, `/uploads/${name}?x`, `/uploads/${name}#x`, `/uploads/${name}%00`, `/uploads/terms/unknown/${'c'.repeat(32)}.pdf`]) {
                assert.equal(storage.parseUploadUrl(value), null);
                await assert.rejects(storage.readUploadBuffer(value));
            }
        });

        let legacy;
        await suite.test('local writes, async generated uploads, buffer reads and AI vision input', async () => {
            legacy = await saveBuffer(Buffer.from('legacy image'), 'png');
            assert.match(legacy.url, /^\/uploads\/[a-f0-9]{32}\.png$/);
            assert.equal(legacy.mediaType, 'IMAGE');
            assert.equal((await storage.readUploadBuffer(legacy.url)).toString(), 'legacy image');
            const privatePolicy = await uploads.saveTermsAttachment(file('privacy.pdf', 'application/pdf', Buffer.from('%PDF-privacy')), 'PRIVACY');
            assert.match(privatePolicy.url, /^\/uploads\/terms\/private-policy\/[a-f0-9]{32}\.pdf$/);
            assert.equal((await storage.readUploadBuffer(privatePolicy.url)).toString(), '%PDF-privacy');
            assert.equal((await readdir(join(directory, 'terms', 'private-policy'))).length, 1);
            await assert.rejects(uploads.saveTermsAttachment(file('terms.docx', storage.UPLOAD_TYPES.docx), 'SERVICE'), (error) => error.getStatus() === 400);
            await assert.rejects(uploads.saveTermsAttachment(file('terms.pdf', 'application/pdf'), 'MARKETING'), (error) => error.getStatus() === 400);
            const ai = new AiService();
            assert.deepEqual(await ai.imagePayload(legacy.url), { mime: 'image/png', data: Buffer.from('legacy image').toString('base64') });
            assert.equal(await ai.imagePayload('/uploads/../secret.png'), null);
        });

        let cloud;
        await suite.test('default private GCS writes, generated buffers and cloud reads', async () => {
            delete process.env.STORAGE_DRIVER;
            cloud = await uploads.saveAttachment(file('report.pdf', 'application/pdf', Buffer.from('%PDF-fixture')));
            assert.equal(selectedBucket, 'weplay-bucket-op');
            assert.deepEqual(Object.keys(cloud).sort(), ['mediaType', 'mimeType', 'name', 'size', 'url']);
            assert.equal(cloud.mediaType, 'FILE');
            assert.equal(cloud.name, 'report.pdf');
            assert.equal((await storage.readUploadBuffer(cloud.url)).toString(), '%PDF-fixture');
            assert.equal(writes.at(-1).options.metadata.contentType, 'application/pdf');
            assert.match(writes.at(-1).options.metadata.contentDisposition, /^attachment;/);
            assert.equal(writes.at(-1).options.preconditionOpts.ifGenerationMatch, 0);
            assert.equal(writes.at(-1).options.public, undefined);
            assert.equal(writes.at(-1).options.predefinedAcl, undefined);
            const cloudTerms = await uploads.saveTermsAttachment(file('privacy.html', 'text/html'), 'PRIVACY');
            assert.match(cloudTerms.url, /^\/uploads\/terms\/private-policy\/[a-f0-9]{32}\.html$/);
            assert.match(writes.at(-1).key, /^terms\/private-policy\/[a-f0-9]{32}\.html$/);
            assert.match(writes.at(-1).options.metadata.contentDisposition, /^inline; filename="[a-f0-9]{32}\.html"$/);
            assert.equal((await storage.readUploadBuffer(cloudTerms.url)).toString(), 'upload fixture');
            const image = await saveBuffer(Buffer.from('cloud image'), 'png');
            assert.equal((await new AiService().imagePayload(image.url)).data, Buffer.from('cloud image').toString('base64'));
            assert.equal((await storage.readUploadBuffer(legacy.url)).toString(), 'legacy image');
            process.env.GCS_BUCKET = 'test-custom-bucket';
            await storage.openUpload(cloud.url.slice('/uploads/'.length));
            assert.equal(selectedBucket, 'test-custom-bucket');
            delete process.env.GCS_BUCKET;
        });

        await suite.test('failed cloud writes never fall back; authorization errors never read local', async () => {
            const before = await readdir(directory);
            failure = Object.assign(new Error('secret credential detail'), { code: 403 });
            await assert.rejects(uploads.saveAttachment(file('test.txt', 'text/plain')), (error) => error.getStatus() === 503 && !JSON.stringify(error.getResponse()).includes('secret credential'));
            assert.deepEqual(await readdir(directory), before);
            await assert.rejects(storage.readUploadBuffer(legacy.url), (error) => error.code === 403);
            failure = undefined;
            process.env.STORAGE_DRIVER = 'invalid';
            await assert.rejects(storage.readUploadBuffer(legacy.url));
            process.env.STORAGE_DRIVER = 'gcs';
        });

        await suite.test('buffer reads reject missing and oversized objects', async () => {
            await assert.rejects(storage.readUploadBuffer(`/uploads/${'c'.repeat(32)}.png`), (error) => error.code === 'ENOENT');
            const name = `${'d'.repeat(32)}.png`;
            objects.set(name, Buffer.alloc(1024 * 1024 + 1));
            await assert.rejects(storage.readUploadBuffer(`/uploads/${name}`), /buffer read limit/);
            objects.delete(name);
        });

        await suite.test('HTTP media routes, actual auth guards and attachment endpoints', async () => {
            const jwt = new JwtService({ secret: 'upload-tests-only' });
            const prisma = {
                terms: { findMany: async () => [] },
                user: { findUnique: async ({ where }) => ({ id: where.id, status: 'ACTIVE', platformRole: where.id === 'master' ? 'MASTER' : 'USER' }) },
                groupMembership: { findUnique: async ({ where }) => where.userId_groupId.userId === 'member' && where.userId_groupId.groupId === 'group' ? { status: 'APPROVED', group: { primaryAdminId: 'member', deletedAt: null } } : null },
                teamMember: { findFirst: async () => null },
            };
            let allowVideo = false;
            const settings = { get: async () => ({ allowVideo }) };
            class UploadTestModule { }
            Module({ controllers: [UploadMediaController, UploadsController, AdminUploadsController], providers: [{ provide: UploadsService, useValue: uploads }, { provide: FeatureSettingsService, useValue: settings }, { provide: PrismaService, useValue: prisma }] })(UploadTestModule);
            app = await NestFactory.create(UploadTestModule, { logger: false });
            app.enableCors({ origin: 'http://localhost:3000' });
            app.setGlobalPrefix('api/v1', {
                exclude: [
                    { path: 'uploads/:name', method: RequestMethod.GET }, { path: 'uploads/:name', method: RequestMethod.HEAD },
                    { path: 'uploads/terms/:folder/:name', method: RequestMethod.GET }, { path: 'uploads/terms/:folder/:name', method: RequestMethod.HEAD },
                ]
            });
            app.useGlobalGuards(new JwtAuthGuard(new Reflector(), jwt, prisma));
            app.useGlobalFilters(new AppExceptionFilter());
            await app.listen(0, '127.0.0.1');
            const base = await app.getUrl();
            const request = (url, options) => fetch(base + url, options);
            const headers = (id) => ({ authorization: `Bearer ${jwt.sign({ sub: id })}` });
            const post = (url, id, name, mime) => {
                const form = new FormData();
                form.append('file', new Blob(['uploaded file'], { type: mime }), name);
                return request(url, { method: 'POST', headers: id ? headers(id) : {}, body: form });
            };
            let response = await request(cloud.url);
            assert.equal(response.status, 200);
            assert.equal(response.headers.get('content-type'), 'application/pdf');
            assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
            assert.match(response.headers.get('content-disposition'), /^attachment;/);
            assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:3000');
            assert.equal(await response.text(), '%PDF-fixture');
            response = await request(legacy.url);
            assert.equal(response.status, 200);
            assert.equal(response.headers.get('content-type'), 'image/png');
            assert.match(response.headers.get('content-disposition'), /^inline;/);
            response = await request(cloud.url, { method: 'HEAD' });
            assert.equal(response.status, 200);
            assert.equal(response.headers.get('content-length'), String('%PDF-fixture'.length));
            assert.equal(await response.text(), '');
            response = await request(cloud.url, { headers: { range: 'bytes=1-3' } });
            assert.equal(response.status, 206);
            assert.equal(response.headers.get('content-range'), 'bytes 1-3/12');
            assert.equal(await response.text(), 'PDF');
            response = await request(cloud.url, { headers: { range: 'bytes=-3' } });
            assert.equal(response.status, 206);
            assert.equal(response.headers.get('content-range'), 'bytes 9-11/12');
            assert.equal(await response.text(), 'ure');
            response = await request(cloud.url, { headers: { range: 'bytes=9-' } });
            assert.equal(response.status, 206);
            assert.equal(await response.text(), 'ure');
            for (const range of ['bytes=999-', 'bytes=3-1', 'bytes=0-1,3-4', 'bytes=-0', 'bytes=-']) {
                assert.equal((await request(cloud.url, { headers: { range } })).status, 416);
            }
            assert.equal((await request(`/uploads/${'b'.repeat(32)}.png`)).status, 404);
            assert.equal((await request(`/uploads/${'a'.repeat(32)}.html`)).status, 404);
            assert.equal((await request('/api/v1' + cloud.url, { headers: headers('member') })).status, 404);
            assert.equal((await post('/api/v1/groups/group/uploads/attachments', null, 'file.txt', 'text/plain')).status, 401);
            assert.equal((await post('/api/v1/groups/group/uploads/attachments', 'outsider', 'file.txt', 'text/plain')).status, 403);
            assert.equal((await post('/api/v1/admin/uploads/attachments', 'member', 'file.txt', 'text/plain')).status, 403);
            assert.equal((await post('/api/v1/admin/uploads/terms/SERVICE/attachments', 'member', 'terms.pdf', 'application/pdf')).status, 403);
            assert.equal((await post('/api/v1/admin/uploads/terms/MARKETING/attachments', 'master', 'terms.pdf', 'application/pdf')).status, 400);
            for (const [type, folder, name, mime] of [
                ['SERVICE', 'terms-of-service', 'service.pdf', 'application/pdf'],
                ['PRIVACY', 'private-policy', 'privacy.html', 'text/html'],
            ]) {
                response = await post(`/api/v1/admin/uploads/terms/${type}/attachments`, 'master', name, mime);
                assert.equal(response.status, 201);
                const uploaded = await response.json();
                assert.match(uploaded.url, new RegExp(`^/uploads/terms/${folder}/[a-f0-9]{32}\\.${name.split('.').pop()}$`));
                for (const method of ['GET', 'HEAD']) {
                    response = await request(uploaded.url, { method });
                    assert.equal(response.status, 200);
                    assert.equal(response.headers.get('content-type'), mime);
                    assert.match(response.headers.get('content-disposition'), /^inline;/);
                    assert.equal(await response.text(), method === 'HEAD' ? '' : 'uploaded file');
                }
                if (type === 'PRIVACY') {
                    assert.match(response.headers.get('content-security-policy'), /sandbox; default-src 'none'/);
                    assert.match(response.headers.get('content-security-policy'), /style-src 'unsafe-inline'/);
                    assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'self' http:\/\/localhost:3000/);
                }
            }
            for (const ext of ['html', 'htm']) {
                assert.equal((await post('/api/v1/groups/group/uploads/attachments', 'member', `terms.${ext}`, 'text/html')).status, 400);
                assert.equal((await post('/api/v1/admin/uploads/attachments', 'member', `terms.${ext}`, 'text/html')).status, 403);
                assert.equal((await post('/api/v1/admin/uploads/attachments', 'master', `terms.${ext}`, 'text/plain')).status, 400);
                response = await post('/api/v1/admin/uploads/attachments', 'master', `terms.${ext}`, 'text/html');
                assert.equal(response.status, 201);
                const uploaded = await response.json();
                assert.equal(uploaded.mediaType, 'FILE');
                assert.equal(uploaded.mimeType, 'text/html');
                assert.ok(uploaded.url.endsWith(`.${ext}`));
                for (const method of ['GET', 'HEAD']) {
                    response = await request(uploaded.url, { method });
                    assert.equal(response.status, 200);
                    assert.match(response.headers.get('content-type'), /^text\/html/);
                    assert.match(response.headers.get('content-disposition'), /^attachment;/);
                    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
                    assert.match(response.headers.get('content-security-policy'), /sandbox; default-src 'none'/);
                    assert.equal(await response.text(), method === 'HEAD' ? '' : 'uploaded file');
                }
            }
            response = await post('/api/v1/groups/group/uploads/attachments', 'member', 'movie.mp4', 'video/mp4');
            assert.equal(response.status, 201);
            assert.equal((await response.json()).mediaType, 'VIDEO');
            assert.equal((await post('/api/v1/groups/group/uploads', 'member', 'movie.mp4', 'video/mp4')).status, 400);
            assert.equal((await post('/api/v1/admin/uploads', 'master', 'movie.mp4', 'video/mp4')).status, 400);
            response = await post('/api/v1/admin/uploads', 'master', 'photo.png', 'image/png');
            assert.equal(response.status, 201);
            assert.equal((await response.json()).mediaType, 'IMAGE');
            response = await post('/api/v1/groups/group/uploads', 'member', 'photo.jpg', 'image/jpeg');
            assert.equal(response.status, 201);
            assert.equal((await response.json()).mediaType, 'IMAGE');
            allowVideo = true;
            response = await post('/api/v1/groups/group/uploads', 'member', 'movie.mp4', 'video/mp4');
            assert.equal(response.status, 201);
            assert.equal((await response.json()).mediaType, 'VIDEO');
            response = await post('/api/v1/admin/uploads/attachments', 'master', 'file.docx', storage.UPLOAD_TYPES.docx);
            assert.equal(response.status, 201);
            assert.equal((await response.json()).mediaType, 'FILE');
            assert.equal((await post('/api/v1/admin/uploads/attachments', 'master', 'bad.svg', 'image/svg+xml')).status, 400);
            failure = Object.assign(new Error('secret credential detail'), { code: 403 });
            response = await post('/api/v1/admin/uploads/attachments', 'master', 'file.txt', 'text/plain');
            assert.equal(response.status, 503);
            assert.ok(!(await response.text()).includes('secret credential'));
            response = await request(legacy.url);
            assert.equal(response.status, 503);
            assert.equal(response.headers.get('cache-control'), 'no-store');
            assert.ok(!(await response.text()).includes('secret credential'));
            failure = undefined;
        });
    } finally {
        if (app) await app.close();
        Storage.prototype.bucket = originalBucket;
        for (const key of Object.keys(process.env)) if (!(key in oldEnv)) delete process.env[key];
        Object.assign(process.env, oldEnv);
        await rm(directory, { recursive: true, force: true });
    }
});