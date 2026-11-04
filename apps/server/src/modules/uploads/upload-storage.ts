import { Storage } from '@google-cloud/storage';
import { Logger } from '@nestjs/common';
import { createReadStream } from 'fs';
import { mkdir, stat, writeFile } from 'fs/promises';
import { join, resolve } from 'path';
import type { Readable } from 'stream';

export const UPLOAD_TYPES = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp',
    mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
    pdf: 'application/pdf', txt: 'text/plain', html: 'text/html', htm: 'text/html', csv: 'text/csv', zip: 'application/zip',
    doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    hwp: 'application/x-hwp', hwpx: 'application/vnd.hancom.hwpx',
} as const;
export type UploadExtension = keyof typeof UPLOAD_TYPES;
export type MediaType = 'IMAGE' | 'VIDEO' | 'FILE';

export const uploadDir = () => resolve(process.env.UPLOAD_DIR ?? join(process.cwd(), 'uploads'));
export const maxUploadBytes = () => {
    const mb = Number(process.env.MAX_UPLOAD_MB ?? 30);
    return (Number.isFinite(mb) && mb > 0 ? mb : 30) * 1024 * 1024;
};
export const mediaTypeOf = (ext: UploadExtension): MediaType => UPLOAD_TYPES[ext].startsWith('image/') ? 'IMAGE' : UPLOAD_TYPES[ext].startsWith('video/') ? 'VIDEO' : 'FILE';

export function parseUploadName(value: string): { name: string; ext: UploadExtension; mimeType: string; mediaType: MediaType } | null {
    const match = /^([a-f0-9]{32})\.([a-z0-9]{2,4})$/.exec(value);
    if (!match || !Object.hasOwn(UPLOAD_TYPES, match[2])) return null;
    const ext = match[2] as UploadExtension;
    return { name: value, ext, mimeType: UPLOAD_TYPES[ext], mediaType: mediaTypeOf(ext) };
}

export function parseUploadUrl(value: string) {
    return value.startsWith('/uploads/') ? parseUploadName(value.slice('/uploads/'.length)) : null;
}

const log = new Logger('UploadStorage');
let storage: Storage | undefined;
function driver() {
    const value = process.env.STORAGE_DRIVER ?? 'gcs';
    if (value !== 'gcs' && value !== 'local') throw new Error('Unsupported STORAGE_DRIVER');
    return value;
}
function bucket() {
    return (storage ??= new Storage()).bucket(process.env.GCS_BUCKET ?? 'weplay-bucket-op');
}
export function logStorageError(operation: string, error: unknown) {
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'unknown';
    log.error(`Storage ${operation} failed (driver=${process.env.STORAGE_DRIVER ?? 'gcs'}, code=${code.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40)})`);
}
function hasCode(error: unknown, code: string | number) {
    return !!error && typeof error === 'object' && 'code' in error && String(error.code) === String(code);
}
export function isUploadMissing(error: unknown) {
    return hasCode(error, 'ENOENT') || hasCode(error, 404);
}
function checkedName(name: string) {
    const parsed = parseUploadName(name);
    if (!parsed) throw new Error('Invalid upload filename');
    return parsed;
}

export async function writeUpload(name: string, buffer: Buffer) {
    const parsed = checkedName(name);
    if (driver() === 'local') {
        await mkdir(uploadDir(), { recursive: true });
        await writeFile(join(uploadDir(), name), buffer, { flag: 'wx' });
        return;
    }
    await bucket().file(name).save(buffer, {
        resumable: false,
        validation: 'crc32c',
        preconditionOpts: { ifGenerationMatch: 0 },
        metadata: {
            contentType: parsed.mimeType,
            contentDisposition: `${parsed.mediaType === 'FILE' ? 'attachment' : 'inline'}; filename="${name}"`,
            cacheControl: 'private, max-age=3600',
        },
    });
}

export interface UploadSource {
    size: number;
    stream: (range?: { start: number; end: number }) => Readable;
}

async function localSource(name: string): Promise<UploadSource> {
    const path = join(uploadDir(), name);
    const info = await stat(path);
    if (!info.isFile()) throw Object.assign(new Error('Upload not found'), { code: 'ENOENT' });
    return { size: info.size, stream: (range) => createReadStream(path, range) };
}

export async function openUpload(name: string): Promise<UploadSource> {
    checkedName(name);
    if (driver() === 'local') return localSource(name);
    const file = bucket().file(name);
    try {
        const [metadata] = await file.getMetadata();
        const size = Number(metadata.size);
        if (!Number.isSafeInteger(size) || size < 0) throw new Error('Invalid upload size');
        return { size, stream: (range) => file.createReadStream(range) };
    } catch (error) {
        if (!hasCode(error, 404)) throw error;
        return localSource(name);
    }
}

export async function readUploadBuffer(url: string): Promise<Buffer> {
    const parsed = parseUploadUrl(url);
    if (!parsed) throw new Error('Invalid upload URL');
    const source = await openUpload(parsed.name);
    if (source.size > maxUploadBytes()) throw new Error('Upload exceeds buffer read limit');
    const chunks: Buffer[] = [];
    let length = 0;
    for await (const chunk of source.stream()) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        length += buffer.length;
        if (length > maxUploadBytes()) throw new Error('Upload exceeds buffer read limit');
        chunks.push(buffer);
    }
    return Buffer.concat(chunks);
}