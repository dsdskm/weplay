import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { CommonModule } from './common/common.module';
import { JwtAuthGuard } from './common/jwt-auth.guard';
import { AuthModule } from './modules/auth/auth.module';
import { MeModule } from './modules/me/me.module';
import { JoinModule } from './modules/join/join.module';
import { RequestsModule } from './modules/requests/requests.module';
import { GroupsModule } from './modules/groups/groups.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET ?? 'dev-secret',
      signOptions: { expiresIn: (process.env.JWT_TTL ?? '7d') as any },
    }),
    CommonModule,
    AuthModule,
    MeModule,
    JoinModule,
    RequestsModule,
    GroupsModule,
    AdminModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
