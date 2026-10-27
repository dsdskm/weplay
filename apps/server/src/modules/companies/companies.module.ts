import { Module } from '@nestjs/common';
import { RequestsModule } from '../requests/requests.module';
import { CompaniesController } from './companies.controller';

@Module({ imports: [RequestsModule], controllers: [CompaniesController] })
export class CompaniesModule {}
