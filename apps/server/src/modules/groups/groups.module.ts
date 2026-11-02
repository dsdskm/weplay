import { Module } from '@nestjs/common';
import { PointsBadgeModule } from '../points-badge/points-badge.module';
import { RequestsModule } from '../requests/requests.module';
import { GroupsController } from './groups.controller';

@Module({ imports: [RequestsModule, PointsBadgeModule], controllers: [GroupsController] })
export class GroupsModule {}
