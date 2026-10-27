import { Module } from '@nestjs/common';
import { RequestsModule } from '../requests/requests.module';
import { JoinController } from './join.controller';

@Module({ imports: [RequestsModule], controllers: [JoinController] })
export class JoinModule {}
