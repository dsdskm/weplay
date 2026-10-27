import { Module } from '@nestjs/common';
import { RequestsModule } from '../requests/requests.module';
import { MeController } from './me.controller';

@Module({ imports: [RequestsModule], controllers: [MeController] })
export class MeModule {}
