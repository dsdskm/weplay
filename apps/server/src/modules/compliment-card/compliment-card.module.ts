import { Module } from '@nestjs/common';
import { FeaturesModule } from '../features/features.module';
import { ComplimentCardController } from './compliment-card.controller';
import { ComplimentCardService } from './compliment-card.service';

@Module({
  imports: [FeaturesModule],
  controllers: [ComplimentCardController],
  providers: [ComplimentCardService],
})
export class ComplimentCardModule {}
