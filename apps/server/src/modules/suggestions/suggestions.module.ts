import { Module } from '@nestjs/common';
import { FeaturesModule } from '../features/features.module';
import { PointsBadgeModule } from '../points-badge/points-badge.module';
import { SuggestionsController } from './suggestions.controller';
import { SuggestionsService } from './suggestions.service';

@Module({ imports: [FeaturesModule, PointsBadgeModule], controllers: [SuggestionsController], providers: [SuggestionsService] })
export class SuggestionsModule {}
