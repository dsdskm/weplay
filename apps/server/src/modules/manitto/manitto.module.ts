import { Module } from '@nestjs/common';
import { FeaturesModule } from '../features/features.module';
import { ManittoController } from './manitto.controller';
import { ManittoService } from './manitto.service';

@Module({
  imports: [FeaturesModule],
  controllers: [ManittoController],
  providers: [ManittoService],
})
export class ManittoModule {}
