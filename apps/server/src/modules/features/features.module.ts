import { Module } from '@nestjs/common';
import { AdminFeaturesController } from './admin-features.controller';
import { FeatureSettingsService } from './feature-settings.service';
import { FeaturesService } from './features.service';
import { GroupFeaturesController } from './group-features.controller';

@Module({
  controllers: [GroupFeaturesController, AdminFeaturesController],
  providers: [FeaturesService, FeatureSettingsService],
  exports: [FeaturesService, FeatureSettingsService],
})
export class FeaturesModule {}
