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
import { FeaturesModule } from './modules/features/features.module';
import { EmployeeOfTheMonthModule } from './modules/employee-of-the-month/employee-of-the-month.module';
import { ComplimentCardModule } from './modules/compliment-card/compliment-card.module';
import { PointsBadgeModule } from './modules/points-badge/points-badge.module';
import { ManittoModule } from './modules/manitto/manitto.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { RollingPaperModule } from './modules/rolling-paper/rolling-paper.module';
import { PhotoMissionModule } from './modules/photo-mission/photo-mission.module';
import { DinnerVoteModule } from './modules/dinner-vote/dinner-vote.module';
import { RandomSurveyModule } from './modules/random-survey/random-survey.module';
import { SnackDrawModule } from './modules/snack-draw/snack-draw.module';
import { MiniGamesModule } from './modules/mini-games/mini-games.module';
import { TurnGamesModule } from './modules/turn-games/turn-games.module';
import { AiModule } from './modules/ai/ai.service';
import { DutyModule } from './modules/duty/duty.module';
import { NoticesModule } from './modules/notices/notices.module';
import { SuggestionsModule } from './modules/suggestions/suggestions.module';
import { SupportModule } from './modules/support/support.module';
import { TermsModule } from './modules/terms/terms.module';
import { BoardModule } from './modules/board/board.module';
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
    FeaturesModule,
    EmployeeOfTheMonthModule,
    ComplimentCardModule,
    PointsBadgeModule,
    ManittoModule,
    UploadsModule,
    RollingPaperModule,
    PhotoMissionModule,
    DinnerVoteModule,
    RandomSurveyModule,
    SnackDrawModule,
    MiniGamesModule,
    AiModule,
    TurnGamesModule,
    DutyModule,
    NoticesModule,
    SuggestionsModule,
    SupportModule,
    TermsModule,
    BoardModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
