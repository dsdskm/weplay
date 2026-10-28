import { Module } from '@nestjs/common';
import { GroupMembershipsService } from './group-memberships.service';
import { RequestsService } from './requests.service';

@Module({ providers: [RequestsService, GroupMembershipsService], exports: [RequestsService, GroupMembershipsService] })
export class RequestsModule {}
