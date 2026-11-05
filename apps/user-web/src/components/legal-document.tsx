'use client';

import { useEffect, useState } from 'react';
import { api, assetUrl } from '@/lib/api';

export interface LegalDocument {
    id: string;
    type: string;
    version: number;
    title: string;
    content: string;
    required: boolean;
    effectiveAt: string | null;
    publishedAt: string | null;
    changeSummary: string | null;
    attachment: { url: string; name: string; size: number; mimeType: string; mediaType: string } | null;
}

export function LegalDocumentBody({ document }: { document: LegalDocument }) {
    const previewable = document.attachment && ['application/pdf', 'text/plain', 'text/html'].includes(document.attachment.mimeType);
    return (
        <article className="space-y-4 break-words">
            <h2 className="text-lg font-bold">{document.title} <span className="text-sm font-normal text-slate-500">v{document.version}</span></h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                <span>시행일: {document.effectiveAt ? new Date(document.effectiveAt).toLocaleString('ko-KR') : '미정'}</span>
                <span>게시일: {document.publishedAt ? new Date(document.publishedAt).toLocaleString('ko-KR') : '미정'}</span>
            </div>
            {document.changeSummary && <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm">변경 사항: {document.changeSummary}</p>}
            {document.attachment && <>
                {previewable && <iframe
                    title={`${document.title} 문서 미리보기`}
                    src={assetUrl(`${document.attachment.url}?preview=1`)}
                    sandbox={document.attachment.mimeType === 'application/pdf' ? 'allow-scripts' : ''}
                    className="h-72 w-full rounded-md border border-slate-200 bg-white sm:h-96"
                />}
            </>}
            {document.content && <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{document.content}</div>}
        </article>
    );
}

export function PublicLegalDocument() {
    const [type, setType] = useState('SERVICE');
    const [current, setCurrent] = useState<LegalDocument[]>([]);
    const [history, setHistory] = useState<LegalDocument[]>([]);
    const [selectedId, setSelectedId] = useState('');
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        const sync = () => setType(new URLSearchParams(window.location.search).get('type') === 'PRIVACY' ? 'PRIVACY' : 'SERVICE');
        sync();
        window.addEventListener('popstate', sync);
        return () => window.removeEventListener('popstate', sync);
    }, []);
    useEffect(() => {
        let active = true;
        setLoading(true);
        setFailed(false);
        Promise.all([api<LegalDocument[]>('/terms'), api<LegalDocument[]>(`/terms/${type}/history`)])
            .then(([documents, versions]) => {
                if (!active) return;
                setCurrent(documents);
                setHistory(versions);
                const requested = new URLSearchParams(window.location.search).get('version');
                setSelectedId(versions.find((document) => String(document.version) === requested)?.id ?? documents.find((document) => document.type === type)?.id ?? versions[0]?.id ?? '');
            })
            .catch(() => { if (active) setFailed(true); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [type, attempt]);
    const effective = current.find((document) => document.type === type);
    const versions = [...(effective ? [effective] : []), ...history.filter((document) => document.id !== effective?.id)];
    const selected = versions.find((document) => document.id === selectedId);
    function changeType(next: string) {
        window.history.pushState(null, '', `?type=${next}`);
        setType(next);
    }
    return (
        <section className="mx-auto w-full max-w-3xl space-y-5 px-4 py-8">
            <h1 className="text-2xl font-bold">약관 및 정책</h1>
            <nav aria-label="약관 종류" className="flex flex-wrap gap-4 text-sm">
                {(['SERVICE', 'PRIVACY'] as const).map((value) => <button key={value} type="button" aria-pressed={type === value} onClick={() => changeType(value)} className={type === value ? 'font-bold underline' : 'text-slate-500'}>{value === 'SERVICE' ? '서비스 이용약관' : '개인정보 처리방침'}</button>)}
            </nav>
            {loading ? <p role="status">약관을 불러오는 중입니다.</p> : failed ? <div role="alert"><p>약관을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p><button type="button" className="mt-3 underline" onClick={() => setAttempt((value) => value + 1)}>다시 시도</button></div> : !selected ? <p>게시된 문서가 없습니다.</p> : <>
                <label className="block text-sm">버전 이력<select className="mt-2 block w-full rounded-lg border border-slate-200 bg-white p-2" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>{versions.map((document) => <option key={document.id} value={document.id}>v{document.version}{document.id === effective?.id ? ' (현재 시행)' : document.effectiveAt && new Date(document.effectiveAt).getTime() > Date.now() ? ' (시행 예정)' : ' (이전 버전)'}</option>)}</select></label>
                <LegalDocumentBody document={selected} />
            </>}
        </section>
    );
}