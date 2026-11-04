const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function load(relativePath, globals = {}) {
    const filename = path.resolve(__dirname, relativePath);
    const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
    const exports = {};
    vm.runInNewContext(compiled.outputText, {
        exports, process: { env: {} }, require: (name) => {
            if (name === '@weplay/shared') return { attachmentSchema: { safeParse: (data) => ({ success: true, data }) } };
            throw new Error(`Unexpected dependency: ${name}`);
        }, ...globals
    }, { filename });
    return exports;
}

const consent = load('../src/lib/legal-consent.ts');
const documents = [{ id: 'service-v2', required: true }, { id: 'privacy-v3', required: true }, { id: 'marketing-v1', required: false }];

test('all current required documents must be accepted; marketing remains optional', () => {
    assert.equal(consent.hasRequiredConsent(documents, { 'service-v2': true }), false);
    assert.equal(consent.hasRequiredConsent(documents, { 'service-v2': true, 'privacy-v3': true }), true);
    assert.equal(consent.hasRequiredConsent(documents, { 'marketing-v1': true }), false);
});

test('payload contains exact selected current IDs and excludes stale IDs', () => {
    const checked = { 'service-v1': true, 'service-v2': true, 'privacy-v3': true };
    assert.deepEqual(Array.from(consent.selectedTermsIds(documents, checked)), ['service-v2', 'privacy-v3']);
    assert.deepEqual(Array.from(consent.selectedTermsIds(documents, { ...checked, 'marketing-v1': true })), ['service-v2', 'privacy-v3', 'marketing-v1']);
    assert.equal(consent.hasRequiredConsent([{ id: 'service-v3', required: true }], checked), false);
});

test('an optional-only or empty set never requires optional acceptance', () => {
    assert.equal(consent.hasRequiredConsent([], {}), true);
    assert.equal(consent.hasRequiredConsent(documents.filter((document) => !document.required), {}), true);
});

test('terms-required API and upload errors signal reconsent without clearing login', async () => {
    const events = [];
    const storage = new Map();
    const api = load('../src/lib/api.ts', {
        Event, FormData, window: { dispatchEvent: (event) => events.push(event.type) },
        localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) },
        fetch: async () => ({ ok: false, status: 403, json: async () => ({ error: { code: 'TERMS_AGREEMENT_REQUIRED', message: 'Consent required' } }) }),
    });
    api.tokenStore.set('test-token');
    for (const request of [() => api.api('/groups'), () => api.uploadFile('group', new Blob(['test'])), () => api.uploadAttachment('group', new Blob(['test']))]) {
        await assert.rejects(request, (error) => error.status === 403 && error.code === 'TERMS_AGREEMENT_REQUIRED');
    }
    assert.equal(events.filter((event) => event === api.TERMS_REQUIRED_EVENT).length, 3);
    await assert.rejects(() => api.api('/me/terms/pending'), (error) => error.code === 'TERMS_AGREEMENT_REQUIRED');
    assert.equal(events.filter((event) => event === api.TERMS_REQUIRED_EVENT).length, 3);
    assert.equal(api.tokenStore.get(), 'test-token');
    api.tokenStore.clear();
    assert.equal(api.tokenStore.get(), null);
    assert.equal(events.filter((event) => event === api.AUTH_CHANGED_EVENT).length, 2);
});

test('system public terms rewrite is query-scoped and leaves admin route intact', async () => {
    const config = load('../../system-web/next.config.ts').default;
    const rewrites = await config.rewrites();
    assert.equal(rewrites.beforeFiles.length, 1);
    const rule = rewrites.beforeFiles[0];
    assert.equal(rule.source, '/terms');
    assert.equal(rule.has[0].key, 'type');
    assert.equal(new RegExp(`^${rule.has[0].value}$`).test('SERVICE'), true);
    assert.equal(new RegExp(`^${rule.has[0].value}$`).test('PRIVACY'), true);
    assert.equal(new RegExp(`^${rule.has[0].value}$`).test(''), false);
    assert.equal(rule.destination, '/legal/terms?type=:legalType');
});