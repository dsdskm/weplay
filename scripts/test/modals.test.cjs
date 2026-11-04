const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createRequire, Module } = require('node:module');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const root = resolve(__dirname, '../..');
const ts = createRequire(resolve(root, 'package.json'))('typescript');

function elements(node) {
    if (!node || typeof node !== 'object') return [];
    const children = node.props?.children;
    return [node, ...(Array.isArray(children) ? children : [children]).flatMap(elements)];
}

for (const app of ['system-web', 'user-web']) {
    test(`${app}: backdrop does not dismiss modal; close button and Escape still work`, () => {
        const file = resolve(root, 'apps', app, 'src/components/modal.tsx');
        const webRequire = createRequire(resolve(root, 'apps', app, 'package.json'));
        const effects = [];
        const compiled = new Module(file, module);
        compiled.filename = file;
        compiled.require = (id) => {
            if (id === 'react') return { useEffect: (effect) => effects.push(effect) };
            if (id === './ui') return { cn: (...values) => values.filter(Boolean).join(' ') };
            return webRequire(id);
        };
        const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), {
            compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
            fileName: file,
        });
        compiled._compile(outputText, file);
        let closed = 0;
        const tree = compiled.exports.Modal({ open: true, onClose: () => { closed++; }, title: 'Draft', children: 'Unsaved content' });
        assert.equal(tree.props.onClick, undefined);
        assert.equal(tree.props.onMouseDown, undefined);
        assert.equal(tree.props.onPointerDown, undefined);
        assert.equal(closed, 0);
        const button = elements(tree).find((element) => element.type === 'button' && element.props['aria-label'] === '닫기');
        button.props.onClick();
        assert.equal(closed, 1);
        const previousDocument = global.document;
        const listeners = new Map();
        global.document = {
            body: { style: { overflow: 'auto' } },
            addEventListener: (name, callback) => listeners.set(name, callback),
            removeEventListener: (name, callback) => { if (listeners.get(name) === callback) listeners.delete(name); },
        };
        try {
            const cleanup = effects[0]();
            assert.equal(document.body.style.overflow, 'hidden');
            listeners.get('keydown')({ key: 'Enter' });
            assert.equal(closed, 1);
            listeners.get('keydown')({ key: 'Escape' });
            assert.equal(closed, 2);
            cleanup();
            assert.equal(listeners.size, 0);
            assert.equal(document.body.style.overflow, 'auto');
        } finally {
            if (previousDocument === undefined) delete global.document;
            else global.document = previousDocument;
        }
        assert.equal(compiled.exports.Modal({ open: false, onClose: () => { closed++; } }), null);
    });
}