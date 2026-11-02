import { Module } from '@nestjs/common';
import { FeaturesModule } from '../features/features.module';
import { PointsBadgeModule } from '../points-badge/points-badge.module';
import { BingoService } from './bingo.service';
import { MiniGamesController } from './mini-games.controller';
import { MiniGamesService } from './mini-games.service';
import { SocialGamesController } from './social-games.controller';
import { SocialGamesService } from './social-games.service';

@Module({
  imports: [FeaturesModule, PointsBadgeModule],
  controllers: [MiniGamesController, SocialGamesController],
  providers: [MiniGamesService, BingoService, SocialGamesService],
})
export class MiniGamesModule {}
