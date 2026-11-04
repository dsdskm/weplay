import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BoardService, commentSchema, createPostSchema, updatePostSchema } from '../src/modules/board/board.service';
import { SuggestionsService, suggestionSchema } from '../src/modules/suggestions/suggestions.service';
import { NoticesService, noticeSchema, systemNoticeSchema } from '../src/modules/notices/notices.service';

const attachment = { url: `/uploads/${'a'.repeat(32)}.pdf`, name: 'report.pdf', size: 12, mimeType: 'application/pdf', mediaType: 'FILE' as const };
const actor = { id: 'author' } as never;
const content = { title: 'Title', body: 'Body' };

test('every content input validates and sanitizes attachment metadata', () => {
    for (const schema of [createPostSchema, updatePostSchema, commentSchema, suggestionSchema, noticeSchema, systemNoticeSchema]) {
        assert.deepEqual(schema.parse({ ...content, attachments: [{ ...attachment, buffer: 'raw' }] }).attachments, [attachment]);
        assert.equal(schema.parse(content).attachments, undefined);
        assert.deepEqual(schema.parse({ ...content, attachments: [] }).attachments, []);
        assert.equal(schema.safeParse({ ...content, attachments: [{ ...attachment, url: 'https://example.com/file.pdf' }] }).success, false);
        assert.equal(schema.safeParse({ ...content, attachments: Array(6).fill(attachment) }).success, false);
    }
});

function fixture() {
    const writes: { model: string; operation: string; data: { attachments?: unknown } }[] = [];
    const row = { id: 'item', groupId: 'group', teamId: null, authorId: 'author', status: 'RECEIVED', ...content };
    const model = (name: string) => ({
        findFirst: async () => ({ ...row }),
        create: async ({ data }: { data: { attachments?: unknown } }) => {
            writes.push({ model: name, operation: 'create', data });
            return { ...row, ...data };
        },
        update: async ({ data }: { data: { attachments?: unknown } }) => {
            writes.push({ model: name, operation: 'update', data });
            return { ...row, ...data };
        },
    });
    const prisma = {
        boardPost: model('BoardPost'), boardComment: model('BoardComment'), suggestion: model('Suggestion'), notice: model('Notice'), systemNotice: model('SystemNotice'),
        noticeRead: { create: async () => ({}) },
        $transaction: async (operation: (transaction: unknown) => Promise<unknown>) => operation(prisma),
    };
    const audit = { log: async () => undefined };
    const features = { assertEnabled: async () => undefined };
    const settings = { get: async () => ({ groupBoardEnabled: true, commentsEnabled: true, maxPostLength: 10000, anonymousAllowed: true }) };
    return {
        writes,
        board: new BoardService(prisma as never, audit as never, features as never, settings as never),
        suggestions: new SuggestionsService(prisma as never, audit as never, features as never, settings as never, {} as never),
        notices: new NoticesService(prisma as never, audit as never),
    };
}

test('all five persistence models receive create, replace, omitted and clear inputs', async () => {
    const { board, suggestions, notices, writes } = fixture();
    const contracts = [
        { model: 'BoardPost', create: (attachments?: typeof attachment[]) => board.create(actor, 'group', true, createPostSchema.parse({ ...content, attachments })), update: (attachments?: typeof attachment[]) => board.update(actor, 'group', true, 'item', updatePostSchema.parse({ ...content, attachments })) },
        { model: 'BoardComment', create: (attachments?: typeof attachment[]) => board.addComment(actor, 'group', true, 'item', commentSchema.parse({ ...content, attachments })), update: (attachments?: typeof attachment[]) => board.updateComment(actor, 'group', 'item', 'comment', commentSchema.parse({ ...content, attachments })) },
        { model: 'Suggestion', create: (attachments?: typeof attachment[]) => suggestions.create(actor, 'group', true, suggestionSchema.parse({ ...content, attachments })), update: (attachments?: typeof attachment[]) => suggestions.update(actor, 'group', true, 'item', suggestionSchema.parse({ ...content, attachments })) },
        { model: 'Notice', create: (attachments?: typeof attachment[]) => notices.create(actor, 'group', true, noticeSchema.parse({ ...content, attachments })), update: (attachments?: typeof attachment[]) => notices.update(actor, 'group', true, 'item', noticeSchema.parse({ ...content, attachments })) },
        { model: 'SystemNotice', create: (attachments?: typeof attachment[]) => notices.createSystem(actor, systemNoticeSchema.parse({ ...content, attachments })), update: (attachments?: typeof attachment[]) => notices.updateSystem(actor, 'item', systemNoticeSchema.parse({ ...content, attachments })) },
    ];
    for (const contract of contracts) {
        await contract.create([attachment]);
        assert.equal(writes.at(-1)?.model, contract.model);
        assert.deepEqual(writes.at(-1)?.data.attachments, [attachment]);
        await contract.create();
        assert.equal(writes.at(-1)?.data.attachments, undefined);
        await contract.update([attachment]);
        assert.deepEqual(writes.at(-1)?.data.attachments, [attachment]);
        await contract.update();
        assert.equal(writes.at(-1)?.data.attachments, undefined);
        await contract.update([]);
        assert.deepEqual(writes.at(-1)?.data.attachments, []);
    }
});