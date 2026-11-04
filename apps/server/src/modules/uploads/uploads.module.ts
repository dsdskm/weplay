import { Module } from '@nestjs/common';
import { FeaturesModule } from '../features/features.module';
import { AdminUploadsController, UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { UploadMediaController } from './upload-media.controller';

@Module({ imports: [FeaturesModule], controllers: [UploadsController, AdminUploadsController, UploadMediaController], providers: [UploadsService], exports: [UploadsService] })
export class UploadsModule { }
