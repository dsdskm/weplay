import { Module } from '@nestjs/common';
import { FeaturesModule } from '../features/features.module';
import { EmployeeOfTheMonthController } from './employee-of-the-month.controller';
import { EmployeeOfTheMonthService } from './employee-of-the-month.service';

@Module({
  imports: [FeaturesModule],
  controllers: [EmployeeOfTheMonthController],
  providers: [EmployeeOfTheMonthService],
})
export class EmployeeOfTheMonthModule {}
