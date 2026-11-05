import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { RequestMethod } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { AppExceptionFilter } from './common/app-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // CORS 를 먼저 등록해야 업로드 파일(그림판에 불러오는 이미지 등)에도 헤더가 붙음
  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://localhost:3001,http://localhost:3002').split(','),
    credentials: true,
  });
  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: 'uploads/:name', method: RequestMethod.GET },
      { path: 'uploads/:name', method: RequestMethod.HEAD },
      { path: 'uploads/terms/:folder/:name', method: RequestMethod.GET },
      { path: 'uploads/terms/:folder/:name', method: RequestMethod.HEAD },
    ]
  });
  app.useGlobalFilters(new AppExceptionFilter());
  const port = Number(process.env.PORT ?? process.env.SERVER_PORT ?? 4000);
  await app.listen(port);
  console.log(`WePlay server listening on :${port}`);
}
bootstrap();
