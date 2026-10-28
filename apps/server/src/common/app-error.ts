import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@weplay/shared';

export class AppError extends HttpException {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly details?: unknown,
  ) {
    super({ error: { code, message, details } }, status);
  }

  static notFound(message = '찾을 수 없습니다') {
    return new AppError(ErrorCode.NOT_FOUND, message, HttpStatus.NOT_FOUND);
  }
  static forbidden(message = '접근할 수 없습니다') {
    return new AppError(ErrorCode.FORBIDDEN, message, HttpStatus.FORBIDDEN);
  }
}
