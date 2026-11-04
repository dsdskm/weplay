import { Module } from '@nestjs/common';
import { RequestsModule } from '../requests/requests.module';
import { AdminGroupsController } from './admin-groups.controller';
import { AdminRequestsController } from './admin-requests.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminStorageController } from './admin-storage.controller';
import { AdminApiTestController } from './admin-api-test.controller';

@Module({
  imports: [RequestsModule],
  controllers: [AdminUsersController, AdminGroupsController, AdminRequestsController, AdminStorageController, AdminApiTestController],
})
export class AdminModule {}
