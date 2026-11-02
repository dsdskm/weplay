import { Module } from '@nestjs/common';
import { FeaturesModule } from '../features/features.module';
import { PointsBadgeModule } from '../points-badge/points-badge.module';
import { PhotoMissionController } from './photo-mission.controller';
import { PhotoMissionService } from './photo-mission.service';

@Module({ imports: [FeaturesModule, PointsBadgeModule], controllers: [PhotoMissionController], providers: [PhotoMissionService] })
export class PhotoMissionModule {}
