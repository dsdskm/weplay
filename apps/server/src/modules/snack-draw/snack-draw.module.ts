import { Module } from '@nestjs/common';
import { FeaturesModule } from '../features/features.module';
import { PointsBadgeModule } from '../points-badge/points-badge.module';
import { SnackDrawController } from './snack-draw.controller';
import { SnackDrawService } from './snack-draw.service';

@Module({ imports: [FeaturesModule, PointsBadgeModule], controllers: [SnackDrawController], providers: [SnackDrawService] })
export class SnackDrawModule {}
