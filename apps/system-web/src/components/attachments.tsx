'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { attachmentSchema, MAX_ATTACHMENTS, MAX_ATTACHMENT_SIZE, readAttachments, type Attachment } from '@weplay/shared';
import { assetUrl, errorMessage } from '@/lib/api';

export function AttachmentList({ attachments }: { attachments: unknown }) {
    const items = readAttachments(attachments);
    if (!items.length) return null;
    return (
        <ul aria-label="첨부 파일" className="min-w-0 space-y-3">
            {items.map((item, index) => (
                <li key={`${item.url}-${index}`} className="min-w-0 space-y-1">
                    {item.mediaType === 'IMAGE' && <img src={assetUrl(item.url)} alt={item.name} loading="lazy" className="max-h-80 max-w-full rounded-lg object-contain" />}
                    {item.mediaType === 'VIDEO' && <video src={assetUrl(item.url)} aria-label={item.name} controls preload="metadata" className="max-h-80 w-full rounded-lg" />}
                    <a href={assetUrl(item.url)} download={item.name} target="_blank" rel="noopener noreferrer" className="block break-all text-sm text-brand-700 underline">
                        {item.name} ({Math.max(1, Math.ceil(item.size / 1024))} KB)
                    </a>
                </li>
            ))}
        </ul>
    );
}

interface PickerProps {
    value: Attachment[];
    onChange: (value: Attachment[]) => void;
    upload: (file: File) => Promise<Attachment>;
    onUploadingChange: (uploading: boolean) => void;
    disabled?: boolean;
}

export function AttachmentPicker({ value, onChange, upload, onUploadingChange, disabled = false }: PickerProps) {
    const inputId = useId();
    const errorId = useId();
    const active = useRef(true);
    const locked = useRef(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => {
        active.current = true;
        return () => { active.current = false; };
    }, []);

    const select = async (files: File[]) => {
        if (locked.current || disabled || !files.length) return;
        setError('');
        if (value.length + files.length > MAX_ATTACHMENTS) {
            setError('첨부 파일은 최대 5개까지 올릴 수 있어요');
            return;
        }
        if (files.some((file) => file.size <= 0 || file.size > MAX_ATTACHMENT_SIZE)) {
            setError('파일 크기가 허용 범위를 벗어났어요');
            return;
        }
        locked.current = true;
        setUploading(true);
        onUploadingChange(true);
        const next = [...value];
        try {
            for (const file of files) {
                const attachment = attachmentSchema.parse(await upload(file));
                if (!active.current) return;
                next.push(attachment);
                onChange([...next]);
            }
        } catch (reason) {
            if (active.current) setError(errorMessage(reason));
        } finally {
            locked.current = false;
            if (active.current) {
                setUploading(false);
                onUploadingChange(false);
            }
        }
    };

    return (
        <fieldset disabled={disabled || uploading} className="min-w-0 space-y-2">
            <legend className="text-sm font-semibold">첨부 파일 ({value.length}/{MAX_ATTACHMENTS})</legend>
            <label htmlFor={inputId} className="sr-only">첨부 파일 선택</label>
            <input id={inputId} type="file" multiple disabled={disabled || uploading || value.length >= MAX_ATTACHMENTS} aria-describedby={error ? errorId : undefined} className="block w-full min-w-0 text-sm" onChange={(event) => {
                const files = Array.from(event.currentTarget.files ?? []);
                event.currentTarget.value = '';
                void select(files);
            }} />
            {uploading && <p role="status" className="text-sm text-slate-500">업로드 중...</p>}
            {error && <p id={errorId} role="alert" className="text-sm text-rose-600">{error}</p>}
            <AttachmentList attachments={value} />
            {value.map((item, index) => <button key={`${item.url}-${index}`} type="button" title={`${item.name} 첨부 제거`} aria-label={`${item.name} 첨부 제거`} className="mr-2 max-w-full break-all text-sm text-rose-600 underline" onClick={() => onChange(value.filter((_, position) => position !== index))}>{item.name} 제거</button>)}
        </fieldset>
    );
}