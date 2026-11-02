import { Module } from '@nestjs/common';
import { FeaturesModule } from '../features/features.module';
import { BoardController } from './board.controller';
import { BoardService } from './board.service';

@Module({ imports: [FeaturesModule], controllers: [BoardController], providers: [BoardService] })
export class BoardModule {}
