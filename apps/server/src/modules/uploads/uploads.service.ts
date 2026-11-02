import { HttpStatus, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { ErrorCode } from '@weplay/shared';
import { AppError } from '../../common/app-error';

export interface UploadedFileLike {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const IMAGE_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp' };
const VIDEO_TYPES: Record<string, string> = { 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' };

/** 업로드 저장 폴더 (환경변수 UPLOAD_DIR, 기본 apps/server/uploads) */
export const uploadDir = () => resolve(process.env.UPLOAD_DIR ?? join(process.cwd(), 'uploads'));
export const maxUploadBytes = () => Number(process.env.MAX_UPLOAD_MB ?? 30) * 1024 * 1024;

/** 사진·영상 파일 저장. 파일명은 추측할 수 없는 랜덤 값이고 /uploads/<파일명> 으로 제공 */
@Injectable()
export class UploadsService {
  save(file: UploadedFileLike | undefined, allowVideo = true) {
    if (!file) throw new AppError(ErrorCode.VALIDATION_FAILED, '파일을 선택하세요', HttpStatus.BAD_REQUEST);
    const image = IMAGE_TYPES[file.mimetype];
    const video = allowVideo ? VIDEO_TYPES[file.mimetype] : undefined;
    const ext = image ?? video;
    if (!ext) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, allowVideo ? '사진(JPG·PNG·GIF·WEBP)이나 영상(MP4·WEBM·MOV)만 올릴 수 있어요' : '사진(JPG·PNG·GIF·WEBP)만 올릴 수 있어요', HttpStatus.BAD_REQUEST);
    }
    if (file.size > maxUploadBytes()) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, `파일은 ${Math.round(maxUploadBytes() / 1024 / 1024)}MB 이하만 올릴 수 있어요`, HttpStatus.BAD_REQUEST);
    }
    const dir = uploadDir();
    mkdirSync(dir, { recursive: true });
    const name = `${randomBytes(16).toString('hex')}.${ext}`;
    writeFileSync(join(dir, name), file.buffer);
    return { url: `/uploads/${name}`, mediaType: image ? ('IMAGE' as const) : ('VIDEO' as const) };
  }
}

/** 서버가 만든 파일(AI 생성 그림·변환 결과 등) 저장. 주소 형식은 사용자 업로드와 같음 */
export function saveBuffer(buffer: Buffer, ext: 'png' | 'jpg' | 'webp' | 'mp4' | 'webm') {
  const dir = uploadDir();
  mkdirSync(dir, { recursive: true });
  const name = `${randomBytes(16).toString('hex')}.${ext}`;
  writeFileSync(join(dir, name), buffer);
  return { url: `/uploads/${name}`, mediaType: ext === 'mp4' || ext === 'webm' ? ('VIDEO' as const) : ('IMAGE' as const) };
}
