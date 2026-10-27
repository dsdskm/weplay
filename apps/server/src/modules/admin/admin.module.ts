import { Module } from '@nestjs/common';
import { RequestsModule } from '../requests/requests.module';
import { AdminCompaniesController } from './admin-companies.controller';
import { AdminRequestsController } from './admin-requests.controller';
import { AdminUsersController } from './admin-users.controller';

@Module({
  imports: [RequestsModule],
  controllers: [AdminUsersController, AdminCompaniesController, AdminRequestsController],
})
export class AdminModule {}
