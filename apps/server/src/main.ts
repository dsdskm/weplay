import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppExceptionFilter } from './common/app-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://localhost:3001').split(','),
    credentials: true,
  });
  app.useGlobalFilters(new AppExceptionFilter());
  const port = Number(process.env.PORT ?? process.env.SERVER_PORT ?? 4000);
  await app.listen(port);
  console.log(`WePlay server listening on :${port}`);
}
bootstrap();
