import { HttpStatus, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { ErrorCode } from '@weplay/shared';
import { AppError } from '../../common/app-error';
import { logStorageError, maxUploadBytes, mediaTypeOf, UPLOAD_TYPES, UploadExtension, writeUpload } from './upload-storage';

export { maxUploadBytes, uploadDir, readUploadBuffer, parseUploadUrl } from './upload-storage';

export interface UploadedFileLike {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const MIME_ALIASES: Partial<Record<UploadExtension, string[]>> = {
  zip: ['application/x-zip-compressed'],
  csv: ['application/vnd.ms-excel', 'text/plain'],
  hwp: ['application/haansofthwp', 'application/vnd.hancom.hwp', 'application/octet-stream'],
  hwpx: ['application/hwp+zip', 'application/haansofthwpx', 'application/octet-stream', 'application/zip'],
};

export function sanitizeUploadName(value: string) {
  return value.split(/[\\/]/).pop()!.replace(/[\x00-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]/g, '').trim().slice(0, 180) || 'attachment';
}

function bad(message: string) {
  return new AppError(ErrorCode.VALIDATION_FAILED, message, HttpStatus.BAD_REQUEST);
}

export function validateUpload(file: UploadedFileLike | undefined, attachments = false, allowVideo = true, allowHtml = false) {
  if (!file) throw bad('파일을 선택하세요');
  const name = sanitizeUploadName(file.originalname);
  const extension = name.split('.').pop()?.toLowerCase() ?? '';
  if (!Object.hasOwn(UPLOAD_TYPES, extension)) throw bad('지원하지 않는 파일 형식이에요');
  const ext = extension as UploadExtension;
  if ((ext === 'html' || ext === 'htm') && !allowHtml) throw bad('HTML 문서는 관리자만 업로드할 수 있어요');
  const mediaType = mediaTypeOf(ext);
  const mimeType = UPLOAD_TYPES[ext];
  const suppliedMime = file.mimetype.toLowerCase();
  if (suppliedMime !== mimeType && !MIME_ALIASES[ext]?.includes(suppliedMime)) throw bad('파일 확장자와 형식이 일치하지 않아요');
  if ((!attachments && mediaType === 'FILE') || (!allowVideo && mediaType === 'VIDEO')) throw bad('허용되지 않는 파일 형식이에요');
  if (!Number.isSafeInteger(file.size) || file.size <= 0 || file.size !== file.buffer.length || file.size > maxUploadBytes()) {
    throw bad(`빈 파일은 올릴 수 없으며 파일은 ${Math.round(maxUploadBytes() / 1024 / 1024)}MB 이하만 올릴 수 있어요`);
  }
  return { name, ext: ext === 'jpeg' ? 'jpg' as const : ext, mimeType, mediaType };
}

async function persist(buffer: Buffer, ext: UploadExtension) {
  const name = `${randomBytes(16).toString('hex')}.${ext}`;
  try {
    await writeUpload(name, buffer);
  } catch (error) {
    logStorageError('write', error);
    throw new AppError(ErrorCode.VALIDATION_FAILED, '파일 저장에 실패했어요. 잠시 후 다시 시도하고, 계속되면 관리자에게 저장소 설정과 권한 확인을 요청해 주세요.', HttpStatus.SERVICE_UNAVAILABLE);
  }
  return { url: `/uploads/${name}`, mediaType: mediaTypeOf(ext) };
}

@Injectable()
export class UploadsService {
  async save(file: UploadedFileLike | undefined, allowVideo = true) {
    const validated = validateUpload(file, false, allowVideo);
    return { ...await persist(file!.buffer, validated.ext), name: validated.name, size: file!.size, mimeType: validated.mimeType };
  }

  async saveAttachment(file: UploadedFileLike | undefined, allowHtml = false) {
    const validated = validateUpload(file, true, true, allowHtml);
    return { ...await persist(file!.buffer, validated.ext), name: validated.name, size: file!.size, mimeType: validated.mimeType };
  }
}

export async function saveBuffer(buffer: Buffer, ext: 'png' | 'jpg' | 'webp' | 'mp4' | 'webm') {
  if (!buffer.length || buffer.length > maxUploadBytes()) throw bad('생성된 파일이 비어 있거나 크기 제한을 초과했어요');
  return persist(buffer, ext);
}
