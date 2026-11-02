import { Module } from '@nestjs/common';
import { FeaturesModule } from '../features/features.module';
import { PointsBadgeController, PointsDefaultsController } from './points-badge.controller';
import { PointsBadgeService } from './points-badge.service';

@Module({
  imports: [FeaturesModule],
  controllers: [PointsBadgeController, PointsDefaultsController],
  providers: [PointsBadgeService],
  exports: [PointsBadgeService],
})
export class PointsBadgeModule {}
