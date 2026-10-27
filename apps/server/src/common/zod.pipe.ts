import { PipeTransform } from '@nestjs/common';
import type { ZodSchema } from 'zod';
import { ErrorCode } from '@weplay/shared';
import { AppError } from './app-error';

export class ZodPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}
  transform(value: unknown): T {
    const r = this.schema.safeParse(value ?? {});
    if (!r.success) throw new AppError(ErrorCode.VALIDATION_FAILED, '입력값이 올바르지 않습니다', 400, r.error.flatten());
    return r.data;
  }
}
