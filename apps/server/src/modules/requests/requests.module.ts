import { Module } from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import { RequestsService } from './requests.service';

@Module({ providers: [RequestsService, MembershipsService], exports: [RequestsService, MembershipsService] })
export class RequestsModule {}
