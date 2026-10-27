import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { ErrorCode } from '@weplay/shared';

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse() as any;
      if (body?.error?.code) return res.status(status).json(body);
      const code =
        status === 401 ? ErrorCode.UNAUTHORIZED : status === 403 ? ErrorCode.FORBIDDEN : status === 404 ? ErrorCode.NOT_FOUND : 'HTTP_ERROR';
      return res.status(status).json({ error: { code, message: body?.message ?? exception.message } });
    }
    const meta = (exception as any)?.meta;
    if ((exception as any)?.code === 'P2002' && String(meta?.target).includes('name')) {
      return res.status(409).json({ error: { code: ErrorCode.NAME_TAKEN, message: '이미 사용 중인 이름입니다' } });
    }
    console.error(exception);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: { code: 'INTERNAL', message: '서버 오류' } });
  }
}
