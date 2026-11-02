import { Module } from '@nestjs/common';
import { AdminSystemNoticesController, NoticesController, SystemNoticesController } from './notices.controller';
import { NoticesService } from './notices.service';

@Module({ controllers: [NoticesController, SystemNoticesController, AdminSystemNoticesController], providers: [NoticesService] })
export class NoticesModule {}
