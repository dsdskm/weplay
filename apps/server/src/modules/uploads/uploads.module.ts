import { Module } from '@nestjs/common';
import { FeaturesModule } from '../features/features.module';
import { AdminUploadsController, UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({ imports: [FeaturesModule], controllers: [UploadsController, AdminUploadsController], providers: [UploadsService], exports: [UploadsService] })
export class UploadsModule {}
