const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createRequire, Module } = require('node:module');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const root = resolve(__dirname, '../..');
const webRequire = createRequire(resolve(root, 'apps/system-web/package.json'));
const ts = webRequire('typescript');
const attachment = { url: `/uploads/terms/terms-of-service/${'a'.repeat(32)}.html`, name: 'terms.html', size: 12, mimeType: 'text/html', mediaType: 'FILE' };

function elements(node) {
    if (!node || typeof node !== 'object') return [];
    const children = node.props?.children;
    return [node, ...(Array.isArray(children) ? children : [children]).flatMap(elements)];
}

function fixture() {
    const state = [];
    const requests = [];
    const failures = { upload: false, save: false };
    let cursor = 0;
    const api = {
        api: async (path, init) => {
            requests.push({ operation: 'save', path, body: init?.body });
            if (failures.save) throw new Error('Terms save failed');
            return { id: 'saved' };
        },
        uploadAdminTermsAttachment: async (file, type) => {
            requests.push({ operation: 'upload', file, type });
            if (failures.upload) throw new Error('Upload failed');
            const folder = type === 'PRIVACY' ? 'private-policy' : 'terms-of-service';
            return { ...attachment, url: attachment.url.replace(/terms\/[^/]+\//, `terms/${folder}/`), name: file.name };
        },
        errorMessage: (error) => error.message,
        fromLocalInput: (value) => value || null,
        toLocalInput: (value) => value || '',
    };
    const mocks = {
        react: {
            useState: (initial) => {
                const index = cursor++;
                if (!(index in state)) state[index] = initial;
                return [state[index], (next) => { state[index] = typeof next === 'function' ? next(state[index]) : next; }];
            },
        },
        '@tanstack/react-query': {
            useQueryClient: () => ({ invalidateQueries: async () => { } }),
            useQuery: (options) => options.enabled === false ? {} : { data: { userCount: 0, items: [], total: 0 } },
            useMutation: (options) => ({
                isPending: false,
                mutate: async (input) => {
                    await options.onMutate?.(input);
                    try {
                        const result = await options.mutationFn(input);
                        await options.onSuccess?.(result, input);
                    } catch (error) {
                        await options.onError?.(error);
                    }
                },
            }),
        },
        'lucide-react': Object.fromEntries(['Copy', 'Eye', 'Pencil', 'Plus', 'RefreshCw', 'Send', 'Trash2', 'Upload', 'X'].map((name) => [name, `icon-${name}`])),
        '@/components/attachments': { AttachmentList: 'attachments' },
        '@/components/ui': Object.fromEntries(['Badge', 'Button', 'Card', 'Empty', 'ErrorText', 'Input'].map((name) => [name, name])),
        '@/components/modal': { Modal: 'Modal' },
        '@/components/confirm-dialog': { useDialog: () => ({ confirm: async () => true }) },
        '@/components/pager': { Pager: 'Pager' },
        '@/lib/api': api,
        './terms-delivery': { TermsDelivery: 'TermsDelivery' },
    };
    mocks['@/components/ui'].cn = (...values) => values.filter(Boolean).join(' ');
    const file = resolve(root, 'apps/system-web/src/app/(console)/terms/page.tsx');
    const compiled = new Module(file, module);
    compiled.filename = file;
    compiled.require = (id) => Object.hasOwn(mocks, id) ? mocks[id] : webRequire(id);
    const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), {
        compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
        fileName: file,
    });
    compiled._compile(outputText, file);
    function render() {
        cursor = 0;
        return compiled.exports.default();
    }
    const editor = () => elements(render()).find((element) => element.type === 'Modal' && element.props.open && element.props.title === '새 초안');
    const editorElements = () => elements(editor());
    const select = (file) => editorElements().find((element) => element.type === 'input' && element.props.type === 'file').props.onChange({ currentTarget: { files: file ? [file] : [], value: '' } });
    const save = () => elements(editor().props.footer).find((element) => element.type === 'Button' && element.props.children === '저장').props.onClick();
    function open() {
        elements(render()).find((element) => element.type === 'Button' && elements(element).some((child) => child.type === 'icon-Plus')).props.onClick();
    }
    open();
    return { requests, failures, editor, editorElements, select, save, open };
}

