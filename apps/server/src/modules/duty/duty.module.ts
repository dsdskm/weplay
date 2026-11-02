import { Module } from '@nestjs/common';
import { FeaturesModule } from '../features/features.module';
import { PointsBadgeModule } from '../points-badge/points-badge.module';
import { DutyController } from './duty.controller';
import { DutyService } from './duty.service';

@Module({ imports: [FeaturesModule, PointsBadgeModule], controllers: [DutyController], providers: [DutyService] })
export class DutyModule {}
