import assert from 'node:assert/strict';
import { test } from 'node:test';
import { attachmentInputSchema, attachmentSchema, attachmentSizeLimit, attachmentsSchema, createAttachmentInputSchema, MAX_ATTACHMENT_SIZE, readAttachments } from '../src/attachments';

const file = { url: `/uploads/${'a'.repeat(32)}.pdf`, name: 'report.pdf', size: 12, mimeType: 'application/pdf', mediaType: 'FILE' as const };

test('attachments accept uploaded documents and strip unrelated upload fields', () => {
    assert.deepEqual(attachmentSchema.parse({ ...file, buffer: 'raw', remoteUrl: 'https://example.com' }), file);
    assert.equal(attachmentSchema.safeParse({ ...file, url: `/uploads/${'b'.repeat(32)}.png`, mimeType: 'image/png', mediaType: 'IMAGE' }).success, true);
    assert.equal(attachmentSchema.safeParse({ ...file, url: `/uploads/${'b'.repeat(32)}.mp4`, mimeType: 'video/mp4', mediaType: 'VIDEO' }).success, true);
    for (const extension of ['html', 'htm']) {
        const document = { ...file, url: `/uploads/${'b'.repeat(32)}.${extension}`, mimeType: 'text/html' };
        assert.equal(attachmentSchema.safeParse(document).success, true);
        assert.equal(attachmentSchema.safeParse({ ...document, mimeType: 'text/plain' }).success, false);
    }
});

test('attachment inputs preserve omitted updates and explicit clearing', () => {
    assert.deepEqual(attachmentInputSchema.parse({}), {});
    assert.deepEqual(attachmentInputSchema.parse({ attachments: [] }), { attachments: [] });
    assert.deepEqual(attachmentInputSchema.parse({ attachments: [file] }), { attachments: [file] });
});

test('unsafe URLs, invalid metadata and excessive counts are rejected', () => {
    for (const url of ['https://example.com/a.pdf', '//example.com/a.pdf', '/uploads/../a.pdf', `${file.url}?x=1`, `${file.url}/x`, `/uploads/${'a'.repeat(32)}.svg`]) {
        assert.equal(attachmentSchema.safeParse({ ...file, url }).success, false, url);
    }
    for (const size of [0, -1, 1.5, MAX_ATTACHMENT_SIZE + 1]) assert.equal(attachmentSchema.safeParse({ ...file, size }).success, false);
    assert.equal(attachmentSchema.safeParse({ ...file, name: 'a'.repeat(256) }).success, false);
    assert.equal(attachmentSchema.safeParse({ ...file, mediaType: 'IMAGE' }).success, false);
    assert.equal(attachmentsSchema.safeParse(Array(6).fill(file)).success, false);
});

test('legacy and malformed attachment display is safe', () => {
    for (const value of [undefined, null, {}, 'bad']) assert.deepEqual(readAttachments(value), []);
    assert.deepEqual(readAttachments([file, { ...file, url: 'https://example.com' }]), [file]);
});

test('persistence size bounds follow configurable upload limits', () => {
    assert.equal(attachmentSizeLimit(), 30 * 1024 * 1024);
    assert.equal(attachmentSizeLimit('invalid'), 30 * 1024 * 1024);
    assert.equal(attachmentSizeLimit(-1), 30 * 1024 * 1024);
    assert.equal(attachmentSizeLimit(100), 100 * 1024 * 1024);
    const schema = createAttachmentInputSchema(attachmentSizeLimit(1));
    assert.equal(schema.safeParse({ attachments: [{ ...file, size: 1024 * 1024 }] }).success, true);
    assert.equal(schema.safeParse({ attachments: [{ ...file, size: 1024 * 1024 + 1 }] }).success, false);
    assert.equal(createAttachmentInputSchema(attachmentSizeLimit(100)).safeParse({ attachments: [{ ...file, size: 40 * 1024 * 1024 }] }).success, true);
    for (const name of ['../report.pdf', 'report\u0000.pdf', 'report\u202e.pdf']) assert.equal(attachmentSchema.safeParse({ ...file, name }).success, false);
});