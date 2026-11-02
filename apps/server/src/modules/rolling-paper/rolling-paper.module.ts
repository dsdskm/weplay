import { Module } from '@nestjs/common';
import { FeaturesModule } from '../features/features.module';
import { RollingPaperController } from './rolling-paper.controller';
import { RollingPaperService } from './rolling-paper.service';

@Module({ imports: [FeaturesModule], controllers: [RollingPaperController], providers: [RollingPaperService] })
export class RollingPaperModule {}
