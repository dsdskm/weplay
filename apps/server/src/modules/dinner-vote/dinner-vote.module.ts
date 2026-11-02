import { Module } from '@nestjs/common';
import { FeaturesModule } from '../features/features.module';
import { DinnerVoteController } from './dinner-vote.controller';
import { DinnerVoteService } from './dinner-vote.service';

@Module({ imports: [FeaturesModule], controllers: [DinnerVoteController], providers: [DinnerVoteService] })
export class DinnerVoteModule {}
