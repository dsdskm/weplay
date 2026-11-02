import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { AppExceptionFilter } from './common/app-exception.filter';
import { uploadDir } from './modules/uploads/uploads.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // CORS 를 먼저 등록해야 업로드 파일(그림판에 불러오는 이미지 등)에도 헤더가 붙음
  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://localhost:3001,http://localhost:3002').split(','),
    credentials: true,
  });
  // 업로드된 사진·영상 제공 (/uploads/<랜덤 파일명>)
  app.useStaticAssets(uploadDir(), { prefix: '/uploads' });
  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new AppExceptionFilter());
  const port = Number(process.env.PORT ?? process.env.SERVER_PORT ?? 4000);
  await app.listen(port);
  console.log(`WePlay server listening on :${port}`);
}
bootstrap();