test('selecting, replacing, removing and cancelling files never invokes upload or save APIs', () => {
    const view = fixture();
    view.select(new File(['first'], 'first.html', { type: 'text/html' }));
    view.select(new File(['second'], 'second.pdf', { type: 'application/pdf' }));
    assert.equal(view.requests.length, 0);
    assert.ok(view.editorElements().some((element) => element.props?.role === 'status' && element.props.children.includes('second.pdf')));
    view.editorElements().find((element) => element.props?.title === '첨부 문서 제거').props.onClick();
    assert.ok(!view.editorElements().some((element) => element.props?.role === 'status'));
    view.select(new File(['third'], 'third.txt', { type: 'text/plain' }));
    view.editor().props.onClose();
    assert.equal(view.requests.length, 0);
    view.open();
    assert.ok(!view.editorElements().some((element) => element.props?.role === 'status'));
});

test('save uploads the most recently selected file before saving its metadata', async () => {
    const view = fixture();
    view.select(new File(['old'], 'old.html', { type: 'text/html' }));
    const file = new File(['new'], 'new.html', { type: 'text/html' });
    view.select(file);
    await view.save();
    assert.deepEqual(view.requests.map((request) => request.operation), ['upload', 'save']);
    assert.equal(view.requests[0].file, file);
    assert.equal(view.requests[0].type, 'SERVICE');
    assert.equal(view.requests[1].path, '/admin/terms');
    assert.deepEqual(view.requests[1].body.attachment, { ...attachment, name: 'new.html' });
    assert.ok(!Object.hasOwn(view.requests[1].body, 'title'));
    assert.equal(view.requests[1].body.content, '');
    assert.ok(!Object.hasOwn(view.requests[1].body, 'pendingFile'));
    assert.equal(view.editor(), undefined);
});

test('upload failure retains the file and form without submitting terms', async () => {
    const view = fixture();
    const file = new File(['terms'], 'terms.html', { type: 'text/html' });
    view.select(file);
    view.failures.upload = true;
    await view.save();
    assert.deepEqual(view.requests.map((request) => request.operation), ['upload']);
    assert.ok(view.editor());
    view.failures.upload = false;
    await view.save();
    assert.deepEqual(view.requests.map((request) => request.operation), ['upload', 'upload', 'save']);
    assert.equal(view.requests[1].file, file);
    assert.equal(view.requests[2].body.content, '');
});

test('retrying failed terms persistence reuses uploaded metadata without uploading again', async () => {
    const view = fixture();
    view.select(new File(['terms'], 'terms.html', { type: 'text/html' }));
    view.failures.save = true;
    await view.save();
    assert.ok(view.editor());
    view.failures.save = false;
    await view.save();
    assert.deepEqual(view.requests.map((request) => request.operation), ['upload', 'save', 'save']);
    assert.deepEqual(view.requests[1].body.attachment, view.requests[2].body.attachment);
});

test('invalid file selection and picker dismissal do not call APIs', () => {
    const view = fixture();
    view.select(new File(['script'], 'script.js', { type: 'text/javascript' }));
    view.select(new File([], 'empty.html', { type: 'text/html' }));
    view.select(undefined);
    assert.equal(view.requests.length, 0);
    assert.ok(!view.editorElements().some((element) => element.props?.role === 'status'));
});

test('new terms cannot be saved until an attachment is selected', () => {
    const view = fixture();
    const saveButton = () => elements(view.editor().props.footer).find((element) => element.type === 'Button' && element.props.children === '저장');
    assert.equal(saveButton().props.disabled, true);
    view.select(new File(['terms'], 'terms.pdf', { type: 'application/pdf' }));
    assert.equal(saveButton().props.disabled, false);
    assert.ok(!view.editorElements().some((element) => element.props?.['aria-label'] === '약관 제목'));
    assert.ok(!view.editorElements().some((element) => element.type === 'textarea' && element.props.required));
});

test('privacy documents upload into the private-policy folder', async () => {
    const view = fixture();
    view.editorElements().find((element) => element.type === 'select' && element.props['aria-label'] === '약관 종류').props.onChange({ target: { value: 'PRIVACY' } });
    view.select(new File(['privacy'], 'privacy.html', { type: 'text/html' }));
    await view.save();
    assert.equal(view.requests[0].type, 'PRIVACY');
    assert.match(view.requests[1].body.attachment.url, /^\/uploads\/terms\/private-policy\//);
});