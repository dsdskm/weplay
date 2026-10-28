import { Module } from '@nestjs/common';
import { RequestsModule } from '../requests/requests.module';
import { GroupsController } from './groups.controller';

@Module({ imports: [RequestsModule], controllers: [GroupsController] })
export class GroupsModule {}
