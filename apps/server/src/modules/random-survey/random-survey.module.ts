import { Module } from '@nestjs/common';
import { FeaturesModule } from '../features/features.module';
import { RandomSurveyController } from './random-survey.controller';
import { RandomSurveyService } from './random-survey.service';

@Module({ imports: [FeaturesModule], controllers: [RandomSurveyController], providers: [RandomSurveyService] })
export class RandomSurveyModule {}
