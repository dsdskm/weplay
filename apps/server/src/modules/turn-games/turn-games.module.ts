import { Module } from '@nestjs/common';
import { FeaturesModule } from '../features/features.module';
import { PointsBadgeModule } from '../points-badge/points-badge.module';
import { TurnGamesController } from './turn-games.controller';
import { TurnGamesService } from './turn-games.service';

@Module({ imports: [FeaturesModule, PointsBadgeModule], controllers: [TurnGamesController], providers: [TurnGamesService] })
export class TurnGamesModule {}
